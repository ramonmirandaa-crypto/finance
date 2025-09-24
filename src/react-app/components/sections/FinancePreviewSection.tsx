import { ArrowUpRight, BarChart3, Brain, CreditCard, Sparkles, Wallet2, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { formatCurrency, formatDate } from '@/react-app/utils';
import type { Expense } from '@/shared/types';

export type OverlayView =
  | 'dashboard'
  | 'expense-tracker'
  | 'transactions'
  | 'categories'
  | 'accounts'
  | 'credit-cards'
  | 'investments'
  | 'loans'
  | 'banking'
  | 'insights'
  | 'analytics'
  | 'notifications'
  | 'quick-actions';

interface FinancePreviewSectionProps {
  expenses: Expense[];
  thisMonthExpenses: number;
  totalExpenses: number;
  avgDailySpending: number;
  onOpenOverlay: (view: OverlayView) => void;
}

export default function FinancePreviewSection({
  expenses,
  thisMonthExpenses,
  totalExpenses,
  avgDailySpending,
  onOpenOverlay,
}: FinancePreviewSectionProps) {
  const lastExpense = expenses[0];
  const categoryTotals = expenses.reduce<Record<string, number>>((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {});
  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];

  const previewCards = [
    {
      id: 'expense-tracker' as const,
      title: 'Gastos em tempo real',
      description: 'Capture despesas em poucos cliques e visualize o impacto instantaneamente.',
      icon: Wallet2,
      highlight: `Este mês: ${formatCurrency(thisMonthExpenses)}`,
      detail: lastExpense
        ? `Último gasto em ${formatDate(lastExpense.date)} — ${formatCurrency(lastExpense.amount)} (${lastExpense.category})`
        : 'Nenhum gasto cadastrado ainda',
    },
    {
      id: 'analytics' as const,
      title: 'Análises avançadas',
      description: 'Aprofunde-se em gráficos dinâmicos e acompanhamento por categoria.',
      icon: BarChart3,
      highlight: `${expenses.length} movimentações • média de ${formatCurrency(avgDailySpending || 0)}`,
      detail: topCategory
        ? `Maior foco em ${topCategory[0]} — ${formatCurrency(topCategory[1])}`
        : 'Comece registrando gastos para descobrir padrões',
    },
    {
      id: 'insights' as const,
      title: 'Insights com IA',
      description: 'Receba sugestões proativas e inteligência personalizada sobre seus hábitos.',
      icon: Brain,
      highlight: 'Recomendações automatizadas',
      detail: 'Atualize para receber novos diagnósticos sempre que registrar um gasto.',
    },
    {
      id: 'banking' as const,
      title: 'Open Finance integrado',
      description: 'Conecte contas e cartões com camadas extras de segurança e transparência.',
      icon: Zap,
      highlight: `Infraestrutura Pluggy pronta • ${formatCurrency(totalExpenses)} monitorados`,
      detail: 'Simplifique conciliações e importações com poucos cliques.',
    },
  ];

  const quickLinks: { id: OverlayView; label: string; icon: LucideIcon }[] = [
    { id: 'dashboard', label: 'Painel financeiro', icon: Sparkles },
    { id: 'credit-cards', label: 'Cartões & faturas', icon: CreditCard },
    { id: 'accounts', label: 'Contas conectadas', icon: Wallet2 },
    { id: 'investments', label: 'Investimentos', icon: ArrowUpRight },
    { id: 'loans', label: 'Empréstimos', icon: ArrowUpRight },
    { id: 'notifications', label: 'Central de alertas', icon: Sparkles },
    { id: 'transactions', label: 'Transações', icon: Wallet2 },
    { id: 'categories', label: 'Categorias', icon: ArrowUpRight },
    { id: 'quick-actions', label: 'Ações rápidas', icon: Sparkles },
  ];

  return (
    <section className="relative mt-24" aria-labelledby="finance-preview">
      <div className="absolute inset-0 -z-10 rounded-[3rem] bg-gradient-to-br from-emerald-500/10 via-cyan-500/5 to-transparent" aria-hidden="true" />
      <div className="flex flex-col gap-12 text-left">
        <div className="flex flex-col gap-4">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-emerald-500/10 px-4 py-1 text-xs font-medium uppercase tracking-[0.2em] text-emerald-200/90">
            Visualização Imersiva
          </span>
          <h2 id="finance-preview" className="max-w-3xl text-3xl font-semibold text-white sm:text-4xl">
            Explore camadas de dados, dashboards e integrações sem sair do fluxo
          </h2>
          <p className="max-w-2xl text-base text-slate-200/80">
            Visualize tendências, abra painéis completos e conecte instituições com uma experiência fluida, inspirada em interfaces imersivas.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {previewCards.map(({ id, title, description, icon: Icon, highlight, detail }) => (
            <article
              key={id}
              className="group relative overflow-hidden rounded-4xl border border-white/10 bg-slate-900/60 p-8 shadow-2xl backdrop-blur-xl transition-transform hover:-translate-y-1 hover:shadow-3xl glass-surface"
            >
              <div className="absolute -top-32 right-0 h-72 w-72 rounded-full bg-emerald-500/20 opacity-0 blur-3xl transition-opacity duration-300 group-hover:opacity-100" aria-hidden="true" />
              <div className="relative flex flex-col gap-6">
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white">
                    <Icon className="h-6 w-6" />
                  </span>
                  <div>
                    <h3 className="text-2xl font-semibold text-white">{title}</h3>
                    <p className="mt-1 text-sm text-emerald-200/80">{highlight}</p>
                  </div>
                </div>
                <p className="text-base text-slate-200/80">{description}</p>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-slate-100/80">
                  {detail}
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => onOpenOverlay(id)}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-5 py-2 text-sm font-medium text-white transition hover:bg-emerald-500/20"
                  >
                    Abrir experiência
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="rounded-4xl border border-white/10 bg-white/5 p-6 text-left shadow-xl backdrop-blur-xl glass-surface">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Outras ferramentas disponíveis</h3>
              <p className="text-sm text-slate-200/70">
                Abra painéis completos ou fluxos específicos com um clique.
              </p>
            </div>
            <div className="rounded-full border border-white/10 bg-emerald-500/20 px-4 py-1 text-xs font-medium uppercase tracking-[0.3em] text-emerald-200/90">
              +{Math.max(0, quickLinks.length - 4)} experiências
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {quickLinks.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => onOpenOverlay(id)}
                className="group flex items-center justify-between gap-3 rounded-3xl border border-white/10 bg-slate-900/40 px-4 py-3 text-left text-sm font-medium text-slate-100/80 transition hover:bg-emerald-500/10 hover:text-white"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white">
                    <Icon className="h-4 w-4" />
                  </span>
                  {label}
                </span>
                <ArrowUpRight className="h-4 w-4 opacity-0 transition group-hover:opacity-100" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
