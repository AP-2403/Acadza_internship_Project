import React, { useState } from 'react';
import { MessageSquareHeart, Edit3, Check, Undo2 } from 'lucide-react';

interface StudentReplyCardProps {
  reply: string;
  onUpdateReply: (newReply: string) => void;
}

export const StudentReplyCard: React.FC<StudentReplyCardProps> = ({
  reply,
  onUpdateReply,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(reply);

  const handleSave = () => {
    onUpdateReply(editedText);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedText(reply);
    setIsEditing(false);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800">
          <MessageSquareHeart className="h-4 w-4 text-pink-500" />
          <span>Student Reply Preview (Dispatched to Student)</span>
        </div>

        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center space-x-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition-colors"
          >
            <Edit3 className="h-3 w-3" />
            <span>Customize</span>
          </button>
        ) : (
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSave}
              className="flex items-center space-x-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700"
            >
              <Check className="h-3 w-3" />
              <span>Save</span>
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center space-x-1 text-[11px] font-semibold text-slate-500 hover:text-slate-700"
            >
              <Undo2 className="h-3 w-3" />
              <span>Cancel</span>
            </button>
          </div>
        )}
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
          "{reply}"
        </div>
      )}
    </div>
  );
};
