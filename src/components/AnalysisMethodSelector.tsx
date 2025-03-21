import React from 'react';
import { Camera, FileImage, ClipboardList } from 'lucide-react';
import type { AnalysisMethod } from '../types';

type MethodOption = {
  id: AnalysisMethod;
  title: string;
  description: string;
  icon: React.ReactNode;
};

type Props = {
  onSelect: (method: AnalysisMethod) => void;
};

export function AnalysisMethodSelector({ onSelect }: Props) {
  const methods: MethodOption[] = [
    {
      id: 'image',
      title: 'Photo Analysis',
      description: 'Upload photos or use your camera for instant analysis',
      icon: <Camera className="w-8 h-8" />,
    },
    {
      id: 'quiz',
      title: 'Style Quiz',
      description: 'Answer a few questions about your measurements and preferences',
      icon: <ClipboardList className="w-8 h-8" />,
    },
    {
      id: 'hybrid',
      title: 'Complete Analysis',
      description: 'Combine both methods for the most accurate results',
      icon: <FileImage className="w-8 h-8" />,
    },
  ];

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {methods.map((method) => (
        <button
          key={method.id}
          onClick={() => onSelect(method.id)}
          className="p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow
                     border border-gray-100 text-left"
        >
          <div className="text-indigo-600 mb-4">{method.icon}</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {method.title}
          </h3>
          <p className="text-gray-600">{method.description}</p>
        </button>
      ))}
    </div>
  );
}