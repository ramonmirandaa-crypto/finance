import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface ExperienceOverlayProps {
  open: boolean;
  title: string;
  description?: string;
  icon?: LucideIcon;
  onClose: () => void;
  children: ReactNode;
}

export default function ExperienceOverlay({
  open,
  title,
  description,
  icon: Icon,
  onClose,
  children,
}: ExperienceOverlayProps) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl"
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal
        aria-labelledby="experience-overlay-title"
        className="relative w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-2xl glass-surface"
      >
        <div className="absolute -top-40 -left-32 h-80 w-80 rounded-full bg-emerald-500/20 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-32 -right-20 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" aria-hidden="true" />
        <button
          type="button"
          onClick={onClose}
          className="absolute right-6 top-6 rounded-full border border-white/10 bg-white/10 p-2 text-white transition hover:bg-white/20"
          aria-label="Fechar visualização"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative flex flex-col gap-6">
          <div className="flex flex-col gap-4 pr-12 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              {Icon && (
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 via-sky-500 to-blue-600 text-white shadow-lg">
                  <Icon className="h-6 w-6" />
                </span>
              )}
              <div>
                <h2 id="experience-overlay-title" className="text-2xl font-semibold text-white">
                  {title}
                </h2>
                {description && (
                  <p className="mt-2 max-w-2xl text-sm text-slate-200/80">
                    {description}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="relative max-h-[70vh] overflow-y-auto pr-2 text-left">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
