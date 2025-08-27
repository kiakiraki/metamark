'use client';

import { ImageWorkspace } from '@/components/workspace/ImageWorkspace';
import { TemplateSelector } from '@/components/editor/TemplateSelector';
import { ExportControls } from '@/components/export/ExportControls';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <div className="text-center flex-1">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                MetaMark
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Add beautiful EXIF metadata overlays to your photos
              </p>
            </div>
            <div className="flex-shrink-0 ml-4">
              <ThemeToggle />
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {/* Main Workspace */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 h-full transition-colors">
              <ImageWorkspace />
            </div>
          </div>

          {/* Controls Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 transition-colors">
              <TemplateSelector />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 transition-colors">
              <ExportControls />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
