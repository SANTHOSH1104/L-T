import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, AlertCircle, KeyRound, Sparkles } from 'lucide-react';
import { loginAdmin } from '../services/api';
import { AdminUser } from '../types/auth';
import { Button, Input } from './common';

interface LoginPageProps {
  onLoginSuccess: (admin: AdminUser) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('admin@punchpulse.com');
  const [password, setPassword] = useState('admin123');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { admin } = await loginAdmin(email.trim(), password.trim());
      onLoginSuccess(admin);
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid admin credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail('admin@punchpulse.com');
    setPassword('admin123');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10 backdrop-blur-xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-indigo-500 via-blue-600 to-amber-500 flex items-center justify-center text-white shadow-xl shadow-indigo-500/25">
            <span className="font-extrabold text-2xl">M</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">PunchPulse HR SaaS</h1>
          <p className="text-xs text-amber-400 font-semibold tracking-wide uppercase flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Admin-Only Portal</span>
          </p>
        </div>

        {/* Security Notice */}
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center">
          <p className="text-[11px] text-amber-300 font-medium">
            🔒 Restricted Access: Only authorized HR Administrators can log in to manage biometric logs and payroll.
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center space-x-2 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Admin Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@punchpulse.com"
            icon={<Mail className="w-4 h-4" />}
            className="border-slate-700 bg-slate-950/60 text-slate-100 placeholder-slate-600"
          />

          <Input
            label="Admin Password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            icon={<Lock className="w-4 h-4" />}
            className="border-slate-700 bg-slate-950/60 text-slate-100 placeholder-slate-600"
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isLoading}
            icon={<KeyRound className="w-4 h-4" />}
          >
            Sign In to Admin Console
          </Button>
        </form>

        {/* Demo Credentials Helper Pill */}
        <div className="pt-2 border-t border-slate-800 text-center">
          <button
            type="button"
            onClick={fillDemoCredentials}
            className="inline-flex items-center space-x-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-mono transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Fill Default Admin Credentials (`admin123`)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
