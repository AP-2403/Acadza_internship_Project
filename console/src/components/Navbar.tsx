import React from 'react';
import { 
  Sparkles, 
  History, 
  Keyboard, 
  Search, 
  ShieldCheck, 
  Moon, 
  Sun,
  AlertTriangle,
  CheckCircle2,
  FileSearch
} from 'lucide-react';

interface NavbarProps {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
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
  darkMode,
  setDarkMode,
  onOpenAudit,
  onOpenShortcuts,
  onOpenBonus,
  stats,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-900/90 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        
        {/* Left: Brand & Title */}
        <div className="flex items-center space-x-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 shadow-md shadow-blue-500/20">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg tracking-tight text-white">Acadza</span>
              <span className="rounded bg-blue-900/50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-300 border border-blue-700/50">
                REPORT → FIX
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">Faculty Late-Night Review Console</p>
          </div>
        </div>

        {/* Center: Live Stats Badges */}
        <div className="hidden md:flex items-center space-x-2 text-xs">
          <div className="flex items-center space-x-1.5 rounded-full bg-slate-800/80 px-3 py-1 border border-slate-700">
            <span className="text-slate-400">Questions:</span>
            <span className="font-semibold text-slate-200">{stats.total}</span>
          </div>

          <div className="flex items-center space-x-1.5 rounded-full bg-amber-500/10 px-3 py-1 border border-amber-500/30 text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Needs Review:</span>
            <span className="font-bold">{stats.needsReview}</span>
          </div>

          <div className="flex items-center space-x-1.5 rounded-full bg-emerald-500/10 px-3 py-1 border border-emerald-500/30 text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Auto-Applied:</span>
            <span className="font-bold">{stats.autoApplied}</span>
          </div>

          <div className="flex items-center space-x-1.5 rounded-full bg-slate-800/60 px-3 py-1 border border-slate-700/60 text-slate-400">
            <span>Dismissed:</span>
            <span className="font-semibold text-slate-300">{stats.noChange}</span>
          </div>
        </div>

        {/* Right: Actions, Reviewer & Tools */}
        <div className="flex items-center space-x-2">
          
          {/* Bonus Defects Button */}
          <button
            onClick={onOpenBonus}
            className="flex items-center space-x-1.5 rounded-lg border border-purple-500/40 bg-purple-950/40 px-3 py-1.5 text-xs font-medium text-purple-300 transition-colors hover:bg-purple-900/50 hover:text-purple-200"
            title="Inspect 4 unreported questions with hidden defects"
          >
            <FileSearch className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Bonus Defects (4)</span>
          </button>

          {/* Audit History */}
          <button
            onClick={onOpenAudit}
            className="flex items-center space-x-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
            title="View Audit Log of Decisions"
          >
            <History className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Audit Trail</span>
          </button>

          {/* Shortcuts Help */}
          <button
            onClick={onOpenShortcuts}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
            title="Keyboard Shortcuts (?)"
          >
            <Keyboard className="h-4 w-4" />
          </button>

          {/* Reviewer Profile */}
          <div className="hidden lg:flex items-center space-x-2 border-l border-slate-800 pl-3">
            <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-xs font-bold text-white shadow">
              AS
            </div>
            <div className="text-left text-xs">
              <div className="font-semibold text-slate-200">Prof. A. Sharma</div>
              <div className="text-[10px] text-slate-400">Senior Physics Lead</div>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
};

