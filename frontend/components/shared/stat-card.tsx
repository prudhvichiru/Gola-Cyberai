import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { StatTone } from '@/types/dashboard.types';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label?: string;
  title?: string;
  value: string | number;
  hint?: string;
  subtitle?: string;
  icon: any;
  tone?: StatTone;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  className?: string;
  onClick?: () => void;
}

const toneStyles: Record<StatTone, { bg: string; text: string; ring: string }> = {
  primary: {
    bg: 'bg-primary/10',
    text: 'text-primary',
    ring: 'hover:border-primary/40',
  },
  success: {
    bg: 'bg-success/10',
    text: 'text-success',
    ring: 'hover:border-success/40',
  },
  accent: {
    bg: 'bg-accent/10',
    text: 'text-accent',
    ring: 'hover:border-accent/40',
  },
  warning: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-500',
    ring: 'hover:border-amber-500/40',
  },
  neutral: {
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    ring: 'hover:border-border',
  },
  info: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-500',
    ring: 'hover:border-blue-500/40',
  },
};

export function StatCard({
  label,
  title,
  value,
  hint,
  subtitle,
  icon: Icon,
  tone = 'primary',
  trend,
  className,
  onClick,
}: StatCardProps) {
  const currentTone = toneStyles[tone] || toneStyles.primary;
  const displayLabel = label || title || '';
  const displayHint = hint || subtitle;

  const renderIcon = () => {
    if (!Icon) return null;
    if (React.isValidElement(Icon)) return Icon;
    const Component = Icon;
    return <Component className="h-5 w-5" />;
  };

  return (
    <Card
      onClick={onClick}
      className={cn(
        'group relative overflow-hidden transition-all duration-200 hover:shadow-md',
        currentTone.ring,
        onClick && 'cursor-pointer',
        className,
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {displayLabel}
          </span>
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110',
              currentTone.bg,
              currentTone.text,
            )}
          >
            {renderIcon()}
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight">{value}</span>
          {trend && (
            <span
              className={cn(
                'inline-flex items-center text-xs font-semibold',
                trend.isPositive ? 'text-success' : 'text-destructive',
              )}
            >
              {trend.isPositive ? (
                <ArrowUpRight className="mr-0.5 h-3.5 w-3.5" />
              ) : (
                <ArrowDownRight className="mr-0.5 h-3.5 w-3.5" />
              )}
              {trend.value}
            </span>
          )}
        </div>

        {hint && (
          <p className="mt-1 text-xs text-muted-foreground">
            {hint}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
