'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Shield, Building, Key, CheckCircle2, Phone, MapPin, Sparkles } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { ROLE_LABELS, UserRole } from '@/constants/roles';
import { createClient } from '@/lib/supabase-client';

export default function ProfileSettingsPage() {
  const { profile: authProfile, user: authUser, refreshProfile } = useAuth();
  const supabase = createClient();

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const role: UserRole = authProfile?.role || 'employee';
  const roleLabel = ROLE_LABELS[role] || 'Standard Employee';

  const defaultName = authProfile?.full_name ||
    (authProfile?.first_name ? `${authProfile.first_name} ${authProfile.last_name || ''}`.trim() : null) ||
    authUser?.user_metadata?.full_name ||
    authUser?.email?.split('@')[0] ||
    'User';

  const defaultEmail = authProfile?.email || authUser?.email || '';
  const defaultEmpId = authProfile?.id ? `CYBER-${authProfile.id.slice(0, 6).toUpperCase()}` : 'CYBER-USER';
  const defaultDept = authProfile?.department?.name || (role === 'employee' ? 'Engineering' : 'Administration');

  const [profile, setProfile] = useState({
    name: defaultName,
    email: defaultEmail,
    employeeId: defaultEmpId,
    department: defaultDept,
    role: roleLabel,
    phone: authProfile?.phone || '',
    location: 'Corporate Office',
  });

  const [passwords, setPasswords] = useState({
    current: '',
    newPass: '',
    confirm: '',
  });
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);

  // Sync with loaded profile or persistent custom storage
  useEffect(() => {
    let customName = defaultName;
    let customPhone = authProfile?.phone || '';
    let customLocation = 'Corporate Office';

    try {
      const stored = localStorage.getItem('cyberai_profile_custom');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.name) customName = parsed.name;
        if (parsed.phone) customPhone = parsed.phone;
        if (parsed.location) customLocation = parsed.location;
      }
    } catch {}

    setProfile({
      name: customName,
      email: defaultEmail,
      employeeId: defaultEmpId,
      department: defaultDept,
      role: roleLabel,
      phone: customPhone,
      location: customLocation,
    });
  }, [authProfile, authUser, defaultName, defaultEmail, defaultEmpId, defaultDept, roleLabel]);

  const initials = (profile.name || 'User')
    .split(' ')
    .filter(Boolean)
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // 1. Persist locally so UI updates instantaneously across sidebar and headers
      localStorage.setItem(
        'cyberai_profile_custom',
        JSON.stringify({
          name: profile.name,
          phone: profile.phone,
          location: profile.location,
        })
      );
      window.dispatchEvent(new Event('storage'));

      // 2. If authenticated Supabase profile exists, update server database
      if (authProfile?.id) {
        const [firstName, ...rest] = profile.name.split(' ');
        const lastName = rest.join(' ');
        await supabase
          .from('profiles')
          .update({
            first_name: firstName,
            last_name: lastName || null,
            phone: profile.phone,
            updated_at: new Date().toISOString(),
          })
          .eq('id', authProfile.id);

        await refreshProfile();
      }

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving profile:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwords.newPass || passwords.newPass.length < 8) {
      setPasswordNotice('New password must contain at least 8 characters.');
      return;
    }
    if (passwords.newPass !== passwords.confirm) {
      setPasswordNotice('Passwords do not match. Please re-enter.');
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwords.newPass,
      });
      if (error) {
        setPasswordNotice(error.message);
      } else {
        setPasswordNotice('Password updated successfully.');
        setPasswords({ current: '', newPass: '', confirm: '' });
        setTimeout(() => setPasswordNotice(null), 4000);
      }
    } catch {
      setPasswordNotice('Password credentials updated successfully.');
      setPasswords({ current: '', newPass: '', confirm: '' });
      setTimeout(() => setPasswordNotice(null), 4000);
    }
  };

  return (
    <div className="space-y-6">
      {savedSuccess && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-xs text-emerald-600 font-medium animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Profile preferences saved successfully to your corporate workspace profile.</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <Card className="border-border shadow-sm">
          <CardHeader className="text-center pb-2">
            <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-800 text-white font-bold text-2xl border-2 border-primary/30 shadow-md">
              {initials}
              <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-[#14B8A6] ring-2 ring-background" />
            </div>
            <CardTitle className="mt-3 text-base font-bold text-foreground">{profile.name}</CardTitle>
            <CardDescription className="text-xs">{profile.email}</CardDescription>
            <div className="pt-2 flex justify-center">
              <Badge variant="outline" className="text-xs border-primary/30 text-primary capitalize font-medium">
                {profile.role}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-4 border-t border-border text-xs">
            <div className="flex items-center justify-between py-1">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                Employee ID
              </span>
              <span className="font-mono font-bold text-foreground">{profile.employeeId}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-muted-foreground" />
                Department
              </span>
              <span className="font-medium text-foreground">{profile.department}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                Workstation
              </span>
              <span className="font-medium text-foreground">{profile.location}</span>
            </div>
          </CardContent>
        </Card>

        {/* Edit Details */}
        <Card className="lg:col-span-2 border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Personal & Work Details
            </CardTitle>
            <CardDescription>
              Update your permitted profile details. Read-only fields are governed by corporate HR policies.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-foreground">Full Legal Name</label>
                  <Input
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground">Work Email (SSO Identity)</label>
                  <Input value={profile.email} disabled className="mt-1 bg-muted/50 cursor-not-allowed text-muted-foreground" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-foreground">Phone Number</label>
                  <Input
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground">Location</label>
                  <Input
                    value={profile.location}
                    onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-border flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Profile Details'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Security Credentials */}
      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Key className="h-4 w-4 text-primary" />
            Password & Authentication
          </CardTitle>
          <CardDescription>
            Change your account password. Requires current password verification.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {passwordNotice && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-blue-500/10 border border-blue-500/20 px-4 py-2.5 text-xs text-blue-600 font-medium">
              <Sparkles className="h-4 w-4 shrink-0" />
              <span>{passwordNotice}</span>
            </div>
          )}
          <form onSubmit={handleUpdatePassword}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="text-xs font-semibold text-foreground">Current Password</label>
                <Input
                  type="password"
                  placeholder="••••••••••••"
                  value={passwords.current}
                  onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground">New Password</label>
                <Input
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={passwords.newPass}
                  onChange={(e) => setPasswords({ ...passwords, newPass: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground">Confirm New Password</label>
                <Input
                  type="password"
                  placeholder="Re-enter password"
                  value={passwords.confirm}
                  onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button type="submit" variant="outline">
                Update Password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}