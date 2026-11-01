import * as React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Inbox } from 'lucide-react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  const finalActionLabel = action?.label || actionLabel;
  const finalActionClick = action?.onClick || onAction;

  const renderIcon = () => {
    if (!icon) return <Inbox className="h-7 w-7 text-zinc-400" />;
    if (React.isValidElement(icon)) return icon;
    const Component = icon as any;
    return <Component className="h-7 w-7 text-zinc-400" />;
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center',
        className,
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground shadow-sm">
        {renderIcon()}
      </div>
      <h3 className="mt-4 text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      {finalActionLabel && finalActionClick && (
        <Button onClick={finalActionClick} className="mt-5" size="sm">
          {finalActionLabel}
        </Button>
      )}
    </div>
  );
}
