import { RefreshCw, Sparkles, Wallet } from 'lucide-react';
import AuthButton from '@/react-app/components/AuthButton';
import type { OverlayView } from './FinancePreviewSection';
import { formatCurrency } from '@/react-app/utils';

interface HeroSectionProps {
  userName?: string | null;
  onRefreshInsights: () => void;
  onOpenOverlay: (view: OverlayView) => void;
  thisMonthExpenses: number;
  totalExpenses: number;
}

export default function HeroSection({
  userName,
  onRefreshInsights,
  onOpenOverlay,
  thisMonthExpenses,
  totalExpenses,
}: HeroSectionProps) {
  const firstName = userName?.split(' ')[0];

  return (
    <section className="relative pb-24 pt-20 text-left">
      <div className="absolute inset-x-0 top-0 -z-10 flex h-[480px] justify-center overflow-hidden" aria-hidden="true">
        <div className="aurora-gradient" />
      </div>

      <nav className="relative mb-16 flex items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white shadow-lg">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-emerald-200/80">Financeito</p>
            <p className="text-sm text-slate-200/80">Fluxo financeiro com IA generativa</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onRefreshInsights}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar insights
          </button>
          <AuthButton />
        </div>
      </nav>

      <div className="relative grid items-center gap-16 lg:grid-cols-[1.1fr_1fr]">
        <div className="flex flex-col gap-10">
          <div className="flex flex-col gap-6">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-medium uppercase tracking-[0.4em] text-emerald-200/80">
              Nova experiência imersiva
            </span>
            <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-[3.5rem] lg:leading-[1.05]">
              Controle financeiro com IA, agora em um fluxo contínuo
              {firstName ? `, ${firstName}` : ''}.
            </h1>
            <p className="max-w-2xl text-lg text-slate-200/85">
              Uma jornada hero-led que conecta seus gastos, insights automáticos e integrações Open Finance em um layout vertical envolvente.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => onOpenOverlay('expense-tracker')}
              className="inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg transition hover:shadow-xl"
            >
              Registrar gasto agora
              <Sparkles className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onOpenOverlay('insights')}
              className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/20"
            >
              Ver insights de IA
            </button>
          </div>

          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-xl glass-surface">
              <dt className="text-sm font-medium text-emerald-200/80">Monitorado neste mês</dt>
              <dd className="text-2xl font-semibold text-white">{formatCurrency(thisMonthExpenses)}</dd>
              <p className="text-xs text-slate-200/70">Capture gastos recorrentes e receba alertas automáticos.</p>
            </div>
            <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-xl glass-surface">
              <dt className="text-sm font-medium text-emerald-200/80">Total acompanhado</dt>
              <dd className="text-2xl font-semibold text-white">{formatCurrency(totalExpenses)}</dd>
              <p className="text-xs text-slate-200/70">Centralize contas, cartões e investimentos em uma única visão.</p>
            </div>
          </dl>
        </div>

        <div className="relative hidden min-h-[420px] items-center justify-center lg:flex">
          <div className="absolute inset-0 -z-10 animate-pulse-slow rounded-full bg-emerald-500/20 blur-3xl" aria-hidden="true" />
          <div className="relative flex w-full max-w-md flex-col gap-6">
            <div className="layered-card">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-100">Resumo diário</span>
                <span className="text-xs text-white/60">IA ativa</span>
              </div>
              <div className="mt-6 space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">Este mês</p>
                  <p className="mt-1 text-3xl font-semibold text-white">{formatCurrency(thisMonthExpenses)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-emerald-200/60">Recomendação</p>
                  <p className="mt-2 text-sm text-white/80">
                    Ajuste o orçamento da categoria com maior crescimento e abra os insights completos para sugestões personalizadas.
                  </p>
                </div>
              </div>
            </div>
            <div className="layered-card translate-x-8 border-white/5 bg-white/10">
              <div className="flex items-center justify-between text-sm text-white/70">
                <span>Contas conectadas</span>
                <button
                  type="button"
                  onClick={() => onOpenOverlay('banking')}
                  className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white transition hover:bg-white/20"
                >
                  Abrir Open Finance
                </button>
              </div>
              <div className="mt-5 space-y-3 text-sm text-white/70">
                <p>Carteira digital • sincronização em tempo real</p>
                <p>Cartões vinculados • monitoramento de limites</p>
                <p className="text-xs text-emerald-200/80">Nova integração disponível para investimentos.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
