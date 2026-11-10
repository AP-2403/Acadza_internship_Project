import React from 'react';
import { History, X, FileCode } from 'lucide-react';
import { AuditEntry } from '../types';

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: AuditEntry[];
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({
  isOpen,
  onClose,
  entries,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
      <div className="w-full max-w-2xl max-h-[80vh] flex flex-col rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 p-4 bg-slate-50">
          <div className="flex items-center space-x-2">
            <History className="h-5 w-5 text-blue-600" />
            <h3 className="font-bold text-sm text-slate-900">Faculty Audit Trail Log</h3>
            <span className="rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-700 font-mono font-medium">
              {entries.length} actions recorded
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Entries List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {entries.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No faculty actions recorded yet in this session.
            </div>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.id}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        entry.action === 'approve'
                          ? 'bg-emerald-100 text-emerald-800'
                          : entry.action === 'edit_approve'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {entry.action.replace('_', ' ')}
                    </span>
                    <span className="font-mono text-slate-700 font-semibold text-[11px]">
                      QID: {entry.questionId.slice(0, 10)}...
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <div className="text-slate-700">
                  <span className="text-slate-500 font-medium">Reviewer:</span> {entry.reviewer}
                  {entry.comment && (
                    <span className="text-slate-500 italic"> — "{entry.comment}"</span>
                  )}
                </div>

                {entry.editApplied && (
                  <div className="font-mono text-[10px] rounded bg-white p-2 text-indigo-700 border border-slate-200 flex items-center space-x-2">
                    <FileCode className="h-3 w-3 shrink-0" />
                    <span>Field: {entry.editApplied.field} | Applied: "{entry.editApplied.replace}"</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 p-3 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-300 hover:text-slate-900"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
