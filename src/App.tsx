import { ImageWorkspace } from '@/components/workspace/ImageWorkspace';
import { TemplateSelector } from '@/components/editor/TemplateSelector';
import { LensOverrideField } from '@/components/editor/LensOverrideField';
import { LocationOverrideField } from '@/components/editor/LocationOverrideField';
import { ExportControls } from '@/components/export/ExportControls';
import { ToastContainer } from '@/components/ui/Toast';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export function App() {
  return (
    <main className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            MetaMark
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Add beautiful EXIF metadata overlays to your photos
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {/* Main Workspace */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 h-full transition-colors">
              <ErrorBoundary>
                <ImageWorkspace />
              </ErrorBoundary>
            </div>
          </div>

          {/* Controls Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 transition-colors">
              <TemplateSelector />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 transition-colors">
              <LensOverrideField />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 transition-colors">
              <LocationOverrideField />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 transition-colors">
              <ExportControls />
            </div>
          </div>
        </div>
      </div>

      <ToastContainer />
    </main>
  );
}
