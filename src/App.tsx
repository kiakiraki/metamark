import { MotionConfig } from 'framer-motion';
import { ImageWorkspace } from '@/components/workspace/ImageWorkspace';
import { TemplateSelector } from '@/components/editor/TemplateSelector';
import { LensOverrideField } from '@/components/editor/LensOverrideField';
import { LocationOverrideField } from '@/components/editor/LocationOverrideField';
import { ExportControls } from '@/components/export/ExportControls';
import { ToastContainer } from '@/components/ui/Toast';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ApertureIcon, LockIcon } from '@/components/ui/icons';

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <main className="min-h-screen">
        {/* Top bar */}
        <header className="border-b border-white/[0.07]">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <div className="flex items-baseline gap-3">
              <div className="flex items-center gap-2">
                <ApertureIcon size={22} className="text-accent" />
                <span className="font-display text-xl font-semibold italic tracking-tight text-zinc-100">
                  MetaMark
                </span>
              </div>
              <span className="hidden font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500 sm:inline">
                EXIF overlay studio
              </span>
            </div>

            <div
              className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-surface px-3 py-1.5 font-mono text-[11px] text-zinc-400"
              title="Your photos never leave the browser — all processing is local."
            >
              <LockIcon size={13} className="text-accent/80" />
              <span className="uppercase tracking-wider">100% in-browser</span>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            {/* Main Workspace — the stage. No card chrome so the photo owns
                the space. */}
            <ErrorBoundary>
              <ImageWorkspace />
            </ErrorBoundary>

            {/* Controls Sidebar — one panel, sections divided by hairlines. */}
            <aside className="h-fit divide-y divide-white/[0.06] rounded-xl border border-white/[0.08] bg-surface">
              <section className="p-5">
                <TemplateSelector />
              </section>

              <section className="p-5">
                <LensOverrideField />
              </section>

              <section className="p-5">
                <LocationOverrideField />
              </section>

              <section className="p-5">
                <ExportControls />
              </section>
            </aside>
          </div>
        </div>

        <ToastContainer />
      </main>
    </MotionConfig>
  );
}
