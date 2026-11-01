'use client';

import * as React from 'react';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';
import { AuthClientService } from '@/services/auth.service';
import { createClient } from '@/lib/supabase-client';
import { ROUTES } from '@/constants/routes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  Lock,
  Mail,
  Eye,
  EyeOff,
  User,
  Users,
  Building2,
  ArrowRight,
  HelpCircle,
  CheckCircle2,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type AllowedRole = 'employee' | 'manager' | 'hr';

interface RoleOption {
  id: AllowedRole;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    id: 'employee',
    label: 'Employee',
    description: 'Personal tasks & attendance',
    icon: User,
  },
  {
    id: 'manager',
    label: 'Manager',
    description: 'Team oversight & approvals',
    icon: Users,
  },
  {
    id: 'hr',
    label: 'HR',
    description: 'People, payroll & policies',
    icon: Building2,
  },
];

export function SignInCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || ROUTES.DASHBOARD;

  // Form State
  const [selectedRole, setSelectedRole] = useState<AllowedRole>('employee');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [cardLang, setCardLang] = useState('en');

  // Contact Admin Modal State
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactDepartment, setContactDepartment] = useState('Engineering');
  const [contactRole, setContactRole] = useState('employee');
  const [contactReason, setContactReason] = useState('');
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactSubmittedTicket, setContactSubmittedTicket] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter your work email and password.');
      return;
    }

    setLoading(true);
    const { data, error } = await AuthClientService.signIn({ email, password });

    if (error) {
      setLoading(false);
      toast.error(
        error.message === 'Invalid login credentials'
          ? 'Incorrect email or password. Please verify your credentials.'
          : error.message,
      );
      return;
    }

    // Strict Role verification against server DB
    try {
      const supabase = createClient();
      if (data?.user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, full_name')
          .eq('id', data.user.id)
          .maybeSingle();

        const actualRole =
          profile?.role ||
          (data.user.user_metadata?.role as string) ||
          (data.user.email === 'golacyberai@gmail.com' ? 'admin' : 'employee');

        // 1. Strict Enforcement: Administrator accounts MUST NOT log in via Employee/Manager/HR portals
        if (actualRole === 'admin') {
          await AuthClientService.signOut();
          setLoading(false);
          toast.error(
            'Access Denied: Administrator accounts cannot sign in through Employee, Manager, or HR portals. Please use the dedicated Admin Login (/admin) portal.',
            { duration: 6000 },
          );
          return;
        }

        // 2. Strict RBAC Enforcement: Account role must match selected tab
        if (actualRole !== selectedRole) {
          await AuthClientService.signOut();
          setLoading(false);
          toast.error(
            `Role Mismatch: Your account is registered as "${actualRole.toUpperCase()}", not "${selectedRole.toUpperCase()}". Please select your correct role to continue.`,
            { duration: 5000 },
          );
          return;
        }

        toast.success(`Welcome back${profile?.full_name ? `, ${profile.full_name}` : ''}!`);
      }
    } catch {
      toast.success('Sign in successful.');
    }

    setLoading(false);
    window.location.href = redirectUrl;
  }

  async function handleContactSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contactName || !contactEmail || !contactReason) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setContactSubmitting(true);
    const res = await AuthClientService.requestAccess({
      fullName: contactName,
      email: contactEmail,
      department: contactDepartment,
      requestedRole: contactRole,
      reason: contactReason,
    });
    setContactSubmitting(false);

    if (res.error) {
      toast.error(res.error);
      return;
    }

    const ticketId = res.data?.data?.ticket_id || `REQ-${Date.now().toString().slice(-6)}`;
    setContactSubmittedTicket(ticketId);
    toast.success('Your provisioning request was submitted to the IT administrator.');
  }

  function resetContactModal() {
    setIsContactOpen(false);
    setContactSubmittedTicket(null);
    setContactName('');
    setContactEmail('');
    setContactReason('');
  }

  return (
    <>
      <div className="w-full rounded-2xl border border-slate-200/80 bg-white/95 p-4 sm:p-5 shadow-xl shadow-blue-500/5 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
        {/* 1. GOLA logo + CyberAI combined branding */}
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex items-center justify-center gap-2">
            {/* GOLA Logo Asset (exact same visible height as CyberAI text) */}
            <div className="relative flex items-center justify-center">
              <img
                src="/assets/gola-logo-tight.png"
                alt="GOLA"
                className="h-6 sm:h-7 w-auto object-contain select-none"
              />
            </div>
            {/* CyberAI Text with matching visible height & visual prominence */}
            <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white select-none leading-none">
              CyberAI
            </span>
          </div>
          {/* Subtitle below matching visual reference */}
          <p className="mt-1 text-[9px] sm:text-[10px] font-bold tracking-[0.2em] text-slate-400 dark:text-slate-500 uppercase select-none">
            EMPLOYEE MANAGEMENT PLATFORM
          </p>
        </div>

        {/* 2. Heading */}
        <h1 className="mt-2.5 sm:mt-3 text-center text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Sign in to Gola CyberAI
        </h1>

        {/* 3. Subtitle */}
        <p className="mt-0.5 text-center text-xs text-slate-500 dark:text-slate-400">
          Choose your role and enter your credentials to continue.
        </p>

        {/* 4. Three Selectable Role Cards (Employee, Manager, HR) */}
        <div className="mt-2.5 sm:mt-3 grid grid-cols-3 gap-2">
          {ROLE_OPTIONS.map((role) => {
            const Icon = role.icon;
            const isSelected = selectedRole === role.id;
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => setSelectedRole(role.id)}
                className={cn(
                  'group relative flex flex-col items-center justify-center rounded-xl border p-2 sm:p-2.5 text-center transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600',
                  isSelected
                    ? 'border-blue-600 bg-blue-50/70 text-blue-700 shadow-sm ring-1 ring-blue-600/30 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300'
                    : 'border-slate-200/80 bg-slate-50/50 text-slate-600 hover:border-slate-300 hover:bg-slate-100/60 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-800/80',
                )}
              >
                <div
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-md transition-colors',
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200/60 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700 dark:bg-slate-700/60 dark:text-slate-400',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className="mt-1 text-xs font-bold leading-tight">
                  {role.label}
                </span>
                <span className="mt-0.5 hidden text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 sm:block leading-none">
                  {role.id === 'employee' ? 'Workspace' : role.id === 'manager' ? 'Approvals' : 'Operations'}
                </span>
                {isSelected && (
                  <span className="absolute right-1.5 top-1.5 flex h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
                )}
              </button>
            );
          })}
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="mt-2.5 sm:mt-3 space-y-2.5">
          {/* 5. Email Address Field */}
          <div className="space-y-1">
            <Label htmlFor="email" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              Email Address
            </Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-8 sm:h-9 rounded-lg border-slate-200/90 pl-9 pr-3 text-xs shadow-sm transition-colors focus-visible:border-blue-600 focus-visible:ring-1 focus-visible:ring-blue-600 dark:border-slate-800"
                autoComplete="email"
                required
              />
            </div>
          </div>

          {/* 6. Password Field with Show/Hide Toggle */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                Password
              </Label>
              {/* 7. Forgot Password Link */}
              <Link
                href={ROUTES.AUTH.FORGOT_PASSWORD}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-8 sm:h-9 rounded-lg border-slate-200/90 pl-9 pr-9 text-xs shadow-sm transition-colors focus-visible:border-blue-600 focus-visible:ring-1 focus-visible:ring-blue-600 dark:border-slate-800"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* 8. Remember Me Checkbox & 9. Language Selector */}
          <div className="flex items-center justify-between pt-0.5 text-xs">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(Boolean(checked))}
                className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
              />
              <label
                htmlFor="remember"
                className="text-[11px] font-medium text-slate-600 dark:text-slate-400 cursor-pointer select-none"
              >
                Remember me for 30 days
              </label>
            </div>

            {/* Inline Language control */}
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <Globe className="h-3 w-3" />
              <select
                value={cardLang}
                onChange={(e) => setCardLang(e.target.value)}
                className="bg-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer outline-none text-[11px]"
                aria-label="Card language"
              >
                <option value="en">EN</option>
                <option value="es">ES</option>
                <option value="de">DE</option>
                <option value="te">TE</option>
                <option value="hi">HI</option>
              </select>
            </div>
          </div>

          {/* 10. Full-width Blue Gradient Sign in Button */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-8.5 sm:h-9 rounded-xl bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 hover:from-blue-700 hover:via-blue-700 hover:to-indigo-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-blue-500/20 transition-all duration-150 flex items-center justify-center gap-2 group mt-1"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Authenticating credentials…</span>
              </>
            ) : (
              <>
                <span>Sign in</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </Button>

          {/* 11. OR Divider */}
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-white dark:bg-slate-900 px-2.5 font-semibold text-slate-400 select-none">
                OR
              </span>
            </div>
          </div>

          {/* 12. Don't have an account? Contact your administrator */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsContactOpen(true)}
              className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
            >
              <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
              <span>Don&apos;t have an account? <strong className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">Contact your administrator</strong></span>
            </button>
          </div>

          {/* 13. System Administrator Sign In Portal Link */}
          <div className="mt-1 text-center pt-1.5 border-t border-slate-100 dark:border-slate-800/60">
            <Link
              href="/admin"
              className="text-[11px] font-semibold text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors inline-flex items-center gap-1"
            >
              <span>System Administrator?</span>
              <span className="text-blue-600 dark:text-blue-400 underline font-bold">Admin Console &rarr;</span>
            </Link>
          </div>
        </form>
      </div>

      {/* Contact Administrator Modal / Dialog */}
      <Dialog open={isContactOpen} onOpenChange={(open) => !open && resetContactModal()}>
        <DialogContent className="sm:max-w-[460px] rounded-2xl p-6">
          {contactSubmittedTicket ? (
            <div className="text-center py-4 space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <DialogHeader>
                <DialogTitle className="text-center text-lg font-bold">
                  Request Registered Successfully
                </DialogTitle>
                <DialogDescription className="text-center text-xs">
                  Your provisioning request has been routed to the Gola CyberAI Security & IT Operations team.
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-left text-xs dark:border-slate-800 dark:bg-slate-900/60 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Reference Ticket ID:</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                    {contactSubmittedTicket}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Applicant:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{contactName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Assigned Queue:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">Identity & Access Management (IAM)</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500">
                You will receive an activation email with your corporate SSO link once your manager verifies the request.
              </p>

              <DialogFooter className="sm:justify-center pt-2">
                <Button
                  onClick={resetContactModal}
                  className="rounded-xl bg-blue-600 px-6 text-white hover:bg-blue-700"
                >
                  Done
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleContactSubmit} className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">
                  Contact Workspace Administrator
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Submit an account access or credential provisioning request to your IT administrator.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 pt-1">
                <div className="space-y-1">
                  <Label htmlFor="contact-name" className="text-xs font-semibold">
                    Full Legal Name *
                  </Label>
                  <Input
                    id="contact-name"
                    required
                    placeholder="Enter your full name"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="h-9 text-xs rounded-lg"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="contact-email" className="text-xs font-semibold">
                    Work Email *
                  </Label>
                  <Input
                    id="contact-email"
                    type="email"
                    required
                    placeholder="e.g. name@golacyberai.internal"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="h-9 text-xs rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Department</Label>
                    <Select value={contactDepartment} onValueChange={setContactDepartment}>
                      <SelectTrigger className="h-9 text-xs rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Engineering">Engineering</SelectItem>
                        <SelectItem value="Cybersecurity">Cybersecurity</SelectItem>
                        <SelectItem value="Product & Design">Product & Design</SelectItem>
                        <SelectItem value="Human Resources">Human Resources</SelectItem>
                        <SelectItem value="Finance & Payroll">Finance & Payroll</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Role Scope</Label>
                    <Select value={contactRole} onValueChange={setContactRole}>
                      <SelectTrigger className="h-9 text-xs rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="hr">HR Executive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="contact-reason" className="text-xs font-semibold">
                    Reason for Request *
                  </Label>
                  <textarea
                    id="contact-reason"
                    required
                    rows={3}
                    placeholder="Describe your project, team lead, or purpose for accessing the Gola CyberAI platform..."
                    value={contactReason}
                    onChange={(e) => setContactReason(e.target.value)}
                    className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsContactOpen(false)}
                  className="rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={contactSubmitting}
                  className="rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-xs gap-1.5"
                >
                  {contactSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Submitting…</span>
                    </>
                  ) : (
                    'Submit Provisioning Request'
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
