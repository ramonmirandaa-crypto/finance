import { z } from 'zod';

// Pluggy API types and schemas
export const PluggyConnectTokenSchema = z.object({
  accessToken: z.string().optional(),
  connectToken: z.string().optional()
}).refine(data => data.accessToken || data.connectToken, {
  message: "Either accessToken or connectToken is required"
});

export const PluggyItemSchema = z.object({
  id: z.string(),
  connector: z.object({
    name: z.string(),
    institutionUrl: z.string().optional(),
    imageUrl: z.string().optional(),
    primaryColor: z.string().optional()
  }),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastUpdatedAt: z.string().optional()
});

export const PluggyAccountSchema = z.object({
  id: z.string(),
  type: z.string(),
  subtype: z.string(),
  name: z.string(),
  balance: z.number(),
  currencyCode: z.string(),
  itemId: z.string()
});

export const PluggyTransactionSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  amount: z.number(),
  balance: z.number().optional(),
  currencyCode: z.string(),
  date: z.string(),
  description: z.string(),
  descriptionRaw: z.string().optional(),
  category: z.string().optional(),
  categoryId: z.string().optional(),
  type: z.string(),
  paymentData: z.object({
    payer: z.object({
      name: z.string().optional(),
      branchCode: z.string().optional(),
      accountNumber: z.string().optional(),
      routingNumber: z.string().optional()
    }).optional(),
    payee: z.object({
      name: z.string().optional(),
      branchCode: z.string().optional(),
      accountNumber: z.string().optional(),
      routingNumber: z.string().optional()
    }).optional(),
    paymentMethod: z.string().optional(),
    referenceNumber: z.string().optional(),
    reason: z.string().optional()
  }).optional()
});

export type PluggyItem = z.infer<typeof PluggyItemSchema>;
export type PluggyAccount = z.infer<typeof PluggyAccountSchema>;
export type PluggyTransaction = z.infer<typeof PluggyTransactionSchema>;

export class PluggyClient {
  private baseUrl = 'https://api.pluggy.ai';
  private clientId: string;
  private clientSecret: string;
  private accessToken?: string;
  private tokenExpiresAt?: number;
  private itemsCache = new Map<string, PluggyItem[]>();
  private cacheExpiry = new Map<string, number>();

  constructor(clientId: string, clientSecret: string) {
    if (!clientId || !clientSecret) {
      throw new Error('Pluggy clientId and clientSecret are required');
    }
    
    // Validate UUID format for clientId
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(clientId)) {
      throw new Error('Pluggy clientId must be a valid UUID format');
    }
    
    this.clientId = clientId.trim();
    this.clientSecret = clientSecret.trim();
  }

  private async getAccessToken(): Promise<string> {
    // Check if current token is still valid
    if (this.accessToken && this.tokenExpiresAt && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    console.log('Requesting new Pluggy access token...');
    console.log('ClientID format check:', typeof this.clientId, this.clientId.length);
    console.log('ClientSecret format check:', typeof this.clientSecret, this.clientSecret.length);
    
    try {
      // According to Pluggy documentation, authentication endpoint expects JSON payload
      const authPayload = {
        clientId: this.clientId,
        clientSecret: this.clientSecret
      };
      
      console.log('Auth payload structure:', Object.keys(authPayload));
      console.log('Sending authentication request to Pluggy API...');
      
      const response = await fetch(`${this.baseUrl}/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'FinanceitoApp/1.0'
        },
        body: JSON.stringify(authPayload)
      });

      console.log('Pluggy auth response status:', response.status);
      console.log('Pluggy auth response headers:', Object.fromEntries(response.headers.entries()));

      let responseData;
      const responseText = await response.text();
      console.log('Pluggy auth raw response:', responseText);

      try {
        responseData = JSON.parse(responseText);
        console.log('Pluggy auth parsed response:', responseData);
      } catch (parseError) {
        console.error('Failed to parse Pluggy response as JSON:', parseError);
        throw new Error(`Invalid JSON response from Pluggy: ${responseText}`);
      }

      if (!response.ok) {
        console.error(`Pluggy auth failed: ${response.status}`, responseData);
        throw new Error(`Auth failed: ${response.status} ${JSON.stringify(responseData)}`);
      }

      // Check for different possible response formats
      const accessToken = responseData.accessToken || responseData.access_token || responseData.token || responseData.apiKey;
      
      if (!accessToken) {
        console.error('No access token found in response. Available keys:', Object.keys(responseData));
        throw new Error(`No access token received in response. Response keys: ${Object.keys(responseData).join(', ')}`);
      }

      this.accessToken = accessToken;
      // Set expiration to 50 minutes (tokens typically last 1 hour)
      this.tokenExpiresAt = Date.now() + (50 * 60 * 1000);
      console.log('Successfully obtained Pluggy access token');
      return accessToken;

    } catch (error) {
      console.error('Pluggy authentication failed:', error);
      throw error;
    }
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}, retryCount = 0): Promise<any> {
    const token = await this.getAccessToken();
    
    if (!token) {
      throw new Error('Failed to obtain access token');
    }
    
    console.log(`Making Pluggy API request to: ${this.baseUrl}${endpoint} (attempt ${retryCount + 1})`);
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'X-API-KEY': token,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'FinanceitoApp/1.0',
        ...options.headers
      }
    });

    console.log(`Pluggy API response status for ${endpoint}:`, response.status);

    const responseText = await response.text();
    console.log(`Pluggy API raw response for ${endpoint}:`, responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      console.error(`Failed to parse response for ${endpoint}:`, parseError);
      throw new Error(`Invalid JSON response from Pluggy ${endpoint}: ${responseText}`);
    }

    // Handle 401 errors by clearing token cache and retrying once
    if (response.status === 401 && retryCount === 0) {
      console.log('Received 401 error, clearing token cache and retrying...');
      this.accessToken = undefined;
      this.tokenExpiresAt = undefined;
      return this.makeRequest(endpoint, options, retryCount + 1);
    }

    if (!response.ok) {
      console.error(`Pluggy API error for ${endpoint}:`, responseData);
      throw new Error(`Pluggy API error: ${response.status} ${JSON.stringify(responseData)}`);
    }

    return responseData;
  }

  async createConnectToken(options?: {
    clientUserId?: string;
    webhookUrl?: string;
    avoidDuplicates?: boolean;
  }): Promise<string> {
    try {
      console.log('Creating connect token with options:', options);
      
      // Use the auth token instead of creating a separate request
      // According to Pluggy docs, we need to make a specific request for connect tokens
      const authToken = await this.getAccessToken();
      
      // Create connect token with specific endpoint and proper authentication
      const payload = {
        ...(options?.clientUserId && { clientUserId: options.clientUserId }),
        ...(options?.webhookUrl && { webhookUrl: options.webhookUrl }),
        ...(options?.avoidDuplicates !== undefined && { avoidDuplicates: options.avoidDuplicates })
      };
      
      console.log('Making connect token request with payload:', payload);
      
      const response = await fetch(`${this.baseUrl}/connect_token`, {
        method: 'POST',
        headers: {
          'X-API-KEY': authToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'FinanceitoApp/1.0'
        },
        body: JSON.stringify(payload)
      });

      console.log('Connect token response status:', response.status);
      
      const responseText = await response.text();
      console.log('Connect token raw response:', responseText);

      if (!response.ok) {
        throw new Error(`Connect token request failed: ${response.status} ${responseText}`);
      }

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error(`Invalid JSON response from connect token endpoint: ${responseText}`);
      }

      console.log('Connect token response data:', responseData);
      
      // Try to get the connect token from various possible response formats
      const connectToken = responseData.connectToken || responseData.accessToken || responseData.token;
      
      if (!connectToken) {
        console.error('No connect token found in response. Available keys:', Object.keys(responseData));
        throw new Error(`No connect token received from API. Response keys: ${Object.keys(responseData).join(', ')}`);
      }
      
      console.log('Connect token created successfully');
      return connectToken;
    } catch (error) {
      console.error('Connect token creation failed:', error);
      throw new Error(`Failed to create connect token: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getItems(): Promise<PluggyItem[]> {
    // Check cache first (5 minute cache)
    const cacheKey = 'items';
    const cachedItems = this.itemsCache.get(cacheKey);
    const cachedExpiry = this.cacheExpiry.get(cacheKey);
    
    if (cachedItems && cachedExpiry && Date.now() < cachedExpiry) {
      console.log('Returning cached items');
      return cachedItems;
    }
    
    console.log('Fetching fresh items from Pluggy API');
    const data = await this.makeRequest('/items');
    const items = z.array(PluggyItemSchema).parse(data.results || []);
    
    // Cache the results for 5 minutes
    this.itemsCache.set(cacheKey, items);
    this.cacheExpiry.set(cacheKey, Date.now() + (5 * 60 * 1000));
    
    return items;
  }

  async getItem(itemId: string): Promise<PluggyItem> {
    const data = await this.makeRequest(`/items/${itemId}`);
    return PluggyItemSchema.parse(data);
  }

  async getAccounts(itemId: string): Promise<PluggyAccount[]> {
    const data = await this.makeRequest(`/accounts?itemId=${itemId}`);
    return z.array(PluggyAccountSchema).parse(data.results || []);
  }

  async getTransactions(accountId: string, from?: string, to?: string): Promise<PluggyTransaction[]> {
    let endpoint = `/transactions?accountId=${accountId}`;
    if (from) endpoint += `&from=${from}`;
    if (to) endpoint += `&to=${to}`;
    
    const data = await this.makeRequest(endpoint);
    return z.array(PluggyTransactionSchema).parse(data.results || []);
  }

  async getAllItemTransactions(itemId: string, from?: string, to?: string): Promise<PluggyTransaction[]> {
    const accounts = await this.getAccounts(itemId);
    const allTransactions: PluggyTransaction[] = [];
    
    for (const account of accounts) {
      try {
        const transactions = await this.getTransactions(account.id, from, to);
        allTransactions.push(...transactions);
      } catch (error) {
        console.error(`Failed to fetch transactions for account ${account.id}:`, error);
        // Continue with other accounts even if one fails
      }
    }
    
    return allTransactions;
  }
}

// Helper function to map Pluggy categories to our expense categories
export function mapPluggyCategory(pluggyCategory?: string, description?: string): string {
  if (!pluggyCategory && !description) return 'Outros';
  
  const category = pluggyCategory?.toLowerCase() || '';
  const desc = description?.toLowerCase() || '';
  
  // Food & Dining
  if (category.includes('food') || category.includes('dining') || category.includes('restaurant') || 
      desc.includes('restaurante') || desc.includes('lanchonete') || desc.includes('mercado') || 
      desc.includes('supermercado') || desc.includes('padaria')) {
    return 'Alimentação';
  }
  
  // Transportation
  if (category.includes('transportation') || category.includes('gas') || category.includes('fuel') ||
      desc.includes('posto') || desc.includes('combustivel') || desc.includes('uber') || 
      desc.includes('taxi') || desc.includes('metro') || desc.includes('onibus')) {
    return 'Transporte';
  }
  
  // Shopping
  if (category.includes('shopping') || category.includes('retail') ||
      desc.includes('loja') || desc.includes('shopping') || desc.includes('magazine') ||
      desc.includes('americanas') || desc.includes('casas bahia')) {
    return 'Compras';
  }
  
  // Entertainment
  if (category.includes('entertainment') || category.includes('recreation') ||
      desc.includes('cinema') || desc.includes('netflix') || desc.includes('spotify') ||
      desc.includes('amazon prime') || desc.includes('youtube')) {
    return 'Entretenimento';
  }
  
  // Bills & Services
  if (category.includes('bills') || category.includes('utilities') || category.includes('services') ||
      desc.includes('energia') || desc.includes('agua') || desc.includes('telefone') ||
      desc.includes('internet') || desc.includes('condominio') || desc.includes('seguro')) {
    return 'Contas e Serviços';
  }
  
  // Health
  if (category.includes('health') || category.includes('medical') ||
      desc.includes('farmacia') || desc.includes('hospital') || desc.includes('medico') ||
      desc.includes('clinica') || desc.includes('laboratorio')) {
    return 'Saúde';
  }
  
  // Travel
  if (category.includes('travel') || category.includes('hotel') ||
      desc.includes('hotel') || desc.includes('pousada') || desc.includes('airbnb') ||
      desc.includes('booking') || desc.includes('decolar')) {
    return 'Viagem';
  }
  
  // Education
  if (category.includes('education') || category.includes('school') ||
      desc.includes('escola') || desc.includes('universidade') || desc.includes('curso') ||
      desc.includes('faculdade')) {
    return 'Educação';
  }
  
  // Personal Care
  if (category.includes('personal') || category.includes('beauty') ||
      desc.includes('salao') || desc.includes('barbearia') || desc.includes('estetica') ||
      desc.includes('perfumaria')) {
    return 'Cuidados Pessoais';
  }
  
  return 'Outros';
}
