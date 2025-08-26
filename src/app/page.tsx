'use client';

import { DropZone } from '@/components/upload/DropZone';
import { FileList } from '@/components/upload/FileList';
import { ImageCanvas } from '@/components/editor/ImageCanvas';
import { TemplateSelector } from '@/components/editor/TemplateSelector';
import { ExportControls } from '@/components/export/ExportControls';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">MetaMark</h1>
          <p className="text-lg text-gray-600">
            Add beautiful EXIF metadata overlays to your photos
          </p>
        </header>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {/* Upload Panel */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload</h2>
              <DropZone />
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <FileList />
            </div>
          </div>
          
          {/* Preview Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6 h-full">
              <ImageCanvas />
            </div>
          </div>
          
          {/* Settings Panel */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <TemplateSelector />
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <ExportControls />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
