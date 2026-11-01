'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  Clock,
  ShieldCheck,
  MapPin,
  CalendarDays,
  Sparkles,
} from 'lucide-react';

export function ShiftPolicyCard() {
  const [currentDateTime, setCurrentDateTime] = React.useState<string>('');

  React.useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatted = now.toLocaleDateString('en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }) + ' • ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setCurrentDateTime(formatted);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="border-border/80 bg-gradient-to-r from-card via-card to-primary/5 shadow-sm">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Company & Office Info */}
          <div className="flex items-start sm:items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-foreground text-sm sm:text-base">
                  Gola CyberAI HQ — General Day Shift
                </h3>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1 text-[11px] font-medium">
                  <ShieldCheck className="h-3 w-3" />
                  Office Network Verified
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground flex flex-wrap items-center gap-2">
                <span>Shift: 09:30 AM – 06:30 PM (9.0 hrs)</span>
                <span>•</span>
                <span>Full Day: 8.0 hrs</span>
                <span>•</span>
                <span>Half Day: 4.5 hrs</span>
                <span>•</span>
                <span>Grace Time: 15 mins</span>
              </p>
            </div>
          </div>

          {/* Real-time Live Clock & Network Badge */}
          <div className="flex flex-wrap items-center gap-2.5 sm:self-center">
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs font-mono text-foreground font-semibold">
              <Clock className="h-3.5 w-3.5 text-primary animate-pulse" />
              <span>{currentDateTime || 'Loading live time…'}</span>
            </div>
            <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/20 px-2.5 py-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 text-emerald-500" />
              <span>Bangalore Tower • 192.168.1.104</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
