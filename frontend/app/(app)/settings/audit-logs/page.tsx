'use client';

import React, { useState, useEffect } from 'react';
import { AdminFrontendService, AuditLogItem } from '@/services/admin.service';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { FileText, RefreshCw, ShieldAlert, CheckCircle2, Search, Download } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { AccessRestrictedCard } from '@/components/settings/access-restricted-card';

export default function AuditLogsPage() {
  const { profile } = useAuth();
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDetails, setSelectedDetails] = useState<Record<string, any> | null>(null);

  const role = profile?.role || 'employee';
  const isAdmin = role === 'admin';

  const loadLogs = async () => {
    if (!isAdmin) return;
    try {
      setLoading(true);
      const res = await AdminFrontendService.getAuditLogs(100);
      if (res.data) setLogs(res.data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadLogs();
    }
  }, [isAdmin]);

  if (!isAdmin) {
    return <AccessRestrictedCard moduleName="System Audit Logs" />;
  }

  const filteredLogs = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.actorId.toLowerCase().includes(search.toLowerCase()) ||
      l.resource.toLowerCase().includes(search.toLowerCase()) ||
      l.ip.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search audit trail by action, actor, resource, or IP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadLogs} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `gola-audit-logs-${Date.now()}.json`;
              a.click();
            }}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            <span>Export JSON</span>
          </Button>
        </div>
      </div>

      {/* Audit Log Table */}
      <Card className="border-border shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Immutable System Audit Trail
              </CardTitle>
              <CardDescription>
                Chronological log of authentication attempts, RBAC authorization events, and data changes.
              </CardDescription>
            </div>
            <Badge variant="outline" className="border-primary/30 text-primary font-mono text-xs">
              {filteredLogs.length} Events
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground uppercase font-semibold border-y border-border">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Actor & Role</th>
                  <th className="px-4 py-3">Target Resource</th>
                  <th className="px-4 py-3">Origin IP</th>
                  <th className="px-4 py-3 text-right">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono text-[11px]">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      Querying audit storage...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      No audit entries found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((entry, idx) => (
                    <tr key={idx} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {new Date(entry.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge
                          variant={
                            entry.status === 'SUCCESS'
                              ? 'default'
                              : entry.status === 'DENIED'
                              ? 'destructive'
                              : 'secondary'
                          }
                          className="text-[10px] uppercase font-bold"
                        >
                          {entry.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">
                        {entry.action}
                      </td>
                      <td className="px-4 py-3 text-foreground whitespace-nowrap">
                        <span>{entry.actorId}</span>
                        <span className="text-muted-foreground ml-1">({entry.actorRole})</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
                        {entry.resource}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{entry.ip}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {entry.details ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[11px] px-2"
                            onClick={() => setSelectedDetails(entry.details || null)}
                          >
                            Inspect
                          </Button>
                        ) : (
                          <span className="text-muted-foreground/50">-</span>
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

      {/* JSON Payload Inspector Modal */}
      {selectedDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95 max-h-[calc(100vh-2.5rem)] overflow-y-auto">
            <h2 className="text-base font-bold text-foreground mb-1">Audit Record Details</h2>
            <p className="text-xs text-muted-foreground mb-3">
              Sanitized contextual telemetry associated with this event.
            </p>

            <pre className="rounded bg-muted/60 p-3 text-xs font-mono text-foreground overflow-x-auto max-h-64 border border-border">
              {JSON.stringify(selectedDetails, null, 2)}
            </pre>

            <div className="mt-4 flex justify-end">
              <Button size="sm" onClick={() => setSelectedDetails(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}