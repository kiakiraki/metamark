'use client';

import { motion } from 'framer-motion';
import { useTemplateStore } from '@/stores/templateStore';
import { templates } from '@/templates';
import type { TemplatePreset } from '@/types/template';
import clsx from 'clsx';

export function TemplateSelector() {
  const { selectedTemplate, selectTemplate } = useTemplateStore();

  const templatePresets: { key: TemplatePreset; name: string; description: string }[] = [
    { key: 'minimal', name: 'Minimal', description: 'Clean and simple' },
    { key: 'classic', name: 'Classic', description: 'Traditional layout' },
    { key: 'modern', name: 'Modern', description: 'Contemporary design' },
    { key: 'film', name: 'Film', description: 'Vintage style' },
    { key: 'technical', name: 'Technical', description: 'Detailed specs' },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Template</h3>
      
      <div className="grid grid-cols-1 gap-3">
        {templatePresets.map((preset) => {
          const template = templates[preset.key];
          const isSelected = selectedTemplate?.id === preset.key;
          const isAvailable = template?.id === preset.key; // Check if template is fully implemented
          
          return (
            <motion.button
              key={preset.key}
              onClick={() => isAvailable && selectTemplate(preset.key)}
              disabled={!isAvailable}
              className={clsx(
                'p-4 rounded-lg border text-left transition-colors',
                {
                  'border-blue-500 bg-blue-50': isSelected && isAvailable,
                  'border-gray-200 bg-white hover:bg-gray-50': !isSelected && isAvailable,
                  'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed': !isAvailable,
                }
              )}
              whileHover={isAvailable ? { scale: 1.02 } : {}}
              whileTap={isAvailable ? { scale: 0.98 } : {}}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h4 className="font-medium text-gray-900">
                    {preset.name}
                    {!isAvailable && (
                      <span className="ml-2 text-xs text-gray-400">(Coming Soon)</span>
                    )}
                  </h4>
                  <p className="text-sm text-gray-500">{preset.description}</p>
                </div>
                
                {isSelected && isAvailable && (
                  <div className="text-blue-600">
                    ✓
                  </div>
                )}
              </div>
              
              {isAvailable && (
                <div className="mt-3 flex items-center space-x-2 text-xs text-gray-400">
                  <div 
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: template.style.backgroundColor }}
                  />
                  <span>{template.style.fontFamily.split(',')[0]}</span>
                  <span>•</span>
                  <span>{template.style.fontSize}px</span>
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
      
      {selectedTemplate && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Template Details</h4>
          <div className="space-y-1 text-xs text-gray-600">
            <p>Font: {selectedTemplate.style.fontFamily}</p>
            <p>Size: {selectedTemplate.style.fontSize}px</p>
            <p>Position: {selectedTemplate.position.x}, {selectedTemplate.position.y}</p>
            <p>Fields: {selectedTemplate.fields.filter(f => f.visible).length} visible</p>
          </div>
        </div>
      )}
    </div>
  );
}