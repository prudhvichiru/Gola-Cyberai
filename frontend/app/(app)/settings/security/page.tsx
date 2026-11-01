'use client';

import React, { useState, useEffect } from 'react';
import { AdminFrontendService, SecuritySession } from '@/services/admin.service';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Shield, Smartphone, Globe, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { ROLE_LABELS } from '@/constants/roles';

export default function SecuritySettingsPage() {
  const { profile } = useAuth();
  const [sessions, setSessions] = useState<SecuritySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const role = profile?.role || 'employee';
  const currentUserName = profile?.full_name || profile?.email?.split('@')[0] || 'User';

  const loadSessions = async () => {
    try {
      setLoading(true);
      const res = await AdminFrontendService.getSecuritySessions();
      if (res.data) {
        const scoped = res.data
          .filter((s) => role === 'admin' || s.isCurrent)
          .map((s) => ({
            ...s,
            userName: role === 'admin' ? s.userName : `${currentUserName} (${ROLE_LABELS[role] || 'Employee'})`,
          }));
        setSessions(scoped);
      }
    } catch (err) {
      console.error('Failed to load security sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleRevokeSession = async (sessionId: string) => {
    try {
      setRevokingId(sessionId);
      await AdminFrontendService.revokeSession(sessionId);
      setNotification('Active session revoked immediately.');
      setTimeout(() => setNotification(null), 3000);
      await loadSessions();
    } catch (err: any) {
      alert(err.message || 'Error revoking session');
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {notification && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-xs text-emerald-600 font-medium animate-in fade-in">
          <CheckCircle2 className="h-4 w-4" />
          <span>{notification}</span>
        </div>
      )}

      {/* MFA Policies */}
      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            Multi-Factor Authentication (MFA / 2FA) Policy
          </CardTitle>
          <CardDescription>
            Enforce Time-based One-Time Password (TOTP) across corporate accounts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-primary bg-primary/5 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-foreground">Privileged Roles Only</span>
                <Badge variant="outline" className="text-[10px] border-primary text-primary">
                  Active
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                MFA is mandatory for Admins, HR Executives, and Payroll Officers.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4 space-y-2 opacity-70">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-foreground">All Employees (Strict)</span>
                <span className="text-[10px] text-muted-foreground">Optional</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Every employee must register TOTP authenticator to check in.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4 space-y-2 opacity-70">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-foreground">Password Only</span>
                <span className="text-[10px] text-destructive">Disabled</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Disabled by security baseline. Enterprise accounts require MFA.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            Active Authenticated Sessions & Tokens
          </CardTitle>
          <CardDescription>
            Live corporate sessions connected to Gola CyberAI. Terminating a session immediately revokes all bearer tokens and WebSocket connections.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground uppercase font-semibold border-y border-border">
                <tr>
                  <th className="px-4 py-3">User & Identity</th>
                  <th className="px-4 py-3">IP Address & Network</th>
                  <th className="px-4 py-3">Client / User-Agent</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Last Active</th>
                  <th className="px-4 py-3 text-right">Revocation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      Scanning active session tokens...
                    </td>
                  </tr>
                ) : sessions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      No active sessions found.
                    </td>
                  </tr>
                ) : (
                  sessions.map((sess) => (
                    <tr key={sess.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          {sess.userName}
                          {sess.isCurrent && (
                            <Badge variant="outline" className="text-[10px] border-emerald-500 text-emerald-600">
                              Current
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-muted-foreground text-[11px]">
                        {sess.ipAddress}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-xs truncate text-[11px]">
                        {sess.userAgent}
                      </td>
                      <td className="px-4 py-3 text-foreground font-medium">{sess.location}</td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-[11px]">
                        {new Date(sess.lastActive).toLocaleTimeString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!sess.isCurrent ? (
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-7 text-xs"
                            disabled={revokingId === sess.id}
                            onClick={() => handleRevokeSession(sess.id)}
                          >
                            {revokingId === sess.id ? 'Revoking...' : 'Terminate'}
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Current Session</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}