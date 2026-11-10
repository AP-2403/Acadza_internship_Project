import React, { useState } from 'react';
import { 
  MessageSquareHeart, 
  Edit3, 
  Check, 
  Undo2, 
  Mic, 
  Sparkles,
  Bot,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { FormattedMathText } from './FormattedMath';
import { FacultySolutionCopilot } from './FacultySolutionCopilot';
import { QuestionGroup } from '../types';

interface StudentReplyCardProps {
  reply: string;
  onUpdateReply: (newReply: string) => void;
  questionGroup?: QuestionGroup;
  facultyName?: string;
}

export const StudentReplyCard: React.FC<StudentReplyCardProps> = ({
  reply,
  onUpdateReply,
  questionGroup,
  facultyName = 'Faculty Lead',
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showCopilot, setShowCopilot] = useState(false);
  const [editedText, setEditedText] = useState(reply);

  const handleSave = () => {
    onUpdateReply(editedText);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedText(reply);
    setIsEditing(false);
  };

  const handleCopilotApply = (synthesizedReply: string) => {
    onUpdateReply(synthesizedReply);
    setEditedText(synthesizedReply);
    setShowCopilot(false);
  };

  return (
    <div className="space-y-3">
      {/* Main Student Reply Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800">
            <MessageSquareHeart className="h-4 w-4 text-pink-500" />
            <span>Student Reply Preview (Dispatched to Student)</span>
          </div>

          <div className="flex items-center space-x-2">
            {questionGroup && (
              <button
                type="button"
                onClick={() => setShowCopilot(!showCopilot)}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shadow-xs ${
                  showCopilot
                    ? 'bg-indigo-600 text-white shadow-indigo-600/20'
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                }`}
                title="Open Voice Dictation & Formula Sanity Checker"
              >
                <Mic className="h-3 w-3" />
                <Sparkles className="h-3 w-3" />
                <span>Voice & AI Co-Pilot</span>
                {showCopilot ? <ChevronUp className="h-3 w-3 ml-0.5" /> : <ChevronDown className="h-3 w-3 ml-0.5" />}
              </button>
            )}

            {!isEditing ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="flex items-center space-x-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition-colors px-2 py-1 rounded hover:bg-blue-50"
              >
                <Edit3 className="h-3 w-3" />
                <span>Edit Text</span>
              </button>
            ) : (
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex items-center space-x-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200"
                >
                  <Check className="h-3 w-3" />
                  <span>Save</span>
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex items-center space-x-1 text-[11px] font-semibold text-slate-500 hover:text-slate-700 px-2 py-0.5 rounded bg-slate-50 border border-slate-200"
                >
                  <Undo2 className="h-3 w-3" />
                  <span>Cancel</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {isEditing ? (
          <textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            rows={3}
            className="w-full rounded-lg bg-white p-2.5 text-xs text-slate-900 border border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans leading-relaxed"
          />
        ) : (
          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-700 italic leading-relaxed border border-slate-200">
            "<FormattedMathText text={reply} />"
          </div>
        )}
      </div>

      {/* Expanded Voice & AI Solution Co-Pilot Drawer */}
      {showCopilot && questionGroup && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-150">
          <FacultySolutionCopilot
            questionGroup={questionGroup}
            facultyName={facultyName}
            initialReply={reply}
            studentDoubtText={questionGroup.reports[0]?.comment}
            onApplyReply={handleCopilotApply}
            onClose={() => setShowCopilot(false)}
          />
        </div>
      )}
    </div>
  );
};
