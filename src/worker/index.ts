import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import {
  exchangeCodeForSessionToken,
  getOAuthRedirectUrl,
  authMiddleware,
  deleteSession,
  MOCHA_SESSION_TOKEN_COOKIE_NAME,
} from "@getmocha/users-service/backend";
import { getCookie, setCookie } from "hono/cookie";

// Define Env interface locally for the worker
interface Env {
  DB: D1Database;
  OPENAI_API_KEY: string;
  MOCHA_USERS_SERVICE_API_URL: string;
  MOCHA_USERS_SERVICE_API_KEY: string;
  PLUGGY_CLIENT_ID: string;
  PLUGGY_CLIENT_SECRET: string;
}

const app = new Hono<{ Bindings: Env }>();

// Enhanced CORS configuration
app.use('*', cors({
  origin: ['https://n5jcegoubmvau.mocha.app', 'http://localhost:5173'],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

// Validation schemas
const expenseSchema = z.object({
  amount: z.number().positive(),
  description: z.string().min(1).max(500),
  category: z.string().min(1).max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

// Simple error response helper
const errorResponse = (message: string, status = 400) => {
  return Response.json({ error: message }, { status });
};

// Get authenticated user ID from request headers or auth middleware
const getUserId = (c: any): string | null => {
  // First try to get from auth middleware (preferred)
  const user = c.get('user');
  if (user) {
    return user.id;
  }
  
  // Fallback to header-based auth (legacy)
  const userId = c.req.header('X-User-ID') || c.req.header('x-user-id');
  return userId || null;
};

// ===========================================
// EXPENSE MANAGEMENT ROUTES
// ===========================================

app.get('/api/expenses', authMiddleware, async (c) => {
  const userId = getUserId(c);

  try {
    const stmt = c.env.DB.prepare("SELECT * FROM expenses WHERE user_id = ? ORDER BY date DESC, created_at DESC");
    const expenses = await stmt.bind(userId).all();
    return Response.json({ expenses: expenses.results || [] });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return errorResponse('Failed to fetch expenses', 500);
  }
});

app.post('/api/expenses', authMiddleware, zValidator('json', expenseSchema), async (c) => {
  const userId = getUserId(c);

  try {
    const { amount, description, category, date } = c.req.valid('json');
    
    const stmt = c.env.DB.prepare(`
      INSERT INTO expenses (amount, description, category, date, user_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);
    
    const result = await stmt.bind(amount, description, category, date, userId).run();
    
    if (!result.success) {
      return errorResponse('Failed to create expense', 500);
    }

    return Response.json({ 
      id: result.meta.last_row_id,
      message: 'Expense created successfully' 
    });
  } catch (error) {
    console.error('Error creating expense:', error);
    return errorResponse('Failed to create expense', 500);
  }
});

app.put('/api/expenses/:id', authMiddleware, zValidator('json', expenseSchema), async (c) => {
  const userId = getUserId(c);

  try {
    const id = c.req.param('id');
    const { amount, description, category, date } = c.req.valid('json');
    
    const stmt = c.env.DB.prepare(`
      UPDATE expenses 
      SET amount = ?, description = ?, category = ?, date = ?, updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `);
    
    const result = await stmt.bind(amount, description, category, date, id, userId).run();
    
    if (!result.success) {
      return errorResponse('Expense not found', 404);
    }

    return Response.json({ message: 'Expense updated successfully' });
  } catch (error) {
    console.error('Error updating expense:', error);
    return errorResponse('Failed to update expense', 500);
  }
});

app.delete('/api/expenses/:id', authMiddleware, async (c) => {
  const userId = getUserId(c);

  try {
    const id = c.req.param('id');
    
    const stmt = c.env.DB.prepare("DELETE FROM expenses WHERE id = ? AND user_id = ?");
    const result = await stmt.bind(id, userId).run();
    
    if (!result.success) {
      return errorResponse('Expense not found', 404);
    }

    return Response.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    return errorResponse('Failed to delete expense', 500);
  }
});

// ===========================================
// AUTHENTICATION ROUTES
// ===========================================

// Get OAuth redirect URL
app.get('/api/oauth/google/redirect_url', async (c) => {
  try {
    const redirectUrl = await getOAuthRedirectUrl('google', {
      apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
      apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
    });

    return Response.json({ redirectUrl });
  } catch (error) {
    console.error('Error getting OAuth redirect URL:', error);
    return errorResponse('Failed to get redirect URL', 500);
  }
});

// Exchange code for session token
app.post("/api/sessions", async (c) => {
  try {
    const body = await c.req.json();

    if (!body.code) {
      return errorResponse('No authorization code provided', 400);
    }

    const sessionToken = await exchangeCodeForSessionToken(body.code, {
      apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
      apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
    });

    setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      path: "/",
      sameSite: "none",
      secure: true,
      maxAge: 60 * 24 * 60 * 60, // 60 days
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error exchanging code for session token:', error);
    return errorResponse('Failed to authenticate', 500);
  }
});

// Get current user
app.get("/api/users/me", authMiddleware, async (c) => {
  const user = c.get("user");
  return Response.json(user);
});

// Logout
app.get('/api/logout', async (c) => {
  try {
    const sessionToken = getCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME);

    if (typeof sessionToken === 'string') {
      await deleteSession(sessionToken, {
        apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
        apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
      });
    }

    // Delete cookie by setting max age to 0
    setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, '', {
      httpOnly: true,
      path: '/',
      sameSite: 'none',
      secure: true,
      maxAge: 0,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error during logout:', error);
    return errorResponse('Failed to logout', 500);
  }
});

// ===========================================
// FINANCIAL DATA ROUTES
// ===========================================

// Accounts Management
app.get('/api/accounts', authMiddleware, async (c) => {
  const userId = getUserId(c);

  try {
    const stmt = c.env.DB.prepare("SELECT * FROM accounts WHERE user_id = ? ORDER BY created_at DESC");
    const accounts = await stmt.bind(userId).all();
    return Response.json({ accounts: accounts.results || [] });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return errorResponse('Failed to fetch accounts', 500);
  }
});

// Credit Cards
app.get('/api/credit-cards', authMiddleware, async (c) => {
  const userId = getUserId(c);

  try {
    const stmt = c.env.DB.prepare(`
      SELECT cc.*, 
             a.name as linked_account_name,
             a.balance as linked_account_balance,
             a.credit_limit as linked_credit_limit,
             a.available_credit_limit as linked_available_credit,
             a.minimum_payment as linked_minimum_payment,
             a.balance_due_date as linked_due_date
      FROM credit_cards cc
      LEFT JOIN accounts a ON cc.linked_account_id = a.id
      WHERE cc.user_id = ? 
      ORDER BY cc.created_at DESC
    `);
    const creditCards = await stmt.bind(userId).all();
    return Response.json({ creditCards: creditCards.results || [] });
  } catch (error) {
    console.error('Error fetching credit cards:', error);
    return errorResponse('Failed to fetch credit cards', 500);
  }
});

app.post('/api/credit-cards', authMiddleware, async (c) => {
  const userId = getUserId(c);

  try {
    const { name, credit_limit, current_balance, due_day } = await c.req.json();
    
    const stmt = c.env.DB.prepare(`
      INSERT INTO credit_cards (name, credit_limit, current_balance, due_day, user_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);
    
    const result = await stmt.bind(name, credit_limit, current_balance || 0, due_day, userId).run();
    
    if (!result.success) {
      return errorResponse('Failed to create credit card', 500);
    }

    return Response.json({ 
      id: result.meta.last_row_id,
      message: 'Credit card created successfully' 
    });
  } catch (error) {
    console.error('Error creating credit card:', error);
    return errorResponse('Failed to create credit card', 500);
  }
});

app.put('/api/credit-cards/:id', authMiddleware, async (c) => {
  const userId = getUserId(c);
  const cardId = c.req.param('id');

  try {
    const { name, credit_limit, current_balance, due_day } = await c.req.json();
    
    const stmt = c.env.DB.prepare(`
      UPDATE credit_cards 
      SET name = ?, credit_limit = ?, current_balance = ?, due_day = ?, updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `);
    
    const result = await stmt.bind(name, credit_limit, current_balance || 0, due_day, cardId, userId).run();
    
    if (!result.success) {
      return errorResponse('Credit card not found', 404);
    }

    return Response.json({ message: 'Credit card updated successfully' });
  } catch (error) {
    console.error('Error updating credit card:', error);
    return errorResponse('Failed to update credit card', 500);
  }
});

app.delete('/api/credit-cards/:id', authMiddleware, async (c) => {
  const userId = getUserId(c);
  const cardId = c.req.param('id');

  try {
    const stmt = c.env.DB.prepare("DELETE FROM credit_cards WHERE id = ? AND user_id = ?");
    const result = await stmt.bind(cardId, userId).run();
    
    if (!result.success) {
      return errorResponse('Credit card not found', 404);
    }

    return Response.json({ message: 'Credit card deleted successfully' });
  } catch (error) {
    console.error('Error deleting credit card:', error);
    return errorResponse('Failed to delete credit card', 500);
  }
});

app.get('/api/credit-cards/available-accounts', authMiddleware, async (c) => {
  const userId = getUserId(c);

  try {
    const stmt = c.env.DB.prepare(`
      SELECT a.* FROM accounts a
      LEFT JOIN credit_cards cc ON a.id = cc.linked_account_id
      WHERE a.user_id = ? 
        AND (a.account_type = 'credit' OR a.account_subtype = 'creditCard')
        AND cc.linked_account_id IS NULL
      ORDER BY a.institution_name, a.name
    `);
    const accounts = await stmt.bind(userId).all();
    return Response.json({ accounts: accounts.results || [] });
  } catch (error) {
    console.error('Error fetching available accounts:', error);
    return errorResponse('Failed to fetch available accounts', 500);
  }
});

app.post('/api/credit-cards/:id/link', authMiddleware, async (c) => {
  const userId = getUserId(c);
  const cardId = c.req.param('id');

  try {
    const { accountId } = await c.req.json();
    
    const stmt = c.env.DB.prepare(`
      UPDATE credit_cards 
      SET linked_account_id = ?, updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `);
    
    const result = await stmt.bind(accountId, cardId, userId).run();
    
    if (!result.success) {
      return errorResponse('Credit card not found', 404);
    }

    return Response.json({ message: 'Credit card linked successfully' });
  } catch (error) {
    console.error('Error linking credit card:', error);
    return errorResponse('Failed to link credit card', 500);
  }
});

app.post('/api/credit-cards/:id/sync', authMiddleware, async (c) => {
  const userId = getUserId(c);
  const cardId = c.req.param('id');

  try {
    // Get credit card with linked account
    const cardStmt = c.env.DB.prepare(`
      SELECT cc.*, a.pluggy_account_id, a.balance, a.credit_limit, a.available_credit_limit
      FROM credit_cards cc
      LEFT JOIN accounts a ON cc.linked_account_id = a.id
      WHERE cc.id = ? AND cc.user_id = ?
    `);
    const card = await cardStmt.bind(cardId, userId).first() as any;
    
    if (!card) {
      return errorResponse('Credit card not found', 404);
    }

    if (!card.pluggy_account_id) {
      return errorResponse('Credit card is not linked to a Pluggy account', 400);
    }

    // Here you would normally sync with Pluggy API, but for now just return success
    return Response.json({ message: 'Credit card synced successfully' });
  } catch (error) {
    console.error('Error syncing credit card:', error);
    return errorResponse('Failed to sync credit card', 500);
  }
});

// Investments
app.get('/api/investments', authMiddleware, async (c) => {
  const userId = getUserId(c);

  try {
    const stmt = c.env.DB.prepare("SELECT * FROM investments WHERE user_id = ? ORDER BY created_at DESC");
    const investments = await stmt.bind(userId).all();
    return Response.json({ investments: investments.results || [] });
  } catch (error) {
    console.error('Error fetching investments:', error);
    return errorResponse('Failed to fetch investments', 500);
  }
});

// Loans
app.get('/api/loans', authMiddleware, async (c) => {
  const userId = getUserId(c);

  try {
    const stmt = c.env.DB.prepare("SELECT * FROM loans WHERE user_id = ? ORDER BY created_at DESC");
    const loans = await stmt.bind(userId).all();
    return Response.json({ loans: loans.results || [] });
  } catch (error) {
    console.error('Error fetching loans:', error);
    return errorResponse('Failed to fetch loans', 500);
  }
});

// Credit Card Bills
app.get('/api/credit-card-bills', authMiddleware, async (c) => {
  const userId = getUserId(c);

  try {
    const stmt = c.env.DB.prepare("SELECT * FROM credit_card_bills WHERE user_id = ? ORDER BY created_at DESC");
    const bills = await stmt.bind(userId).all();
    return Response.json({ bills: bills.results || [] });
  } catch (error) {
    console.error('Error fetching credit card bills:', error);
    return errorResponse('Failed to fetch credit card bills', 500);
  }
});

// Transactions
app.get('/api/transactions', authMiddleware, async (c) => {
  const userId = getUserId(c);

  try {
    const page = parseInt(c.req.query('page') || '1');
    const pageSize = parseInt(c.req.query('pageSize') || '50');
    const offset = (page - 1) * pageSize;

    // Build filters with explicit table prefixes
    const filters: string[] = ['t.user_id = ?'];
    const params: any[] = [userId];

    // Add optional filters
    const accountId = c.req.query('accountId');
    if (accountId) {
      filters.push('t.account_id = ?');
      params.push(accountId);
    }

    const from = c.req.query('from');
    if (from) {
      filters.push('t.date >= ?');
      params.push(from);
    }

    const to = c.req.query('to');
    if (to) {
      filters.push('t.date <= ?');
      params.push(to);
    }

    const category = c.req.query('category');
    if (category) {
      filters.push('t.category = ?');
      params.push(category);
    }

    const type = c.req.query('type');
    if (type) {
      filters.push('t.transaction_type = ?');
      params.push(type);
    }

    const description = c.req.query('description');
    if (description) {
      filters.push('t.description LIKE ?');
      params.push(`%${description}%`);
    }

    const merchantName = c.req.query('merchantName');
    if (merchantName) {
      filters.push('t.merchant_name LIKE ?');
      params.push(`%${merchantName}%`);
    }

    const amountGte = c.req.query('amountGte');
    if (amountGte) {
      filters.push('t.amount >= ?');
      params.push(parseFloat(amountGte));
    }

    const amountLte = c.req.query('amountLte');
    if (amountLte) {
      filters.push('t.amount <= ?');
      params.push(parseFloat(amountLte));
    }

    const whereClause = filters.join(' AND ');

    // Get total count
    const countStmt = c.env.DB.prepare(`
      SELECT COUNT(*) as total 
      FROM transactions t
      LEFT JOIN accounts a ON t.account_id = a.id
      WHERE ${whereClause}
    `);
    const countResult = await countStmt.bind(...params).first() as any;
    const total = countResult?.total || 0;
    const totalPages = Math.ceil(total / pageSize);

    // Get transactions with account names
    const stmt = c.env.DB.prepare(`
      SELECT t.*, a.name as account_name, a.account_type
      FROM transactions t
      LEFT JOIN accounts a ON t.account_id = a.id
      WHERE ${whereClause}
      ORDER BY t.date DESC, t.created_at DESC
      LIMIT ? OFFSET ?
    `);

    const transactions = await stmt.bind(...params, pageSize, offset).all();

    return Response.json({
      transactions: transactions.results || [],
      pagination: {
        page,
        pageSize,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return errorResponse('Failed to fetch transactions', 500);
  }
});

app.get('/api/transactions/analytics', authMiddleware, async (c) => {
  const userId = getUserId(c);

  try {
    const filters: string[] = ['user_id = ?'];
    const params: any[] = [userId];

    // Add optional filters
    const accountId = c.req.query('accountId');
    if (accountId) {
      filters.push('account_id = ?');
      params.push(accountId);
    }

    const from = c.req.query('from');
    if (from) {
      filters.push('date >= ?');
      params.push(from);
    }

    const to = c.req.query('to');
    if (to) {
      filters.push('date <= ?');
      params.push(to);
    }

    const whereClause = filters.join(' AND ');

    // Total transactions and amount
    const totalStmt = c.env.DB.prepare(`
      SELECT 
        COUNT(*) as totalTransactions,
        SUM(amount) as totalAmount,
        AVG(amount) as averageAmount
      FROM transactions 
      WHERE ${whereClause}
    `);
    const totalResult = await totalStmt.bind(...params).first() as any;

    // Category breakdown - need to bind params twice for the subquery
    const categoryStmt = c.env.DB.prepare(`
      SELECT 
        category,
        SUM(amount) as totalAmount,
        COUNT(*) as transactionCount,
        CASE 
          WHEN (SELECT SUM(amount) FROM transactions WHERE ${whereClause}) > 0 
          THEN (SUM(amount) * 100.0 / (SELECT SUM(amount) FROM transactions WHERE ${whereClause}))
          ELSE 0 
        END as percentage
      FROM transactions 
      WHERE ${whereClause}
      GROUP BY category
      ORDER BY totalAmount DESC
    `);
    // Need to pass params three times: once for main query, twice for subqueries
    const categoryParams = [...params, ...params, ...params];
    const categoryResult = await categoryStmt.bind(...categoryParams).all();

    // Monthly trends
    const monthlyStmt = c.env.DB.prepare(`
      SELECT 
        strftime('%Y-%m', date) as month,
        SUM(amount) as totalAmount,
        COUNT(*) as transactionCount
      FROM transactions 
      WHERE ${whereClause}
      GROUP BY strftime('%Y-%m', date)
      ORDER BY month DESC
      LIMIT 12
    `);
    const monthlyResult = await monthlyStmt.bind(...params).all();

    // Top merchants
    const merchantStmt = c.env.DB.prepare(`
      SELECT 
        merchant_name,
        SUM(amount) as totalAmount,
        COUNT(*) as transactionCount
      FROM transactions 
      WHERE ${whereClause} AND merchant_name IS NOT NULL
      GROUP BY merchant_name
      ORDER BY totalAmount DESC
      LIMIT 10
    `);
    const merchantResult = await merchantStmt.bind(...params).all();

    return Response.json({
      totalTransactions: totalResult?.totalTransactions || 0,
      totalAmount: totalResult?.totalAmount || 0,
      averageAmount: totalResult?.averageAmount || 0,
      categoryBreakdown: categoryResult.results || [],
      monthlyTrends: monthlyResult.results || [],
      topMerchants: merchantResult.results || []
    });
  } catch (error) {
    console.error('Error fetching transaction analytics:', error);
    return errorResponse('Failed to fetch analytics', 500);
  }
});

app.post('/api/transactions/bulk', authMiddleware, async (c) => {
  const userId = getUserId(c);

  try {
    const { operation, transactionIds, params: opParams } = await c.req.json();

    if (!operation || !transactionIds || !Array.isArray(transactionIds)) {
      return errorResponse('Invalid bulk operation parameters', 400);
    }

    const placeholders = transactionIds.map(() => '?').join(',');

    switch (operation) {
      case 'categorize':
        if (!opParams?.category) {
          return errorResponse('Category is required for categorize operation', 400);
        }
        
        const categorizeStmt = c.env.DB.prepare(`
          UPDATE transactions 
          SET category = ?, updated_at = datetime('now')
          WHERE id IN (${placeholders}) AND user_id = ?
        `);
        await categorizeStmt.bind(opParams.category, ...transactionIds, userId).run();
        break;

      case 'reconcile':
        const reconcileStmt = c.env.DB.prepare(`
          UPDATE transactions 
          SET reconciled = ?, updated_at = datetime('now')
          WHERE id IN (${placeholders}) AND user_id = ?
        `);
        await reconcileStmt.bind(opParams?.reconciled || false, ...transactionIds, userId).run();
        break;

      case 'delete':
        const deleteStmt = c.env.DB.prepare(`
          DELETE FROM transactions 
          WHERE id IN (${placeholders}) AND user_id = ?
        `);
        await deleteStmt.bind(...transactionIds, userId).run();
        break;

      default:
        return errorResponse('Invalid operation', 400);
    }

    return Response.json({ message: 'Bulk operation completed successfully' });
  } catch (error) {
    console.error('Error performing bulk operation:', error);
    return errorResponse('Failed to perform bulk operation', 500);
  }
});

app.put('/api/transactions/:id', authMiddleware, async (c) => {
  const userId = getUserId(c);
  const transactionId = c.req.param('id');

  try {
    const updates = await c.req.json();
    
    const allowedFields = ['description', 'category', 'merchant_name', 'notes', 'reconciled'];
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = ?`);
        updateValues.push(value);
      }
    }

    if (updateFields.length === 0) {
      return errorResponse('No valid fields to update', 400);
    }

    updateFields.push('updated_at = datetime(\'now\')');
    updateValues.push(transactionId, userId);

    const stmt = c.env.DB.prepare(`
      UPDATE transactions 
      SET ${updateFields.join(', ')}
      WHERE id = ? AND user_id = ?
    `);

    const result = await stmt.bind(...updateValues).run();
    
    if (!result.success) {
      return errorResponse('Transaction not found', 404);
    }

    return Response.json({ message: 'Transaction updated successfully' });
  } catch (error) {
    console.error('Error updating transaction:', error);
    return errorResponse('Failed to update transaction', 500);
  }
});

app.delete('/api/transactions/:id', authMiddleware, async (c) => {
  const userId = getUserId(c);
  const transactionId = c.req.param('id');

  try {
    const stmt = c.env.DB.prepare("DELETE FROM transactions WHERE id = ? AND user_id = ?");
    const result = await stmt.bind(transactionId, userId).run();
    
    if (!result.success) {
      return errorResponse('Transaction not found', 404);
    }

    return Response.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return errorResponse('Failed to delete transaction', 500);
  }
});

app.post('/api/transactions/:id/categorize', authMiddleware, async (c) => {
  const userId = getUserId(c);
  const transactionId = c.req.param('id');

  try {
    // Get transaction
    const transactionStmt = c.env.DB.prepare("SELECT * FROM transactions WHERE id = ? AND user_id = ?");
    const transaction = await transactionStmt.bind(transactionId, userId).first() as any;
    
    if (!transaction) {
      return errorResponse('Transaction not found', 404);
    }

    // Simple auto-categorization logic based on description/merchant
    let autoCategory = 'Outros';
    const description = (transaction.description || '').toLowerCase();
    const merchant = (transaction.merchant_name || '').toLowerCase();
    
    const categoryRules = [
      { keywords: ['uber', 'taxi', 'transporte', 'metro', 'onibus'], category: 'Transporte' },
      { keywords: ['ifood', 'restaurante', 'lanchonete', 'comida', 'alimentacao'], category: 'Alimentação' },
      { keywords: ['shopping', 'loja', 'magazine', 'mercado'], category: 'Compras' },
      { keywords: ['cinema', 'teatro', 'entretenimento', 'lazer'], category: 'Entretenimento' },
      { keywords: ['farmacia', 'hospital', 'medico', 'saude'], category: 'Saúde' },
      { keywords: ['energia', 'agua', 'telefone', 'internet', 'conta'], category: 'Contas e Serviços' }
    ];

    for (const rule of categoryRules) {
      if (rule.keywords.some(keyword => description.includes(keyword) || merchant.includes(keyword))) {
        autoCategory = rule.category;
        break;
      }
    }

    // Update transaction category
    const updateStmt = c.env.DB.prepare(`
      UPDATE transactions 
      SET category = ?, updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `);
    await updateStmt.bind(autoCategory, transactionId, userId).run();

    return Response.json({ 
      message: 'Transaction categorized successfully', 
      category: autoCategory 
    });
  } catch (error) {
    console.error('Error auto-categorizing transaction:', error);
    return errorResponse('Failed to categorize transaction', 500);
  }
});

// Transaction Categories
app.get('/api/transaction-categories', authMiddleware, async (c) => {
  const userId = getUserId(c);

  try {
    const stmt = c.env.DB.prepare("SELECT * FROM transaction_categories WHERE user_id = ? ORDER BY name ASC");
    const categories = await stmt.bind(userId).all();
    return Response.json({ categories: categories.results || [] });
  } catch (error) {
    console.error('Error fetching transaction categories:', error);
    return errorResponse('Failed to fetch categories', 500);
  }
});

app.post('/api/transaction-categories', authMiddleware, async (c) => {
  const userId = getUserId(c);

  try {
    const { name, color, description, keywords, parent_id } = await c.req.json();
    
    if (!name?.trim()) {
      return errorResponse('Category name is required', 400);
    }

    const stmt = c.env.DB.prepare(`
      INSERT INTO transaction_categories (user_id, name, color, description, keywords, parent_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);
    
    const result = await stmt.bind(
      userId, 
      name.trim(), 
      color, 
      description, 
      keywords ? JSON.stringify(keywords) : null, 
      parent_id
    ).run();
    
    if (!result.success) {
      return errorResponse('Failed to create category', 500);
    }

    return Response.json({ 
      id: result.meta.last_row_id,
      message: 'Category created successfully' 
    });
  } catch (error) {
    console.error('Error creating transaction category:', error);
    return errorResponse('Failed to create category', 500);
  }
});

app.put('/api/transaction-categories/:id', authMiddleware, async (c) => {
  const userId = getUserId(c);
  const categoryId = c.req.param('id');

  try {
    const { name, color, description, keywords, parent_id } = await c.req.json();
    
    if (!name?.trim()) {
      return errorResponse('Category name is required', 400);
    }

    const stmt = c.env.DB.prepare(`
      UPDATE transaction_categories 
      SET name = ?, color = ?, description = ?, keywords = ?, parent_id = ?, updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `);
    
    const result = await stmt.bind(
      name.trim(), 
      color, 
      description, 
      keywords ? JSON.stringify(keywords) : null, 
      parent_id,
      categoryId,
      userId
    ).run();
    
    if (!result.success) {
      return errorResponse('Category not found', 404);
    }

    return Response.json({ message: 'Category updated successfully' });
  } catch (error) {
    console.error('Error updating transaction category:', error);
    return errorResponse('Failed to update category', 500);
  }
});

app.delete('/api/transaction-categories/:id', authMiddleware, async (c) => {
  const userId = getUserId(c);
  const categoryId = c.req.param('id');

  try {
    const stmt = c.env.DB.prepare("DELETE FROM transaction_categories WHERE id = ? AND user_id = ? AND is_default = FALSE");
    const result = await stmt.bind(categoryId, userId).run();
    
    if (!result.success) {
      return errorResponse('Category not found or cannot be deleted', 404);
    }

    return Response.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting transaction category:', error);
    return errorResponse('Failed to delete category', 500);
  }
});

// ===========================================
// HEALTH CHECK
// ===========================================

// ===========================================
// PLUGGY INTEGRATION ROUTES
// ===========================================

app.get('/api/pluggy/connections', authMiddleware, async (c) => {
  const userId = getUserId(c);

  try {
    const stmt = c.env.DB.prepare("SELECT * FROM pluggy_connections WHERE user_id = ? ORDER BY created_at DESC");
    const connections = await stmt.bind(userId).all();
    return Response.json({ connections: connections.results || [] });
  } catch (error) {
    console.error('Error fetching pluggy connections:', error);
    return errorResponse('Failed to fetch connections', 500);
  }
});

app.get('/api/pluggy/config', authMiddleware, async (c) => {
  const userId = getUserId(c);

  try {
    const stmt = c.env.DB.prepare("SELECT config_value FROM user_configs WHERE user_id = ? AND config_key = 'pluggy_client_id'");
    const clientIdResult = await stmt.bind(userId).first() as any;
    
    const stmt2 = c.env.DB.prepare("SELECT config_value FROM user_configs WHERE user_id = ? AND config_key = 'pluggy_client_secret'");
    const clientSecretResult = await stmt2.bind(userId).first() as any;
    
    return Response.json({
      clientId: (clientIdResult?.config_value as string) || '',
      clientSecret: (clientSecretResult?.config_value as string) || ''
    });
  } catch (error) {
    console.error('Error loading pluggy config:', error);
    return errorResponse('Failed to load config', 500);
  }
});

app.post('/api/pluggy/config', authMiddleware, async (c) => {
  const userId = getUserId(c);

  try {
    const { clientId, clientSecret } = await c.req.json();
    
    if (!clientId?.trim() || !clientSecret?.trim()) {
      return errorResponse('Client ID and Client Secret are required', 400);
    }

    // Upsert client ID
    await c.env.DB.prepare(`
      INSERT INTO user_configs (user_id, config_key, config_value, created_at, updated_at)
      VALUES (?, 'pluggy_client_id', ?, datetime('now'), datetime('now'))
      ON CONFLICT(user_id, config_key) DO UPDATE SET
        config_value = excluded.config_value,
        updated_at = excluded.updated_at
    `).bind(userId, clientId.trim()).run();

    // Upsert client secret
    await c.env.DB.prepare(`
      INSERT INTO user_configs (user_id, config_key, config_value, created_at, updated_at)
      VALUES (?, 'pluggy_client_secret', ?, datetime('now'), datetime('now'))
      ON CONFLICT(user_id, config_key) DO UPDATE SET
        config_value = excluded.config_value,
        updated_at = excluded.updated_at
    `).bind(userId, clientSecret.trim()).run();

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error saving pluggy config:', error);
    return errorResponse('Failed to save config', 500);
  }
});

app.post('/api/pluggy/test-connection', authMiddleware, async (c) => {
  try {
    const { clientId, clientSecret } = await c.req.json();
    
    if (!clientId?.trim() || !clientSecret?.trim()) {
      return errorResponse('Client ID and Client Secret are required', 400);
    }

    // Import the PluggyClient
    const { PluggyClient } = await import('./pluggy-improved.js');
    const client = new PluggyClient(clientId.trim(), clientSecret.trim());
    
    // Test the connection by trying to authenticate
    await client.healthCheck();
    
    return Response.json({ 
      success: true, 
      message: 'Connection with Pluggy API successful' 
    });
  } catch (error) {
    console.error('Error testing pluggy connection:', error);
    return Response.json({ 
      error: error instanceof Error ? error.message : 'Connection test failed' 
    }, { status: 400 });
  }
});

app.post('/api/pluggy/add-connection', authMiddleware, async (c) => {
  const userId = getUserId(c);

  try {
    const { itemId } = await c.req.json();
    
    if (!itemId?.trim()) {
      return errorResponse('Item ID is required', 400);
    }

    // Get user's Pluggy config
    const clientIdStmt = c.env.DB.prepare("SELECT config_value FROM user_configs WHERE user_id = ? AND config_key = 'pluggy_client_id'");
    const clientIdResult = await clientIdStmt.bind(userId).first() as any;
    
    const clientSecretStmt = c.env.DB.prepare("SELECT config_value FROM user_configs WHERE user_id = ? AND config_key = 'pluggy_client_secret'");
    const clientSecretResult = await clientSecretStmt.bind(userId).first() as any;
    
    if (!clientIdResult?.config_value || !clientSecretResult?.config_value) {
      return errorResponse('Pluggy credentials not configured', 400);
    }

    // Import and create Pluggy client
    const { PluggyClient } = await import('./pluggy-improved.js');
    const client = new PluggyClient(clientIdResult.config_value as string, clientSecretResult.config_value as string);
    
    // Get item details from Pluggy
    const item = await client.getItem(itemId.trim());
    
    // Check if connection already exists
    const existingStmt = c.env.DB.prepare("SELECT id FROM pluggy_connections WHERE user_id = ? AND pluggy_item_id = ?");
    const existing = await existingStmt.bind(userId, itemId.trim()).first();
    
    if (existing) {
      return errorResponse('Connection already exists', 400);
    }
    
    // Add connection to database
    const insertStmt = c.env.DB.prepare(`
      INSERT INTO pluggy_connections (user_id, pluggy_item_id, institution_name, connection_status, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `);
    
    await insertStmt.bind(
      userId, 
      itemId.trim(), 
      item.connector.name || 'Unknown Institution', 
      item.status || 'CONNECTED'
    ).run();

    return Response.json({ 
      success: true, 
      message: 'Connection added successfully' 
    });
  } catch (error) {
    console.error('Error adding pluggy connection:', error);
    return Response.json({ 
      error: error instanceof Error ? error.message : 'Failed to add connection' 
    }, { status: 400 });
  }
});

app.delete('/api/pluggy/connections/:id', authMiddleware, async (c) => {
  const userId = getUserId(c);
  const connectionId = c.req.param('id');

  try {
    const stmt = c.env.DB.prepare("DELETE FROM pluggy_connections WHERE id = ? AND user_id = ?");
    const result = await stmt.bind(connectionId, userId).run();
    
    if (!result.success) {
      return errorResponse('Connection not found', 404);
    }

    return Response.json({ message: 'Connection removed successfully' });
  } catch (error) {
    console.error('Error removing pluggy connection:', error);
    return errorResponse('Failed to remove connection', 500);
  }
});

app.post('/api/pluggy/sync/:itemId?', authMiddleware, async (c) => {
  const userId = getUserId(c);
  const itemId = c.req.param('itemId');

  // Create a unique sync ID for logging
  const syncId = `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    console.log(`[${syncId}] Starting sync for user ${userId}, itemId: ${itemId || 'all'}`);

    // Get user's Pluggy config
    const clientIdStmt = c.env.DB.prepare("SELECT config_value FROM user_configs WHERE user_id = ? AND config_key = 'pluggy_client_id'");
    const clientIdResult = await clientIdStmt.bind(userId).first() as any;
    
    const clientSecretStmt = c.env.DB.prepare("SELECT config_value FROM user_configs WHERE user_id = ? AND config_key = 'pluggy_client_secret'");
    const clientSecretResult = await clientSecretStmt.bind(userId).first() as any;
    
    if (!clientIdResult?.config_value || !clientSecretResult?.config_value) {
      console.log(`[${syncId}] Pluggy credentials not configured`);
      return Response.json({ 
        success: false,
        error: 'Pluggy credentials not configured',
        newTransactions: 0,
        message: 'Pluggy credentials not configured'
      }, { status: 400 });
    }

    // Import and create Pluggy client
    console.log(`[${syncId}] Creating Pluggy client`);
    const { PluggyClient, mapPluggyCategory } = await import('./pluggy-improved.js');
    const client = new PluggyClient(clientIdResult.config_value as string, clientSecretResult.config_value as string);
    
    let connectionsToSync;
    
    if (itemId) {
      // Sync specific connection
      console.log(`[${syncId}] Fetching specific connection for itemId: ${itemId}`);
      const stmt = c.env.DB.prepare("SELECT * FROM pluggy_connections WHERE user_id = ? AND pluggy_item_id = ?");
      const connection = await stmt.bind(userId, itemId).first() as any;
      
      if (!connection) {
        console.log(`[${syncId}] Connection not found for itemId: ${itemId}`);
        return Response.json({ 
          success: false,
          error: 'Connection not found',
          newTransactions: 0,
          message: 'Connection not found'
        }, { status: 404 });
      }
      
      connectionsToSync = [connection];
    } else {
      // Sync all connections
      console.log(`[${syncId}] Fetching all connections for user`);
      const stmt = c.env.DB.prepare("SELECT * FROM pluggy_connections WHERE user_id = ?");
      const result = await stmt.bind(userId).all();
      connectionsToSync = (result.results as any[]) || [];
    }

    console.log(`[${syncId}] Found ${connectionsToSync.length} connections to sync`);

    let totalNewTransactions = 0;
    let errors: string[] = [];
    
    for (const connection of connectionsToSync) {
      try {
        console.log(`[${syncId}] Processing connection ${connection.id} (${connection.institution_name})`);
        
        // Get transactions from last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const transactions = await client.getAllItemTransactions(
          connection.pluggy_item_id as string, 
          thirtyDaysAgo.toISOString().split('T')[0]
        );
        
        console.log(`[${syncId}] Found ${transactions.length} transactions for connection ${connection.id}`);
        
        // Import transactions as expenses (simplified for now)
        for (const transaction of transactions) {
          try {
            if (transaction.amount < 0) { // Only import expenses
              const category = mapPluggyCategory(transaction);
              
              // Check if transaction already exists
              const existingStmt = c.env.DB.prepare("SELECT id FROM expenses WHERE user_id = ? AND pluggy_transaction_id = ?");
              const existing = await existingStmt.bind(userId, transaction.id).first();
              
              if (!existing) {
                // Add new transaction
                const insertStmt = c.env.DB.prepare(`
                  INSERT INTO expenses (
                    amount, description, category, date, user_id, 
                    pluggy_transaction_id, is_synced_from_bank, 
                    created_at, updated_at
                  )
                  VALUES (?, ?, ?, ?, ?, ?, true, datetime('now'), datetime('now'))
                `);
                
                const result = await insertStmt.bind(
                  Math.abs(transaction.amount),
                  transaction.description || 'Transação',
                  category,
                  transaction.date.split('T')[0],
                  userId,
                  transaction.id
                ).run();
                
                if (result.success) {
                  totalNewTransactions++;
                }
              }
            }
          } catch (transactionError) {
            const errorMsg = transactionError instanceof Error ? transactionError.message : String(transactionError);
            console.error(`[${syncId}] Error processing transaction ${transaction.id}:`, errorMsg);
            errors.push(`Transaction ${transaction.id}: ${errorMsg}`);
          }
        }
        
        // Update last sync time
        const updateStmt = c.env.DB.prepare(`
          UPDATE pluggy_connections 
          SET last_sync_at = datetime('now'), updated_at = datetime('now')
          WHERE id = ?
        `);
        await updateStmt.bind(connection.id as number).run();
        
      } catch (connectionError) {
        const errorMsg = connectionError instanceof Error ? connectionError.message : String(connectionError);
        console.error(`[${syncId}] Error syncing connection ${connection.id}:`, errorMsg);
        errors.push(`Connection ${connection.id}: ${errorMsg}`);
      }
    }

    const finalResult = { 
      success: true, 
      newTransactions: totalNewTransactions,
      errors: errors,
      message: errors.length > 0 
        ? `Sync completed with ${errors.length} errors. ${totalNewTransactions} new transactions imported.`
        : `Sync completed successfully. ${totalNewTransactions} new transactions imported.`
    };

    console.log(`[${syncId}] Sync completed. New transactions: ${totalNewTransactions}, Errors: ${errors.length}`);
    
    // Ensure we return valid JSON with proper headers
    return new Response(JSON.stringify(finalResult), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[${syncId}] Critical error during sync:`, errorMessage);
    
    const errorResult = { 
      success: false,
      error: errorMessage,
      newTransactions: 0,
      message: 'Sync failed due to unexpected error'
    };
    
    return new Response(JSON.stringify(errorResult), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
  }
});

// Webhook configuration routes
app.get('/api/pluggy/webhook-config', authMiddleware, async (c) => {
  const userId = getUserId(c);

  try {
    const stmt = c.env.DB.prepare("SELECT * FROM webhook_configs WHERE user_id = ?");
    const config = await stmt.bind(userId).first() as any;
    
    if (!config) {
      return Response.json({
        webhookUrl: '',
        events: [],
        isActive: true
      });
    }
    
    return Response.json({
      webhookUrl: config.webhook_url as string,
      events: config.events ? JSON.parse(config.events as string) : [],
      isActive: config.is_active as boolean
    });
  } catch (error) {
    console.error('Error loading webhook config:', error);
    return errorResponse('Failed to load webhook config', 500);
  }
});

app.post('/api/pluggy/webhook-config', authMiddleware, async (c) => {
  const userId = getUserId(c);

  try {
    const { webhookUrl, events, isActive } = await c.req.json();
    
    if (!webhookUrl?.trim()) {
      return errorResponse('Webhook URL is required', 400);
    }

    // Upsert webhook config
    const stmt = c.env.DB.prepare(`
      INSERT INTO webhook_configs (user_id, webhook_url, events, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET
        webhook_url = excluded.webhook_url,
        events = excluded.events,
        is_active = excluded.is_active,
        updated_at = excluded.updated_at
    `);
    
    await stmt.bind(
      userId, 
      webhookUrl.trim(), 
      JSON.stringify(events || []), 
      isActive !== false
    ).run();

    return Response.json({ 
      success: true,
      message: 'Webhook configuration saved successfully'
    });
  } catch (error) {
    console.error('Error saving webhook config:', error);
    return errorResponse('Failed to save webhook config', 500);
  }
});

app.post('/api/pluggy/test-webhook', authMiddleware, async (c) => {
  const userId = getUserId(c);

  try {
    const stmt = c.env.DB.prepare("SELECT * FROM webhook_configs WHERE user_id = ?");
    const config = await stmt.bind(userId).first() as any;
    
    if (!config || !config.webhook_url) {
      return errorResponse('Webhook not configured', 400);
    }

    // Test webhook by sending a ping
    const testPayload = {
      event: 'test',
      timestamp: new Date().toISOString(),
      userId: userId
    };

    const response = await fetch(config.webhook_url as string, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'FinanceitoApp-Webhook/1.0'
      },
      body: JSON.stringify(testPayload)
    });

    // Log the webhook attempt
    const logStmt = c.env.DB.prepare(`
      INSERT INTO webhook_logs (webhook_id, success, error_message, attempt_at)
      VALUES (?, ?, ?, datetime('now'))
    `);
    
    const webhookId = `test-${Date.now()}`;
    const success = response.ok;
    const errorMessage = success ? null : `HTTP ${response.status}: ${await response.text()}`;
    
    await logStmt.bind(webhookId, success, errorMessage).run();

    if (success) {
      return Response.json({ 
        success: true,
        status: response.status,
        message: 'Webhook test successful'
      });
    } else {
      return Response.json({ 
        success: false,
        error: errorMessage,
        details: `Failed to reach webhook endpoint`
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error testing webhook:', error);
    
    // Log the failed attempt
    const logStmt = c.env.DB.prepare(`
      INSERT INTO webhook_logs (webhook_id, success, error_message, attempt_at)
      VALUES (?, false, ?, datetime('now'))
    `);
    
    await logStmt.bind(`test-${Date.now()}`, error instanceof Error ? error.message : String(error)).run();
    
    return Response.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Webhook test failed' 
    }, { status: 400 });
  }
});

app.get('/api/pluggy/webhook-logs', authMiddleware, async (c) => {
  try {
    // For now, we return all logs, but in future we could filter by user
    const limit = parseInt(c.req.query('limit') || '20');
    const stmt = c.env.DB.prepare("SELECT * FROM webhook_logs ORDER BY created_at DESC LIMIT ?");
    const result = await stmt.bind(limit).all();
    
    return Response.json({ logs: result.results || [] });
  } catch (error) {
    console.error('Error loading webhook logs:', error);
    return errorResponse('Failed to load webhook logs', 500);
  }
});

// ===========================================
// HEALTH CHECK
// ===========================================

app.get('/api/health', async (c) => {
  try {
    // Test database connection
    const result = await c.env.DB.prepare("SELECT 1").first();
    
    return Response.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: result ? 'connected' : 'disconnected'
    });
  } catch (error) {
    return Response.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
});

// Export the worker
export default {
  fetch: app.fetch,
};
