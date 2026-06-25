import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { LogIn, UserPlus, AlertCircle } from 'lucide-react';

export const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'Admin' | 'Project Manager' | 'Member'>('Member');
  const [validationError, setValidationError] = useState('');

  const { login, register, error, clearError, isLoading } = useAuthStore();

  useEffect(() => {
    clearError();
    setValidationError('');
    setRole('Member');
  }, [isLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!email || !password || (!isLogin && !name)) {
      setValidationError('Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters.');
      return;
    }

    if (isLogin) {
      await login(email, password);
    } else {
      await register(name, email, password, role);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md glass-card rounded-2xl overflow-hidden p-8 relative">
        {/* Decorative backdrop shapes */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-violet-500/10 rounded-full blur-2xl"></div>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Thinkbook
          </h1>
          <p className="text-slate-400 mt-2 text-sm font-medium">
            {isLogin ? 'Manage projects with real-time sync' : 'Create your collaborative workspace'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Full Name</label>
                <input
                  type="text"
                  placeholder="Jane Doe"
                  className="glass-input text-sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">System Role (for testing RBAC)</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="glass-input text-sm bg-slate-900 text-slate-300 border border-white/10"
                >
                  <option value="Member">Member (Read & Move Tasks)</option>
                  <option value="Project Manager">Project Manager (Manage Tasks & Projects)</option>
                  <option value="Admin">Admin (Full Control)</option>
                </select>
              </div>
            </>
          )}

          <div className="flex flex-col">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Email Address</label>
            <input
              type="email"
              placeholder="jane@example.com"
              className="glass-input text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              className="glass-input text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {(validationError || error) && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{validationError || error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-slate-100 font-bold transition-all disabled:opacity-50 text-sm shadow-lg shadow-indigo-600/30 active:scale-[0.98] mt-6"
          >
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-slate-100 border-t-transparent rounded-full animate-spin"></span>
            ) : isLogin ? (
              <>
                <LogIn className="w-4 h-4" />
                Sign In
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Sign Up
              </>
            )}
          </button>
        </form>

        <div className="text-center mt-6 pt-6 border-t border-slate-800/80">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold tracking-wide transition-colors"
          >
            {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
};
