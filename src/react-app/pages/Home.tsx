import { useState, useEffect } from 'react';
import { useAuth } from '@getmocha/users-service/react';
import { Wallet, TrendingUp, Target, RefreshCw, CreditCard, Banknote, BarChart3, Building2, Zap, Bell, Bolt } from 'lucide-react';
import ExpenseTracker from '@/react-app/components/blocks/ExpenseTracker';
import AIInsights from '@/react-app/components/AIInsights';
import ExpenseGraphs from '@/react-app/components/ExpenseGraphs';
import CreditCardManager from '@/react-app/components/CreditCardManager';
import InvestmentManager from '@/react-app/components/InvestmentManager';
import LoanManager from '@/react-app/components/LoanManager';
import FinancialDashboard from '@/react-app/components/FinancialDashboard';
import PluggyManager from '@/react-app/components/PluggyManager';
import AccountManager from '@/react-app/components/AccountManager';
import NotificationCenter from '@/react-app/components/blocks/NotificationCenter';
import QuickActions from '@/react-app/components/blocks/QuickActions';

import TransactionManager from '@/react-app/components/TransactionManager';
import TransactionCategoryManager from '@/react-app/components/TransactionCategoryManager';
import AuthButton from '@/react-app/components/AuthButton';
import LoginPrompt from '@/react-app/components/LoginPrompt';
import { formatCurrency } from '@/react-app/utils';
import { Expense, CreateExpense } from '@/shared/types';

type ActiveSection = 'dashboard' | 'transactions' | 'categories' | 'accounts' | 'banking' | 'credit-cards' | 'investments' | 'loans' | 'insights' | 'analytics' | 'notifications' | 'quick-actions';

export default function Home() {
  const { user, isPending } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshInsights, setRefreshInsights] = useState(0);
  const [activeSection, setActiveSection] = useState<ActiveSection>('dashboard');

  // Fetch expenses
  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/expenses');
      const data = await response.json();
      setExpenses(data.expenses || []);
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchExpenses();
    }
  }, [user]);

  // Show login prompt if user is not authenticated
  if (isPending) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 paper-texture flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-32 h-32 bg-gray-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPrompt />;
  }

  // Add expense
  const handleAddExpense = async (expenseData: CreateExpense) => {
    try {
      setSubmitting(true);
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseData),
      });
      
      if (response.ok) {
        const data = await response.json();
        setExpenses(prev => [data.expense, ...prev]);
        setRefreshInsights(prev => prev + 1);
      }
    } catch (error) {
      console.error('Failed to add expense:', error);
    } finally {
      setSubmitting(false);
    }
  };

  

  // Calculate stats
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const thisMonthExpenses = expenses.filter(expense => {
    const expenseDate = new Date(expense.date);
    const now = new Date();
    return expenseDate.getMonth() === now.getMonth() && 
           expenseDate.getFullYear() === now.getFullYear();
  }).reduce((sum, expense) => sum + expense.amount, 0);

  const avgDailySpending = expenses.length > 0 ? totalExpenses / Math.max(1, expenses.length) : 0;

  const navigationItems = [
    { id: 'dashboard' as ActiveSection, label: 'Dashboard', icon: BarChart3 },
    { id: 'quick-actions' as ActiveSection, label: 'Ações Rápidas', icon: Bolt },
    { id: 'transactions' as ActiveSection, label: 'Transações', icon: RefreshCw },
    { id: 'categories' as ActiveSection, label: 'Categorias', icon: Target },
    { id: 'accounts' as ActiveSection, label: 'Contas', icon: Building2 },
    { id: 'credit-cards' as ActiveSection, label: 'Cartões', icon: CreditCard },
    { id: 'investments' as ActiveSection, label: 'Investimentos', icon: TrendingUp },
    { id: 'loans' as ActiveSection, label: 'Empréstimos', icon: Banknote },
    { id: 'banking' as ActiveSection, label: 'Open Finance', icon: Zap },
    { id: 'insights' as ActiveSection, label: 'Insights IA', icon: Target },
    { id: 'analytics' as ActiveSection, label: 'Análises', icon: BarChart3 },
    { id: 'notifications' as ActiveSection, label: 'Notificações', icon: Bell },
  ];

  const renderMainContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <FinancialDashboard expenses={expenses} />;
      case 'transactions':
        return (
          <div className="space-y-8">
            <ExpenseTracker 
              expenses={expenses} 
              onAddExpense={handleAddExpense} 
              loading={submitting} 
            />
            <TransactionManager />
          </div>
        );
      case 'categories':
        return <TransactionCategoryManager />;
      case 'accounts':
        return <AccountManager />;
      case 'banking':
        return <PluggyManager />;
      case 'credit-cards':
        return <CreditCardManager />;
      case 'investments':
        return <InvestmentManager />;
      case 'loans':
        return <LoanManager />;
      case 'insights':
        return <AIInsights refreshKey={refreshInsights} />;
      case 'analytics':
        return <ExpenseGraphs expenses={expenses} />;
      case 'notifications':
        return <NotificationCenter />;
      case 'quick-actions':
        return <QuickActions />;
      default:
        return <FinancialDashboard expenses={expenses} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 paper-texture">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-3 rounded-2xl shadow-lg">
                <Wallet className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  Financeito
                </h1>
                <p className="text-gray-600">Gerenciador completo de finanças pessoais com IA</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={() => setRefreshInsights(prev => prev + 1)}
                className="flex items-center gap-2 px-4 py-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
                <span className="hidden sm:inline">Atualizar Insights</span>
              </button>
              <AuthButton />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-2 mb-8">
          <div className="flex flex-wrap gap-2">
            {navigationItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${
                  activeSection === id
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg'
                    : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Stats Cards - Only show on dashboard and transactions */}
        {(activeSection === 'dashboard' || activeSection === 'transactions') && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6">
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-3 rounded-xl">
                  <Wallet className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total em Gastos</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(totalExpenses)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6">
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-3 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Este Mês</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(thisMonthExpenses)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6">
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-3 rounded-xl">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Média por Gasto</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(avgDailySpending)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="mb-8">
          {renderMainContent()}
        </div>
      </div>
    </div>
  );
}
