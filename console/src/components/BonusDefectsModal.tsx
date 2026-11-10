import React from 'react';
import { Sparkles, X } from 'lucide-react';

interface BonusDefectsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BonusDefectsModal: React.FC<BonusDefectsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const bonusItems = [
    {
      id: "68dea87d387eea3d0d95fbe3",
      title: "Dangling HTML Markup Leak in Capacitor Question",
      subject: "Physics • Electrostatics",
      type: "scq",
      defectType: "markup_leak",
      description: "Options (B), (C), (D) are wrapped inside dangling raw <mspace linebreak='newline'> tags with three trailing unclosed </mspace> tags. This corrupts DOM layout on older mobile webviews.",
      proposedFix: "Remove the orphaned <mspace> tags and normalize to standard line breaks (<br/>).",
    },
    {
      id: "68dea657387eea3d0d95f54a",
      title: "Typographical MathML Error in Lens Power Solution",
      subject: "Physics • Geometrical Optics",
      type: "integerQuestion",
      defectType: "spelling",
      description: "The official stored solution contains a MathML text typo in the subscript: '<mtext>eqch</mtext>' instead of '<mtext>each</mtext>' in P_each = 5 D.",
      proposedFix: "Replace '<mtext>eqch</mtext>' with '<mtext>each</mtext>' in the solution XML.",
    },
    {
      id: "695ede2a88d7701e561aa9d9",
      title: "Dialysis Statement-I & Statement-II Question",
      subject: "Zoology • Excretory Products",
      type: "scq",
      defectType: "clean",
      description: "Audited statement semantics against NCERT Biology Chapter 19. Both statements, answer key (Option D), and explanation are fully sound and correct.",
      proposedFix: "None (Clean question asset).",
    },
    {
      id: "68dea6e6387eea3d0d95f6f8",
      title: "Displacement Method Optics Ratio Question",
      subject: "Physics • Geometrical Optics",
      type: "integerQuestion",
      defectType: "clean",
      description: "Verified displacement method formula x = sqrt(D*(D - 4f)) = 90 cm. Size ratio beta = ((150+90)/(150-90))^2 = (240/60)^2 = 16. Key 16 is verified correct.",
      proposedFix: "None (Clean question asset).",
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
      <div className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-xl border border-purple-200 bg-white shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-purple-100 p-4 bg-purple-50/50">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <h3 className="font-bold text-sm text-slate-900">Bonus Discovery: Unreported Questions Audit</h3>
            <span className="rounded bg-purple-100 px-2 py-0.5 text-xs text-purple-700 font-mono font-semibold">
              4 Questions Audited
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Note */}
        <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 text-xs text-slate-600 leading-relaxed">
          <span className="font-bold text-purple-800">Brief Objective: </span>
          <span>"Our data has defects nobody reported. Find them." We scanned all questions in questions.json that lacked student tickets in reports.json.</span>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {bonusItems.map((item, idx) => (
            <div
              key={item.id}
              className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-900 text-xs">{idx + 1}. {item.title}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      item.defectType === 'clean'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {item.defectType === 'clean' ? 'Verified Clean' : `Defect: ${item.defectType}`}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-slate-500">ID: {item.id.slice(0, 8)}...</span>
              </div>

              <div className="text-[11px] text-slate-500">{item.subject} • {item.type}</div>

              <p className="text-xs text-slate-700 leading-relaxed">{item.description}</p>

              <div className="rounded bg-white p-2.5 font-mono text-[11px] text-indigo-700 border border-slate-200 font-medium">
                Fix Proposal: {item.proposedFix}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 p-3 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-300 hover:text-slate-900"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
