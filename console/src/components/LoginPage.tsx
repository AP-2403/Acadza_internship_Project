import React, { useState } from 'react';
import { GraduationCap, BookOpen, ShieldCheck, UserCheck, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';
import { loginUser } from '../lib/api';
import { User } from '../types';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [activeTab, setActiveTab] = useState<'student' | 'professor'>('student');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter username and password');
      return;
    }

    setIsLoading(true);
    setError(null);

    const res = await loginUser(username, password);
    setIsLoading(false);

    if (res.success && res.user) {
      onLoginSuccess(res.user);
    } else {
      setError(res.error || 'Authentication failed. Check credentials.');
    }
  };

  const handleGuestLogin = async (guestUser: string, guestPass: string) => {
    setUsername(guestUser);
    setPassword(guestPass);
    setIsLoading(true);
    setError(null);
    const res = await loginUser(guestUser, guestPass);
    setIsLoading(false);
    if (res.success && res.user) {
      onLoginSuccess(res.user);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-center items-center p-4">
      {/* Top Branding Header */}
      <div className="text-center mb-8 max-w-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>JEE & NEET Adaptive Assessment & Triage Engine</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Acadza Question & Doubts Portal
        </h1>
        <p className="text-sm text-slate-500 mt-2">
          Solve test papers, inspect instant auto-graded answers, submit live question doubts, and route errors straight to specialized subject faculty.
        </p>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        
        {/* Role Toggle Tabs */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-100 border-b border-slate-200">
          <button
            type="button"
            onClick={() => {
              setActiveTab('student');
              setError(null);
              setUsername('');
              setPassword('');
            }}
            className={`flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl transition-all ${
              activeTab === 'student'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GraduationCap className="w-4 h-4 text-blue-600" />
            <span>Student Portal</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('professor');
              setError(null);
              setUsername('');
              setPassword('');
            }}
            className={`flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl transition-all ${
              activeTab === 'professor'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <span>Faculty & Admin</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-900">
              {activeTab === 'student' ? 'Sign in to solve test paper' : 'Faculty triage & review sign in'}
            </h2>
            {activeTab === 'professor' && (
              <p className="text-xs text-slate-500 mt-0.5">
                Subject-specific review queue (Physics, Zoology, Botany).
              </p>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={activeTab === 'student' ? 'student' : 'physics_prof'}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-2.5 px-4 rounded-lg font-semibold text-sm text-white flex items-center justify-center gap-2 shadow-sm transition-all ${
                activeTab === 'student'
                  ? 'bg-blue-600 hover:bg-blue-700 active:scale-[0.99]'
                  : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99]'
              }`}
            >
              <span>{isLoading ? 'Verifying...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick 1-Click Guest Login Access */}
          <div className="mt-6 pt-5 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Instant 1-Click Guest Logins
              </span>
              <span className="text-[11px] text-slate-400">No typing needed</span>
            </div>

            {activeTab === 'student' ? (
              <button
                type="button"
                onClick={() => handleGuestLogin('student', 'guest123')}
                className="w-full text-left p-3 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100/70 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    ST
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <span>Aarav Sharma</span>
                      <span className="text-[10px] bg-blue-200 text-blue-800 px-1.5 py-0.2 rounded font-medium">
                        JEE Aspirant
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">student / guest123</div>
                  </div>
                </div>
                <UserCheck className="w-4 h-4 text-blue-600 group-hover:translate-x-0.5 transition-transform" />
              </button>
            ) : (
              <div className="space-y-2">
                {/* Physics Professor */}
                <button
                  type="button"
                  onClick={() => handleGuestLogin('physics_prof', 'guest123')}
                  className="w-full text-left p-2.5 rounded-lg border border-purple-200 bg-purple-50/60 hover:bg-purple-100/60 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded bg-purple-600 text-white flex items-center justify-center font-bold text-[11px]">
                      ⚛️
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span>Prof A</span>
                        <span className="text-[10px] bg-purple-200 text-purple-800 px-1.5 py-0.2 rounded font-semibold">
                          Physics (35 doubts)
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500">physics_prof / guest123</div>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-purple-600 group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* Zoology Professor */}
                <button
                  type="button"
                  onClick={() => handleGuestLogin('zoology_prof', 'guest123')}
                  className="w-full text-left p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/60 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded bg-emerald-600 text-white flex items-center justify-center font-bold text-[11px]">
                      🧬
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span>Prof B</span>
                        <span className="text-[10px] bg-emerald-200 text-emerald-800 px-1.5 py-0.2 rounded font-semibold">
                          Zoology (5 doubts)
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500">zoology_prof / guest123</div>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* Botany Professor */}
                <button
                  type="button"
                  onClick={() => handleGuestLogin('botany_prof', 'guest123')}
                  className="w-full text-left p-2.5 rounded-lg border border-amber-200 bg-amber-50/60 hover:bg-amber-100/60 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded bg-amber-600 text-white flex items-center justify-center font-bold text-[11px]">
                      🌿
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span>Prof C</span>
                        <span className="text-[10px] bg-amber-200 text-amber-800 px-1.5 py-0.2 rounded font-semibold">
                          Botany (4 doubts)
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500">botany_prof / guest123</div>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-amber-600 group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* Dean / Admin */}
                <button
                  type="button"
                  onClick={() => handleGuestLogin('admin', 'admin123')}
                  className="w-full text-left p-2.5 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded bg-slate-800 text-white flex items-center justify-center font-bold text-[11px]">
                      🏛️
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span>Dean of Academics</span>
                        <span className="text-[10px] bg-slate-200 text-slate-800 px-1.5 py-0.2 rounded font-semibold">
                          All Subjects (Admin)
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500">admin / admin123</div>
                    </div>
                  </div>
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-700 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Footer Info */}
      <div className="mt-8 text-center text-xs text-slate-400">
        Acadza Assessment Platform &bull; Powered by Deterministic Guardrails & Subject Routing
      </div>
    </div>
  );
};

