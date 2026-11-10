import React, { useState } from 'react';
import { 
  Check, 
  X, 
  Edit, 
  ShieldAlert
} from 'lucide-react';
import { QuestionGroup, EditProposal } from '../types';

interface ActionControlsProps {
  group: QuestionGroup;
  onApprove: (comment?: string) => void;
  onEditApprove: (customEdit: EditProposal, comment?: string) => void;
  onReject: (reason: string) => void;
}

export const ActionControls: React.FC<ActionControlsProps> = ({
  group,
  onApprove,
  onEditApprove,
  onReject,
}) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  
  const currentEdit = group.primaryResult.edit;
  const [editField, setEditField] = useState(currentEdit?.field || 'answer');
  const [editFind, setEditFind] = useState(currentEdit?.find || '');
  const [editReplace, setEditReplace] = useState(currentEdit?.replace || '');
  const [editComment, setEditComment] = useState('Manual faculty adjustment before approval');

  const [rejectReason, setRejectReason] = useState('Student misread or miscalculated question');

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onEditApprove(
      { field: editField, find: editFind, replace: editReplace },
      editComment
    );
    setShowEditModal(false);
  };

  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onReject(rejectReason);
    setShowRejectModal(false);
  };

  return (
    <div className="border-t border-slate-200 bg-white p-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        
        {/* Helper hint */}
        <div className="text-[11px] text-slate-500 hidden sm:block">
          Keyboard shortcuts active: <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono text-[10px] text-slate-700">A</kbd> Approve • <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono text-[10px] text-slate-700">E</kbd> Edit • <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono text-[10px] text-slate-700">R</kbd> Reject
        </div>

        {/* Action Button Group */}
        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          
          {/* Reject Button */}
          <button
            onClick={() => setShowRejectModal(true)}
            className="flex items-center space-x-1.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 hover:text-red-800"
            title="Reject report / Mark no change (Key: R)"
          >
            <X className="h-4 w-4" />
            <span>Reject (R)</span>
          </button>

          {/* Edit Manually Button */}
          <button
            onClick={() => {
              setEditField(currentEdit?.field || 'answer');
              setEditFind(currentEdit?.find || '');
              setEditReplace(currentEdit?.replace || '');
              setShowEditModal(true);
            }}
            className="flex items-center space-x-1.5 rounded-lg border border-slate-300 bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200 hover:text-slate-900"
            title="Adjust proposal before approving (Key: E)"
          >
            <Edit className="h-4 w-4" />
            <span>Adjust Fix (E)</span>
          </button>

          {/* Approve Button */}
          <button
            onClick={() => onApprove('Approved as recommended by AI triage')}
            className="flex items-center space-x-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-emerald-600/30 transition-all hover:bg-emerald-500 hover:scale-[1.02]"
            title="Approve recommendation and dispatch fix (Key: A)"
          >
            <Check className="h-4 w-4" />
            <span>Approve Fix (A)</span>
          </button>

        </div>

      </div>

      {/* Edit & Approve Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center space-x-2">
              <Edit className="h-4 w-4 text-blue-600" />
              <span>Adjust Question Bank Modification</span>
            </h3>

            <form onSubmit={handleCustomSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Section to Update:</label>
                <select
                  value={editField}
                  onChange={(e) => setEditField(e.target.value)}
                  className="w-full rounded-lg bg-slate-50 p-2 text-slate-800 border border-slate-300 focus:outline-none focus:border-blue-500 font-medium"
                >
                  <option value="answer">Official Answer Key</option>
                  <option value="question">Question Statement / Stem</option>
                  <option value="solution">Official Solution Derivation</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Current Content to Replace / Remove:</label>
                <textarea
                  value={editFind}
                  onChange={(e) => setEditFind(e.target.value)}
                  rows={2}
                  placeholder="Content to find..."
                  className="w-full rounded-lg bg-slate-50 p-2 text-slate-900 border border-slate-300 focus:outline-none focus:border-blue-500 font-sans"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-semibold">New Corrected Content (Leave blank to remove):</label>
                <textarea
                  value={editReplace}
                  onChange={(e) => setEditReplace(e.target.value)}
                  rows={2}
                  placeholder="New content (or leave empty to delete)"
                  className="w-full rounded-lg bg-slate-50 p-2 text-slate-900 border border-slate-300 focus:outline-none focus:border-blue-500 font-sans"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Faculty Reason / Note:</label>
                <input
                  type="text"
                  value={editComment}
                  onChange={(e) => setEditComment(e.target.value)}
                  className="w-full rounded-lg bg-slate-50 p-2 text-slate-800 border border-slate-300 focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 font-bold text-white hover:bg-blue-500 shadow-sm"
                >
                  Apply & Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center space-x-2">
              <ShieldAlert className="h-4 w-4 text-red-600" />
              <span>Confirm Dismissal / Rejection</span>
            </h3>

            <form onSubmit={handleRejectSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Select Reason:</label>
                <select
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full rounded-lg bg-slate-50 p-2 text-slate-800 border border-slate-300 focus:outline-none focus:border-blue-500"
                >
                  <option value="Student misread or miscalculated question">Student misread or miscalculated question</option>
                  <option value="Question and answer key verified correct">Question and answer key verified correct</option>
                  <option value="Client-side rendering / device layout issue">Client-side rendering / device layout issue</option>
                  <option value="Adversarial injection or non-actionable report">Adversarial injection or non-actionable report</option>
                  <option value="Duplicate or already resolved">Duplicate or already resolved</option>
                </select>
              </div>

              <p className="text-slate-500 text-[11px] leading-relaxed">
                This will record a <span className="font-semibold text-slate-800">no_change</span> audit entry and archive this report from the active queue.
              </p>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-red-600 font-bold text-white hover:bg-red-500"
                >
                  Confirm Reject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
