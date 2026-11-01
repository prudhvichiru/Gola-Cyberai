'use client';

import React, { useState, useEffect } from 'react';
import { AdminFrontendService, AdminUser } from '@/services/admin.service';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Users, Shield, CheckCircle2, UserPlus, Search, Lock } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { AccessRestrictedCard } from '@/components/settings/access-restricted-card';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Platform Administrator' },
  { value: 'manager', label: 'Team Lead / Manager' },
  { value: 'hr', label: 'HR Executive' },
  { value: 'payroll', label: 'Payroll Officer' },
  { value: 'employee', label: 'Standard Employee' },
];

export default function UsersSettingsPage() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const role = profile?.role || 'employee';
  const isAuthorized = ['admin', 'hr'].includes(role);

  const loadUsers = async () => {
    if (!isAuthorized) return;
    try {
      setLoading(true);
      const res = await AdminFrontendService.getUsers();
      if (res.data) setUsers(res.data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      loadUsers();
    }
  }, [isAuthorized]);

  if (!isAuthorized) {
    return <AccessRestrictedCard moduleName="Users & Role Management" />;
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      setUpdatingId(userId);
      await AdminFrontendService.updateUserRole(userId, newRole);
      setNotification(`Role updated to ${newRole.toUpperCase()} successfully.`);
      setTimeout(() => setNotification(null), 3000);
      await loadUsers();
    } catch (err: any) {
      alert(err.message || 'Error updating user role');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.department.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {notification && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-xs text-emerald-600 font-medium animate-in fade-in">
          <CheckCircle2 className="h-4 w-4" />
          <span>{notification}</span>
        </div>
      )}

      {/* Control Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users by name, email, or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card"
          />
        </div>

        <Button
          onClick={() => alert('Invitation modal: Send email invitation with role-based access token.')}
          className="gap-2"
        >
          <UserPlus className="h-4 w-4" />
          <span>Invite New User</span>
        </Button>
      </div>

      {/* Users Table Card */}
      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Corporate User Accounts & Roles
          </CardTitle>
          <CardDescription>
            Assign and audit system roles. Modifying user permissions takes effect immediately on subsequent API calls.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground uppercase font-semibold border-y border-border">
                <tr>
                  <th className="px-4 py-3">User & Identity</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Assigned Role</th>
                  <th className="px-4 py-3">MFA Status</th>
                  <th className="px-4 py-3">Last Active</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      Loading user directory...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      No user accounts found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground">{user.name}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">{user.email}</div>
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">{user.department}</td>
                      <td className="px-4 py-3">
                        <select
                          value={user.role}
                          disabled={updatingId === user.id}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          className="rounded border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          {ROLE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        {user.mfa_enabled ? (
                          <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 gap-1 text-[11px]">
                            <Lock className="h-3 w-3" />
                            Enforced
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-muted-foreground text-[11px]">
                            Optional
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-[11px]">
                        {new Date(user.last_login).toLocaleString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => alert(`Reset password token generated for ${user.email}`)}
                        >
                          Reset Creds
                        </Button>
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