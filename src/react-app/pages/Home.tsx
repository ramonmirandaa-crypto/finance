import { useEffect, useState, type JSX } from 'react';
import { useAuth } from '@getmocha/users-service/react';
import type { LucideIcon } from 'lucide-react';
import {
  Wallet,
  TrendingUp,
  Target,
  CreditCard,
  Banknote,
  BarChart3,
  Building2,
  Zap,
  Bell,
  Bolt,
  ShieldCheck,
  Brain,
  Sparkles,
} from 'lucide-react';
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
import LoginPrompt from '@/react-app/components/LoginPrompt';
import HeroSection from '@/react-app/components/sections/HeroSection';
import FeatureHighlights from '@/react-app/components/sections/FeatureHighlights';
import FinancePreviewSection, { OverlayView } from '@/react-app/components/sections/FinancePreviewSection';
import CallToActionSection from '@/react-app/components/sections/CallToActionSection';
import ExperienceOverlay from '@/react-app/components/layout/ExperienceOverlay';
import { Expense, CreateExpense } from '@/shared/types';

export default function Home() {
  const { user, isPending } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [refreshInsights, setRefreshInsights] = useState(0);
  const [activeOverlay, setActiveOverlay] = useState<OverlayView | null>(null);

  const googleUserName =
    user?.google_user_data?.name ??
    [user?.google_user_data?.given_name, user?.google_user_data?.family_name]
      .filter((part): part is string => Boolean(part))
      .join(' ')
      .trim();
  const userName = googleUserName || user?.email || null;

  const fetchExpenses = async () => {
    try {
      const response = await fetch('/api/expenses');
      const data = await response.json();
      setExpenses(data.expenses || []);
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchExpenses();
    }
  }, [user]);

  if (isPending) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-pulse">
          <div className="h-32 w-32 rounded-3xl bg-white/10" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPrompt />;
  }

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

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const thisMonthExpenses = expenses
    .filter(expense => {
      const expenseDate = new Date(expense.date);
      const now = new Date();
      return (
        expenseDate.getMonth() === now.getMonth() && expenseDate.getFullYear() === now.getFullYear()
      );
    })
    .reduce((sum, expense) => sum + expense.amount, 0);

  const avgDailySpending = expenses.length > 0 ? totalExpenses / Math.max(1, expenses.length) : 0;

  const highlightItems = [
    {
      icon: TrendingUp,
      title: 'Insights preditivos',
      description: 'Antecipe movimentos de fluxo de caixa com análises guiadas por IA.',
      accent: 'linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(20, 184, 166, 0.15))',
    },
    {
      icon: Brain,
      title: 'IA que entende você',
      description: 'Sugestões contextuais baseadas em hábitos e metas do seu perfil.',
      accent: 'linear-gradient(135deg, rgba(34, 211, 238, 0.25), rgba(56, 189, 248, 0.1))',
    },
    {
      icon: ShieldCheck,
      title: 'Segurança multicamada',
      description: 'Conexões Open Finance com monitoramento contínuo e proteção reforçada.',
      accent: 'linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(99, 102, 241, 0.1))',
    },
    {
      icon: Bolt,
      title: 'Automação em minutos',
      description: 'Ações rápidas para organizar despesas, contas e notificações.',
      accent: 'linear-gradient(135deg, rgba(251, 191, 36, 0.25), rgba(249, 115, 22, 0.1))',
    },
  ];

  const overlayConfig: Record<OverlayView, {
    title: string;
    description: string;
    icon: LucideIcon;
    render: () => JSX.Element;
  }> = {
    dashboard: {
      title: 'Painel financeiro completo',
      description: 'Visualize sua saúde financeira com KPIs, projeções e status consolidado.',
      icon: BarChart3,
      render: () => <FinancialDashboard expenses={expenses} />,
    },
    'expense-tracker': {
      title: 'Rastreamento de gastos',
      description: 'Cadastre despesas, categorize rapidamente e acompanhe tendências em tempo real.',
      icon: Wallet,
      render: () => (
        <ExpenseTracker
          expenses={expenses}
          onAddExpense={handleAddExpense}
          loading={submitting}
        />
      ),
    },
    transactions: {
      title: 'Gestão de transações',
      description: 'Revise lançamentos, filtre por categorias e mantenha seu histórico organizado.',
      icon: Target,
      render: () => (
        <div className="space-y-6">
          <TransactionManager />
        </div>
      ),
    },
    categories: {
      title: 'Categorias personalizadas',
      description: 'Estruture categorias e subcategorias para uma análise precisa.',
      icon: Target,
      render: () => <TransactionCategoryManager />,
    },
    accounts: {
      title: 'Contas conectadas',
      description: 'Gerencie instituições, sincronizações e saldos dentro do Open Finance.',
      icon: Building2,
      render: () => <AccountManager />,
    },
    banking: {
      title: 'Integrações Open Finance',
      description: 'Configure conexões com bancos e cartões por meio da infraestrutura Pluggy.',
      icon: Zap,
      render: () => <PluggyManager />,
    },
    'credit-cards': {
      title: 'Gestão de cartões',
      description: 'Acompanhe limites, faturas e benefícios em um hub visual.',
      icon: CreditCard,
      render: () => <CreditCardManager />,
    },
    investments: {
      title: 'Carteira de investimentos',
      description: 'Mapeie aplicações, acompanhe rentabilidade e tendências de mercado.',
      icon: TrendingUp,
      render: () => <InvestmentManager />,
    },
    loans: {
      title: 'Gestão de empréstimos',
      description: 'Centralize parcelas, juros e prazos para planejar seus pagamentos.',
      icon: Banknote,
      render: () => <LoanManager />,
    },
    insights: {
      title: 'Insights de IA',
      description: 'Receba análises e recomendações inteligentes baseadas nos seus dados.',
      icon: Sparkles,
      render: () => <AIInsights refreshKey={refreshInsights} />,
    },
    analytics: {
      title: 'Análises e gráficos',
      description: 'Explore dashboards visualmente ricos para entender padrões de gasto.',
      icon: BarChart3,
      render: () => <ExpenseGraphs expenses={expenses} />,
    },
    notifications: {
      title: 'Central de notificações',
      description: 'Configure alertas, acompanhe lembretes e mantenha o controle em dia.',
      icon: Bell,
      render: () => <NotificationCenter />,
    },
    'quick-actions': {
      title: 'Ações rápidas',
      description: 'Acelere tarefas frequentes com atalhos inteligentes.',
      icon: Bolt,
      render: () => <QuickActions />,
    },
  };

  const activeOverlayConfig = activeOverlay ? overlayConfig[activeOverlay] : null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-10%] h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-emerald-500/20 blur-3xl" aria-hidden="true" />
        <div className="absolute right-[-10%] bottom-0 h-[520px] w-[520px] rounded-full bg-cyan-500/20 blur-3xl" aria-hidden="true" />
        <div className="bg-grid" aria-hidden="true" />
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-24 px-4 pb-24 sm:px-6 lg:px-8">
        <HeroSection
          userName={userName}
          onRefreshInsights={() => setRefreshInsights(prev => prev + 1)}
          onOpenOverlay={setActiveOverlay}
          thisMonthExpenses={thisMonthExpenses}
          totalExpenses={totalExpenses}
        />

        <FeatureHighlights items={highlightItems} />

        <FinancePreviewSection
          expenses={expenses}
          thisMonthExpenses={thisMonthExpenses}
          totalExpenses={totalExpenses}
          avgDailySpending={avgDailySpending}
          onOpenOverlay={setActiveOverlay}
        />

        <CallToActionSection onOpenOverlay={setActiveOverlay} />
      </div>

      {activeOverlayConfig && (
        <ExperienceOverlay
          open={Boolean(activeOverlay)}
          onClose={() => setActiveOverlay(null)}
          title={activeOverlayConfig.title}
          description={activeOverlayConfig.description}
          icon={activeOverlayConfig.icon}
        >
          {activeOverlayConfig.render()}
        </ExperienceOverlay>
      )}
    </div>
  );
}
