'use client';

import { PageHeader } from '@/components/page-header';
import { useAuth } from '@/components/auth-provider';

export function SettingsHeader() {
  const { profile } = useAuth();
  const role = profile?.role || 'employee';

  if (role === 'admin') {
    return (
      <PageHeader
        title="Settings & Administration"
        description="Configure organization policies, manage user roles, review RBAC permissions, and inspect live security audit logs."
      />
    );
  }

  if (role === 'hr') {
    return (
      <PageHeader
        title="HR & Account Settings"
        description="Manage employee directories, organizational roles, and your personal account security."
      />
    );
  }

  return (
    <PageHeader
      title="Account & Security Settings"
      description="Manage your personal profile details, credentials, and authentication preferences."
    />
  );
}
