import React from 'react';
import { Keyboard, X } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'A', description: 'Approve fix and apply proposed change' },
    { key: 'E', description: 'Modify surgical replacement string before approving' },
    { key: 'R', description: 'Reject / mark no change and archive ticket' },
    { key: 'J / ↓', description: 'Navigate to next question in queue' },
    { key: 'K / ↑', description: 'Navigate to previous question in queue' },
    { key: '?', description: 'Toggle this keyboard shortcuts dialog' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-4 bg-slate-900/90">
          <div className="flex items-center space-x-2">
            <Keyboard className="h-5 w-5 text-blue-400" />
            <h3 className="font-bold text-sm text-white">Keyboard Navigation</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Shortcuts list */}
        <div className="p-4 space-y-2.5">
          {shortcuts.map((s) => (
            <div
              key={s.key}
              className="flex items-center justify-between rounded-lg bg-slate-950 p-2.5 border border-slate-800 text-xs"
            >
              <span className="text-slate-300">{s.description}</span>
              <kbd className="px-2 py-1 rounded bg-slate-800 text-blue-300 font-mono font-bold border border-slate-700 shadow-sm">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 p-3 bg-slate-900/60 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
          >
            Got it
          </button>
        </div>

      </div>
    </div>
  );
};

