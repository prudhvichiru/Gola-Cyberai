'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { ROLE_LABELS } from '@/constants/roles';

export function AccessRestrictedCard({ moduleName }: { moduleName?: string }) {
  const { profile } = useAuth();
  const role = profile?.role || 'employee';

  return (
    <Card className="border-border p-8 text-center max-w-lg mx-auto my-12 shadow-sm animate-in fade-in">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 mb-4 ring-1 ring-amber-500/20">
        <ShieldAlert className="h-7 w-7" />
      </div>
      <h3 className="text-lg font-bold text-foreground">Access Restricted</h3>
      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
        {moduleName ? `${moduleName} is` : 'This module is'} restricted to authorized administrative personnel. Your current role is{' '}
        <span className="font-semibold text-foreground">{ROLE_LABELS[role] || role}</span>.
      </p>
      <div className="mt-6">
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link href="/settings/profile">
            <ArrowLeft className="h-4 w-4" />
            <span>Return to My Profile</span>
          </Link>
        </Button>
      </div>
    </Card>
  );
}
