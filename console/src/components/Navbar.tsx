import React from 'react';
import { 
  Sparkles, 
  History, 
  Keyboard, 
  AlertTriangle,
  CheckCircle2,
  FileSearch,
  LogOut,
  GraduationCap
} from 'lucide-react';
import { User } from '../types';

interface NavbarProps {
  onOpenAudit: () => void;
  onOpenShortcuts: () => void;
  onOpenBonus: () => void;
  stats: {
    total: number;
    needsReview: number;
    autoApplied: number;
    noChange: number;
  };
  user?: User;
  onLogout?: () => void;
  selectedSubject?: string;
  onSubjectChange?: (subject: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAudit,
  onOpenShortcuts,
  onOpenBonus,
  stats,
  user,
  onLogout,
  selectedSubject,
  onSubjectChange
}) => {
  const getInitials = (name?: string) => {
    if (!name) return 'PR';
    const parts = name.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-xs">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        
        {/* Left: Brand & Title */}
        <div className="flex items-center space-x-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 shadow-sm shadow-blue-500/20">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg tracking-tight text-slate-900">Acadza</span>
              <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-200">
                REPORT → FIX
              </span>
              {user && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  user.subject === 'Physics' ? 'bg-purple-100 text-purple-800' :
                  user.subject === 'Zoology' ? 'bg-emerald-100 text-emerald-800' :
                  user.subject === 'Botany' ? 'bg-amber-100 text-amber-800' :
                  'bg-slate-800 text-white'
                }`}>
                  {user.subject ? `${user.subject} Dept` : 'Admin (All)'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium">Faculty Review Console</p>
          </div>
        </div>

        {/* Center: Live Stats Badges & Subject Switcher for Admin */}
        <div className="hidden md:flex items-center space-x-2 text-xs">
          {user?.role === 'admin' && onSubjectChange && (
            <div className="flex items-center gap-1.5 mr-2">
              <span className="text-[11px] font-bold text-slate-500">Subject:</span>
              <select
                value={selectedSubject || 'all'}
                onChange={(e) => onSubjectChange(e.target.value)}
                className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded-md px-2 py-1 text-slate-700"
              >
                <option value="all">All Subjects (44)</option>
                <option value="Physics">Physics (35)</option>
                <option value="Zoology">Zoology (5)</option>
                <option value="Botany">Botany (4)</option>
              </select>
            </div>
          )}

          <div className="flex items-center space-x-1.5 rounded-full bg-slate-100 px-3 py-1 border border-slate-200">
            <span className="text-slate-500">Queue:</span>
            <span className="font-semibold text-slate-800">{stats.total}</span>
          </div>

          <div className="flex items-center space-x-1.5 rounded-full bg-amber-50 px-3 py-1 border border-amber-200 text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Needs Review:</span>
            <span className="font-bold">{stats.needsReview}</span>
          </div>

          <div className="flex items-center space-x-1.5 rounded-full bg-emerald-50 px-3 py-1 border border-emerald-200 text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Auto-Applied:</span>
            <span className="font-bold">{stats.autoApplied}</span>
          </div>

          <div className="flex items-center space-x-1.5 rounded-full bg-slate-100 px-3 py-1 border border-slate-200 text-slate-600">
            <span>Dismissed:</span>
            <span className="font-semibold text-slate-800">{stats.noChange}</span>
          </div>
        </div>

        {/* Right: Actions, Reviewer & Logout */}
        <div className="flex items-center space-x-2">
          
          {/* Bonus Defects Button */}
          <button
            onClick={onOpenBonus}
            className="flex items-center space-x-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 transition-colors hover:bg-purple-100 hover:text-purple-800"
            title="Inspect 4 unreported questions with hidden defects"
          >
            <FileSearch className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Bonus Defects</span>
          </button>

          {/* Audit History */}
          <button
            onClick={onOpenAudit}
            className="flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
            title="View Audit Log of Decisions"
          >
            <History className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Audit Trail</span>
          </button>

          {/* Shortcuts Help */}
          <button
            onClick={onOpenShortcuts}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            title="Keyboard Shortcuts (?)"
          >
            <Keyboard className="h-4 w-4" />
          </button>

          {/* Reviewer Profile */}
          <div className="hidden lg:flex items-center space-x-2 border-l border-slate-200 pl-3">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-xs ${
              user?.subject === 'Physics' ? 'bg-purple-600' :
              user?.subject === 'Zoology' ? 'bg-emerald-600' :
              user?.subject === 'Botany' ? 'bg-amber-600' :
              'bg-blue-600'
            }`}>
              {getInitials(user?.name)}
            </div>
            <div className="text-left text-xs">
              <div className="font-semibold text-slate-800">{user?.name || 'Prof. H. C. Verma'}</div>
              <div className="text-[10px] text-slate-500 font-medium">
                {user?.subject ? `${user.subject} Faculty Lead` : 'Dean of Academics'}
              </div>
            </div>
          </div>

          {/* Logout Button */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-red-200 hover:bg-red-50 transition-colors ml-1"
              title="Sign Out"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          )}

        </div>
      </div>
    </header>
  );
};
