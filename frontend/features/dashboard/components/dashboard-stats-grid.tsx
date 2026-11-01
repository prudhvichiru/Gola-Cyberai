import * as React from 'react';
import { StatCard } from '@/components/shared/stat-card';
import type { DashboardStatItem } from '@/types/dashboard.types';

interface DashboardStatsGridProps {
  stats: DashboardStatItem[];
}

export function DashboardStatsGrid({ stats }: DashboardStatsGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <StatCard
          key={stat.id}
          label={stat.label}
          value={stat.value}
          hint={stat.hint}
          icon={stat.icon}
          tone={stat.tone}
          trend={stat.trend}
        />
      ))}
    </div>
  );
}
