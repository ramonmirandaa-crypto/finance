import { ArrowRight, Shield } from 'lucide-react';
import type { OverlayView } from './FinancePreviewSection';

interface CallToActionSectionProps {
  onOpenOverlay: (view: OverlayView) => void;
}

export default function CallToActionSection({ onOpenOverlay }: CallToActionSectionProps) {
  return (
    <section className="relative mt-24 pb-20 text-left">
      <div className="absolute inset-x-0 -bottom-40 -z-10 h-[400px] bg-gradient-to-b from-emerald-500/20 via-transparent to-transparent blur-3xl" aria-hidden="true" />
      <div className="overflow-hidden rounded-4xl border border-white/10 bg-slate-900/70 p-10 shadow-2xl backdrop-blur-xl glass-surface">
        <div className="absolute -left-20 top-1/2 h-48 w-48 -translate-y-1/2 rounded-full bg-emerald-500/30 blur-3xl" aria-hidden="true" />
        <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 text-emerald-200/80">
              <Shield className="h-5 w-5" />
              <span className="text-sm font-medium uppercase tracking-[0.3em]">Segurança e autonomia</span>
            </div>
            <h2 className="mt-6 text-3xl font-semibold text-white sm:text-4xl">
              Aprofunde sua estratégia financeira com experiências guiadas, seguras e personalizadas.
            </h2>
            <p className="mt-4 text-base text-slate-200/80">
              Continue explorando dashboards completos, cadastre novas despesas ou conecte instituições para desbloquear a automação total.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <button
              type="button"
              onClick={() => onOpenOverlay('dashboard')}
              className="inline-flex items-center justify-between gap-4 rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-cyan-500 px-6 py-3 text-left text-base font-semibold text-slate-900 shadow-lg transition hover:shadow-xl"
            >
              Abrir painel financeiro completo
              <ArrowRight className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => onOpenOverlay('quick-actions')}
              className="inline-flex items-center justify-between gap-4 rounded-full border border-white/10 bg-white/10 px-6 py-3 text-left text-base font-medium text-white transition hover:bg-white/20"
            >
              Acessar ações rápidas
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
