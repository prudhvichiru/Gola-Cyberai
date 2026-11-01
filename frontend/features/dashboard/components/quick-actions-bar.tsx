import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes';
import {
  PlayCircle,
  Plus,
  Calendar,
  FileText,
  Users,
} from 'lucide-react';

export function QuickActionsBar() {
  const actions = [
    {
      label: 'Start Timer',
      href: ROUTES.TIME_TRACKING,
      icon: PlayCircle,
      variant: 'default' as const,
    },
    {
      label: 'New Task',
      href: ROUTES.TASKS,
      icon: Plus,
      variant: 'outline' as const,
    },
    {
      label: 'Schedule Meeting',
      href: ROUTES.MEETINGS,
      icon: Calendar,
      variant: 'outline' as const,
    },
    {
      label: 'Request Leave',
      href: ROUTES.HR.LEAVE_REQUESTS,
      icon: FileText,
      variant: 'outline' as const,
    },
  ];

  return (
    <Card className="border-border shadow-sm">
      <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <h4 className="text-sm font-semibold">Quick Actions</h4>
          <p className="text-xs text-muted-foreground">Jump directly to your frequent workflows</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {actions.map((act) => {
            const Icon = act.icon;
            return (
              <Button key={act.label} variant={act.variant} size="sm" asChild>
                <Link href={act.href} className="gap-1.5">
                  <Icon className="h-4 w-4" />
                  {act.label}
                </Link>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
