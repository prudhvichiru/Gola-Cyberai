'use client';

import * as React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { DataTable, type Column } from '@/components/shared/data-table';
import { StatCard } from '@/components/shared/stat-card';
import { DocumentUploadModal } from './document-upload-modal';
import type { HRDocument } from '@/types/hr.types';
import { toast } from 'sonner';
import {
  BookOpen,
  Download,
  Eye,
  FileText,
  Lock,
  Plus,
  Globe,
} from 'lucide-react';

interface PoliciesCenterProps {
  initialDocuments: HRDocument[];
  canUpload?: boolean;
}

export function PoliciesCenter({ initialDocuments, canUpload = false }: PoliciesCenterProps) {
  const [documents, setDocuments] = useState<HRDocument[]>(initialDocuments);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<HRDocument | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleSuccess = (doc: HRDocument) => {
    setDocuments((prev) => [doc, ...prev]);
    setIsUploadOpen(false);
  };

  const handleDownload = (doc: HRDocument) => {
    if (doc.file_url) window.open(doc.file_url, '_blank');
    else toast.info('No file attached to this policy.');
  };

  const columns: Column<HRDocument>[] = [
    {
      key: 'title',
      header: 'Policy',
      render: (item) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            <BookOpen className="h-4 w-4" />
          </div>
          <div>
            <span className="font-semibold text-sm text-foreground">{item.title}</span>
            <p className="text-xs text-muted-foreground capitalize">{item.document_type.replace(/_/g, ' ')}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'version',
      header: 'Version',
      render: (item) => <Badge variant="outline" className="font-mono text-xs">{item.version}</Badge>,
    },
    {
      key: 'file_size',
      header: 'Size',
      render: (item) => <span className="font-mono text-xs text-muted-foreground">{item.file_size}</span>,
    },
    {
      key: 'issue_date',
      header: 'Published',
      render: (item) => (
        <span className="font-mono text-xs text-muted-foreground">
          {new Date(item.issue_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (item) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button size="sm" variant="outline" onClick={() => { setSelectedDoc(item); setIsPreviewOpen(true); }} className="h-8 gap-1.5">
            <Eye className="h-3.5 w-3.5" /><span>View</span>
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handleDownload(item)} className="h-8 w-8 p-0" title="Download">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Policies" value={documents.length} hint="Company-wide documents" icon={BookOpen} tone="accent" />
        <StatCard label="Compliance Docs" value={documents.filter((d) => d.document_type.includes('compliance') || d.document_type.includes('nda')).length} hint="NDA, security & legal" icon={Lock} tone="success" />
        <StatCard label="Visibility" value="All Staff" hint="Accessible to all employees" icon={Globe} tone="primary" />
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">Company Policy Library</h3>
          <p className="text-xs text-muted-foreground">Official handbooks, code of conduct, and organizational guidelines.</p>
        </div>
        {canUpload && (
          <Button onClick={() => setIsUploadOpen(true)} className="gap-2 bg-primary hover:bg-primary/90 text-white self-start sm:self-auto">
            <Plus className="h-4 w-4" /> Upload Policy
          </Button>
        )}
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={documents}
        emptyTitle="No policies published yet"
        emptyDescription="Company-wide guidelines and handbooks published by HR will appear here."
      />

      {/* Preview modal */}
      {selectedDoc && (
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <div className="flex items-center gap-3 pb-4 border-b border-border">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{selectedDoc.title}</p>
                <p className="font-mono text-xs text-muted-foreground">{selectedDoc.file_name} • {selectedDoc.file_size} • {selectedDoc.version}</p>
              </div>
            </div>
            <div className="space-y-2 py-3 text-xs">
              {[
                ['Type', selectedDoc.document_type.replace(/_/g, ' ')],
                ['Published', selectedDoc.issue_date],
                ['Access', 'All employees'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-1.5 border-b border-border/40 last:border-0">
                  <span className="text-muted-foreground">{k}:</span>
                  <span className="font-medium capitalize">{v}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>Close</Button>
              <Button onClick={() => handleDownload(selectedDoc)} className="gap-2">
                <Download className="h-4 w-4" /> Download
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Shared upload modal — policy mode */}
      <DocumentUploadModal
        open={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={handleSuccess}
        mode="policy"
      />
    </div>
  );
}
