'use client';

import React, { useState, useEffect } from 'react';
import { AdminFrontendService, CompanySettingsData } from '@/services/admin.service';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Building, Clock, CheckCircle2, Globe, Shield } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { AccessRestrictedCard } from '@/components/settings/access-restricted-card';

export default function CompanySettingsPage() {
  const { profile } = useAuth();
  const [settings, setSettings] = useState<CompanySettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const role = profile?.role || 'employee';
  const isAdmin = role === 'admin';

  useEffect(() => {
    if (!isAdmin) return;
    async function load() {
      try {
        setLoading(true);
        const res = await AdminFrontendService.getCompanySettings();
        if (res.data) setSettings(res.data);
      } catch (err) {
        console.error('Failed to load company settings:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isAdmin]);

  if (!isAdmin) {
    return <AccessRestrictedCard moduleName="Company Settings" />;
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      setSaving(true);
      await AdminFrontendService.updateCompanySettings(settings);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Error updating settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="py-20 text-center text-sm text-muted-foreground">
        Loading organizational configuration...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {savedSuccess && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-xs text-emerald-600 font-medium animate-in fade-in">
          <CheckCircle2 className="h-4 w-4" />
          <span>Company configuration and shift policies updated successfully.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Organization Identity */}
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Building className="h-4 w-4 text-primary" />
              Corporate Identity & Regional Profile
            </CardTitle>
            <CardDescription>
              Global organization profile used across payslips, letters, and client agreements.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-foreground">Organization Legal Entity Name</label>
                <Input
                  value={settings.companyName}
                  onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground">Corporate Email Domain</label>
                <Input
                  value={settings.corporateDomain}
                  onChange={(e) => setSettings({ ...settings, corporateDomain: e.target.value })}
                  className="mt-1 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-foreground">System Primary Timezone</label>
                <Input
                  value={settings.timezone}
                  onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                  className="mt-1 font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground">Standard Work Hours Per Day</label>
                <Input
                  type="number"
                  value={settings.standardWorkHoursPerDay}
                  onChange={(e) =>
                    setSettings({ ...settings, standardWorkHoursPerDay: Number(e.target.value) })
                  }
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Break & Attendance Policy */}
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Attendance, Shift & Break Rules
            </CardTitle>
            <CardDescription>
              Configure automated shift calculations, break limits, and overtime rules.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-foreground">Max Allowed Breaks Per Day</label>
                <Input
                  type="number"
                  value={settings.breakPolicy.maxBreaksPerDay}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      breakPolicy: {
                        ...settings.breakPolicy,
                        maxBreaksPerDay: Number(e.target.value),
                      },
                    })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground">Max Total Break Minutes</label>
                <Input
                  type="number"
                  value={settings.breakPolicy.maxTotalBreakMinutes}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      breakPolicy: {
                        ...settings.breakPolicy,
                        maxTotalBreakMinutes: Number(e.target.value),
                      },
                    })
                  }
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="ot_approval"
                checked={settings.breakPolicy.requireManagerApprovalForOvertime}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    breakPolicy: {
                      ...settings.breakPolicy,
                      requireManagerApprovalForOvertime: e.target.checked,
                    },
                  })
                }
                className="rounded border-border"
              />
              <label htmlFor="ot_approval" className="text-xs text-foreground font-medium">
                Require Reporting Manager Approval for Overtime and Regularization requests
              </label>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Company Configuration'}
          </Button>
        </div>
      </form>
    </div>
  );
}