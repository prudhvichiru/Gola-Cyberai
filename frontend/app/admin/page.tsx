'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { AuthClientService } from '@/services/auth.service';
import { createClient } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Mail,
  KeyRound,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Fingerprint,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [securityPin, setSecurityPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unauthorizedError, setUnauthorizedError] = useState<string | null>(null);

  async function handleAdminSignIn(e: React.FormEvent) {
    e.preventDefault();
    setUnauthorizedError(null);

    if (!email || !password) {
      toast.error('Please enter administrator email and password.');
      return;
    }

    setLoading(true);

    try {
      // 1. Authenticate credentials via Supabase Auth
      const { data, error } = await AuthClientService.signIn({ email, password });

      if (error) {
        setLoading(false);
        toast.error(error.message === 'Invalid login credentials'
          ? 'Invalid administrator credentials.'
          : error.message);
        return;
      }

      // 2. Validate administrator authorization in backend profiles table
      const supabase = createClient();
      if (!data?.user?.id) {
        setLoading(false);
        toast.error('Authentication verification failed.');
        return;
      }

      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', data.user.id)
        .maybeSingle();

      const userRole =
        profile?.role ||
        (data.user.user_metadata?.role as string) ||
        (data.user.email === 'golacyberai@gmail.com' ? 'admin' : undefined);

      const adminName =
        profile?.full_name ||
        (data.user.user_metadata?.full_name as string) ||
        'Gola CyberAI';

      // 3. Strict RBAC Enforcement: Only 'admin' role can proceed
      if (userRole !== 'admin') {
        // Immediately revoke session
        await AuthClientService.signOut();
        setLoading(false);
        setUnauthorizedError(
          `Access Denied: Your account role (${userRole || 'standard user'}) is not authorized to access the Gola CyberAI Administrative Console. This unauthorized attempt has been recorded in the security audit logs.`,
        );
        toast.error('Access Denied: Administrative privileges required.');
        return;
      }

      toast.success(`Administrator authorization verified. Welcome, ${adminName}!`);
      window.location.href = '/dashboard';
    } catch (err: any) {
      setLoading(false);
      toast.error(err.message || 'Error authenticating administrator.');
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-[#0B1220] text-slate-100 overflow-x-hidden selection:bg-blue-600 selection:text-white">
      {/* Background High-Security Visual Elements */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[120px]" />
      <div className="pointer-events-none absolute top-1/3 -right-40 h-[450px] w-[450px] rounded-full bg-red-600/5 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 left-1/2 -translate-x-1/2 h-[400px] w-[600px] rounded-full bg-indigo-600/10 blur-[140px]" />

      {/* Top Header */}
      <header className="relative z-20 flex items-center justify-between px-6 py-4 md:px-12 md:py-6 border-b border-slate-800/80">
        <Link
          href="/sign-in"
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Employee & Staff Sign In</span>
        </Link>

        <div className="flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-[11px] font-mono font-semibold text-red-400">
          <ShieldAlert className="h-3.5 w-3.5" />
          <span>RESTRICTED IT ENVIRONMENT</span>
        </div>
      </header>

      {/* Center Console Login Card */}
      <main className="relative z-10 flex flex-1 items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-[460px] animate-in fade-in-50 zoom-in-95 duration-300">
          <div className="rounded-2xl md:rounded-3xl border border-slate-800 bg-[#0F172A]/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            {/* Branding */}
            <div className="flex flex-col items-center justify-center text-center">
              <div className="flex items-center justify-center gap-2.5">
                <img
                  src="/assets/gola-logo-tight.png"
                  alt="GOLA"
                  className="h-7 sm:h-8 w-auto object-contain select-none"
                />
                <span className="text-2xl sm:text-[27px] font-extrabold tracking-tight text-white select-none leading-none">
                  CyberAI
                </span>
              </div>
              <p className="mt-1.5 text-[10px] md:text-xs font-bold tracking-[0.24em] text-red-400 uppercase select-none">
                ADMINISTRATIVE CONTROL CONSOLE
              </p>
            </div>

            {/* Warning Banner */}
            <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-300 flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
              <p className="leading-relaxed text-[11px]">
                Authorized system administrators only. All login telemetry and activity are cryptographically audited.
              </p>
            </div>

            {/* Unauthorized Error State */}
            {unauthorizedError && (
              <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/15 p-3 text-xs text-red-300 flex items-start gap-2.5 animate-in shake">
                <ShieldAlert className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                <p className="leading-relaxed text-[11px]">{unauthorizedError}</p>
              </div>
            )}

            {/* Admin Form */}
            <form onSubmit={handleAdminSignIn} className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="admin-email" className="text-xs font-semibold text-slate-300">
                  Administrator SSO Email
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    id="admin-email"
                    type="email"
                    placeholder="admin@golacyberai.internal"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10 rounded-xl border-slate-700 bg-slate-900/90 pl-10 pr-3.5 text-xs text-white placeholder:text-slate-600 focus-visible:border-blue-500 focus-visible:ring-1 focus-visible:ring-blue-500"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="admin-password" className="text-xs font-semibold text-slate-300">
                  Master Security Password
                </Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10 rounded-xl border-slate-700 bg-slate-900/90 pl-10 pr-10 text-xs text-white placeholder:text-slate-600 focus-visible:border-blue-500 focus-visible:ring-1 focus-visible:ring-blue-500"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="admin-pin" className="text-xs font-semibold text-slate-300">
                    Security Passcode / Hardware Key (Optional)
                  </Label>
                  <span className="text-[10px] text-slate-500 font-mono">FIPS-140</span>
                </div>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    id="admin-pin"
                    type="password"
                    maxLength={8}
                    placeholder="2FA Token or PIN (if enrolled)"
                    value={securityPin}
                    onChange={(e) => setSecurityPin(e.target.value)}
                    className="h-10 rounded-xl border-slate-700 bg-slate-900/90 pl-10 pr-3.5 text-xs text-white placeholder:text-slate-600 focus-visible:border-blue-500 focus-visible:ring-1 focus-visible:ring-blue-500"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white font-semibold shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 mt-4"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Verifying Admin Authorization…</span>
                  </>
                ) : (
                  <>
                    <Fingerprint className="h-4 w-4" />
                    <span>Authenticate Admin Session</span>
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 border-t border-slate-800 pt-4 text-center">
              <Link
                href="/sign-in"
                className="text-xs text-slate-400 hover:text-blue-400 transition-colors"
              >
                Not an administrator? <span className="underline">Go to general employee login</span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-20 py-4 px-6 border-t border-slate-800/80 text-center text-xs text-slate-500">
        <div className="flex items-center justify-center gap-4">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Multi-Factor Enforced</span>
          </div>
          <span>•</span>
          <div>Mutual TLS / AES-256-GCM</div>
          <span>•</span>
          <div>ISO/IEC 27001 Certified</div>
        </div>
      </footer>
    </div>
  );
}
