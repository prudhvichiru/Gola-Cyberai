'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import {
  Globe,
  Sun,
  Moon,
  ShieldAlert,
  ShieldCheck,
  Lock,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const LANGUAGES = [
  { code: 'en-US', label: 'English (US)' },
  { code: 'es', label: 'Español' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'te', label: 'తెలుగు (Telugu)' },
  { code: 'hi', label: 'हिन्दी (Hindi)' },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [selectedLang, setSelectedLang] = useState('English (US)');

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative h-screen max-h-screen flex flex-col justify-between bg-gradient-to-b from-blue-50/80 via-slate-50/50 to-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-foreground overflow-hidden transition-colors duration-200">
      {/* Decorative ambient background shapes */}
      <div className="pointer-events-none absolute -top-28 -left-28 h-96 w-96 rounded-full bg-blue-400/15 blur-3xl dark:bg-blue-600/10" />
      <div className="pointer-events-none absolute top-1/4 -right-28 h-96 w-96 rounded-full bg-cyan-400/15 blur-3xl dark:bg-cyan-600/10" />
      <div className="pointer-events-none absolute -bottom-32 left-1/3 h-96 w-96 rounded-full bg-indigo-400/10 blur-3xl dark:bg-indigo-600/10" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Top Header Bar */}
      <header className="relative z-20 flex items-center justify-between px-4 py-2 sm:px-8 sm:py-3 shrink-0">
        {/* Left: Language Selector & Theme Control */}
        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 rounded-full border-slate-200/80 bg-white/80 px-3 text-xs font-medium text-slate-700 shadow-sm backdrop-blur hover:bg-white hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:bg-slate-850"
              >
                <Globe className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span>{selectedLang}</span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40 rounded-xl shadow-lg">
              {LANGUAGES.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => setSelectedLang(lang.label)}
                  className="text-xs cursor-pointer"
                >
                  {lang.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme Toggle */}
          {mounted && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="h-8 w-8 rounded-full border-slate-200/80 bg-white/80 shadow-sm backdrop-blur hover:bg-white dark:border-slate-800 dark:bg-slate-900/80 dark:hover:bg-slate-850"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="h-3.5 w-3.5 text-amber-400" />
              ) : (
                <Moon className="h-3.5 w-3.5 text-slate-600" />
              )}
            </Button>
          )}
        </div>

        {/* Right: Dedicated Admin Login Link */}
        <div className="flex items-center">
          <Link
            href="/admin"
            className="group flex items-center gap-1.5 rounded-full border border-blue-200/80 bg-blue-50/70 px-3.5 py-1.5 text-xs font-semibold text-blue-700 shadow-sm backdrop-blur transition-all hover:border-blue-400 hover:bg-blue-100 hover:text-blue-800 hover:shadow dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/60"
          >
            <ShieldAlert className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 transition-transform group-hover:scale-110" />
            <span>Admin Login</span>
          </Link>
        </div>
      </header>

      {/* Main Centered Content */}
      <main className="relative z-10 flex flex-1 items-center justify-center p-2 sm:p-4 min-h-0">
        <div className="w-full max-w-[420px] animate-in fade-in-50 zoom-in-95 duration-300">
          {children}
        </div>
      </main>

      {/* Bottom Footer: Security & Product Benefits */}
      <footer className="relative z-20 py-2 px-4 sm:py-2.5 sm:px-6 shrink-0">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-2 text-center sm:flex-row sm:text-left">
          {/* Security Badges */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>SOC-2 Type II Certified</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-blue-500" />
              <span>256-bit AES Encryption</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-teal-500" />
              <span>99.99% Enterprise SLA</span>
            </div>
          </div>

          {/* Copyright */}
          <div className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500">
            &copy; {new Date().getFullYear()} Gola CyberAI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}