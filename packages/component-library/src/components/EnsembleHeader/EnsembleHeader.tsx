import { Settings } from 'lucide-react';

export function EnsembleHeader() {
  return (
    <div className="bg-white border-b">
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ensemble AI</h1>
            <p className="text-gray-600 mt-1">The smartest AI is an ensemble.</p>
          </div>
          <Settings className="w-5 h-5 text-gray-400" role="img" />
        </div>
      </div>
    </div>
  );
}
