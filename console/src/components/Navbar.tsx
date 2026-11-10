import React from 'react';
import { 
  Sparkles, 
  History, 
  Keyboard, 
  AlertTriangle,
  CheckCircle2,
  FileSearch
} from 'lucide-react';

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
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAudit,
  onOpenShortcuts,
  onOpenBonus,
  stats,
}) => {
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
            </div>
            <p className="text-xs text-slate-500 font-medium">Faculty Late-Night Review Console</p>
          </div>
        </div>

        {/* Center: Live Stats Badges */}
        <div className="hidden md:flex items-center space-x-2 text-xs">
          <div className="flex items-center space-x-1.5 rounded-full bg-slate-100 px-3 py-1 border border-slate-200">
            <span className="text-slate-500">Questions:</span>
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

        {/* Right: Actions, Reviewer & Tools */}
        <div className="flex items-center space-x-2">
          
          {/* Bonus Defects Button */}
          <button
            onClick={onOpenBonus}
            className="flex items-center space-x-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 transition-colors hover:bg-purple-100 hover:text-purple-800"
            title="Inspect 4 unreported questions with hidden defects"
          >
            <FileSearch className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Bonus Defects (4)</span>
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
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-xs">
              AS
            </div>
            <div className="text-left text-xs">
              <div className="font-semibold text-slate-800">Prof. A. Sharma</div>
              <div className="text-[10px] text-slate-500 font-medium">Senior Physics Lead</div>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
};
