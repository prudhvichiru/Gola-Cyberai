'use client';

import * as React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { DataTable, type Column } from '@/components/shared/data-table';
import { StatCard } from '@/components/shared/stat-card';
import { DocumentUploadModal } from './document-upload-modal';
import type { HRDocument, EmployeeProfile } from '@/types/hr.types';
import { toast } from 'sonner';
import {
  FileText,
  Download,
  Eye,
  FileCheck2,
  BookOpen,
  Lock,
  Plus,
} from 'lucide-react';

interface DocumentsCenterProps {
  initialDocuments: HRDocument[];
  employees?: EmployeeProfile[];
  canUpload?: boolean;
}

export function DocumentsCenter({
  initialDocuments,
  employees = [],
  canUpload = false,
}: DocumentsCenterProps) {
  const [documents, setDocuments] = useState<HRDocument[]>(initialDocuments);
  const [uploadMode, setUploadMode] = useState<'hr_document' | 'policy' | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<HRDocument | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const letters = documents.filter((d) => d.category === 'personal_letter');
  const policies = documents.filter((d) => d.category === 'company_policy');

  const handleSuccess = (doc: HRDocument) => {
    setDocuments((prev) => [doc, ...prev]);
    setUploadMode(null);
  };

  const handleDownload = (doc: HRDocument) => {
    if (doc.file_url) window.open(doc.file_url, '_blank');
    else toast.info('No file attached to this document.');
  };

  const columns: Column<HRDocument>[] = [
    {
      key: 'title',
      header: 'Document Name',
      render: (item) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
            <FileText className="h-4 w-4" />
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
      header: 'File Size',
      render: (item) => <span className="font-mono text-xs text-muted-foreground">{item.file_size}</span>,
    },
    {
      key: 'issue_date',
      header: 'Issue Date',
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
        <StatCard label="HR Documents" value={letters.length} hint="Contracts, NDAs & compliance" icon={FileCheck2} tone="primary" />
        <StatCard label="Company Policies" value={policies.length} hint="Handbooks, Code of Conduct & guidelines" icon={BookOpen} tone="accent" />
        <StatCard label="Access Control" value="Role-Gated" hint="Encrypted HR repository" icon={Lock} tone="success" />
      </div>

      {/* Header + actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">HR Document & Policy Center</h3>
          <p className="text-xs text-muted-foreground">Official HR records, compliance documents, and company policy handbooks.</p>
        </div>
        {canUpload && (
          <div className="flex gap-2 self-start sm:self-auto">
            <Button onClick={() => setUploadMode('hr_document')} className="gap-2 bg-primary hover:bg-primary/90 text-white">
              <Plus className="h-4 w-4" /> Upload HR Document
            </Button>
            <Button onClick={() => setUploadMode('policy')} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" /> Upload Policy
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="documents" className="space-y-4">
        <TabsList className="bg-muted/60 p-1 border border-border">
          <TabsTrigger value="documents" className="gap-2 text-xs font-semibold">
            <FileText className="h-4 w-4" /> HR Documents ({letters.length})
          </TabsTrigger>
          <TabsTrigger value="policies" className="gap-2 text-xs font-semibold">
            <BookOpen className="h-4 w-4" /> Policies & Guidelines ({policies.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="documents">
          <DataTable columns={columns} data={letters} emptyTitle="No HR documents uploaded" emptyDescription="Contracts, NDAs, and compliance documents will appear here." />
        </TabsContent>
        <TabsContent value="policies">
          <DataTable columns={columns} data={policies} emptyTitle="No policies published" emptyDescription="Company-wide guidelines and handbooks will appear here." />
        </TabsContent>
      </Tabs>

      {/* Preview modal */}
      {selectedDoc && (
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <div className="flex items-center gap-3 pb-4 border-b border-border">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{selectedDoc.title}</p>
                <p className="font-mono text-xs text-muted-foreground">{selectedDoc.file_name} • {selectedDoc.file_size} • {selectedDoc.version}</p>
              </div>
            </div>
            <div className="space-y-2 py-3 text-xs">
              {[
                ['Type', selectedDoc.document_type.replace(/_/g, ' ')],
                ['Category', selectedDoc.category.replace(/_/g, ' ')],
                ['Issue Date', selectedDoc.issue_date],
                ['Access', `${selectedDoc.access_role} authenticated`],
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

      {/* Shared upload modals */}
      <DocumentUploadModal
        open={uploadMode === 'hr_document'}
        onClose={() => setUploadMode(null)}
        onSuccess={handleSuccess}
        mode="hr_document"
        employees={employees}
      />
      <DocumentUploadModal
        open={uploadMode === 'policy'}
        onClose={() => setUploadMode(null)}
        onSuccess={handleSuccess}
        mode="policy"
      />
    </div>
  );
}
