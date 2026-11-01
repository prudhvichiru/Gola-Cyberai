'use client';

import * as React from 'react';
import { useState, useTransition, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { createBrowserClient } from '@supabase/ssr';
import type { HRDocument, EmployeeProfile } from '@/types/hr.types';
import {
  FileText,
  BookOpen,
  ShieldCheck,
  Upload,
  X,
  File,
  Calendar,
  User,
  ChevronDown,
  Loader2,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DocumentMode = 'letter' | 'hr_document' | 'policy';

export interface DocumentUploadModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (doc: HRDocument) => void;
  mode: DocumentMode;
  employees?: EmployeeProfile[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LETTER_TYPES = [
  { value: 'offer_letter',        label: 'Offer Letter' },
  { value: 'appointment_letter',  label: 'Appointment Letter' },
  { value: 'confirmation_letter', label: 'Confirmation Letter' },
  { value: 'promotion_letter',    label: 'Promotion Letter' },
  { value: 'transfer_letter',     label: 'Transfer Letter' },
  { value: 'experience_letter',   label: 'Experience Letter' },
  { value: 'relieving_letter',    label: 'Relieving Letter' },
  { value: 'warning_letter',      label: 'Warning Letter' },
  { value: 'other',               label: 'Other' },
];

const HR_DOC_TYPES = [
  { value: 'contract',            label: 'Employment Contract' },
  { value: 'nda',                 label: 'NDA & Confidentiality' },
  { value: 'performance_review',  label: 'Performance Review' },
  { value: 'disciplinary_notice', label: 'Disciplinary Notice' },
  { value: 'onboarding_doc',      label: 'Onboarding Document' },
  { value: 'compliance_doc',      label: 'Compliance Document' },
  { value: 'other',               label: 'Other' },
];

const POLICY_TYPES = [
  { value: 'handbook',            label: 'Employee Handbook' },
  { value: 'code_of_conduct',     label: 'Code of Conduct' },
  { value: 'remote_work',         label: 'Remote Work Policy' },
  { value: 'leave_policy',        label: 'Leave Policy' },
  { value: 'it_security',         label: 'IT & Security Policy' },
  { value: 'anti_harassment',     label: 'Anti-Harassment Policy' },
  { value: 'other',               label: 'Other' },
];

const MODE_CONFIG: Record<DocumentMode, {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  uploadLabel: string;
  docTypes: { value: string; label: string }[];
  category: 'personal_letter' | 'company_policy';
  showEmployee: boolean;
  sectionALabel: string;
  titlePlaceholder: string;
}> = {
  letter: {
    icon: FileText,
    iconBg: 'bg-blue-100 dark:bg-blue-900/40',
    iconColor: 'text-blue-600 dark:text-blue-400',
    title: 'Upload Employee Letter',
    subtitle: 'Upload, assign, and manage official employee documents securely.',
    uploadLabel: 'Upload & Publish',
    docTypes: LETTER_TYPES,
    category: 'personal_letter',
    showEmployee: true,
    sectionALabel: 'Letter Information',
    titlePlaceholder: 'e.g. Appointment Letter',
  },
  hr_document: {
    icon: ShieldCheck,
    iconBg: 'bg-purple-100 dark:bg-purple-900/40',
    iconColor: 'text-purple-600 dark:text-purple-400',
    title: 'Upload HR Document',
    subtitle: 'Upload and manage confidential HR records and compliance documents.',
    uploadLabel: 'Upload & Publish',
    docTypes: HR_DOC_TYPES,
    category: 'personal_letter',
    showEmployee: true,
    sectionALabel: 'Document Information',
    titlePlaceholder: 'e.g. Employment Contract – John Doe',
  },
  policy: {
    icon: BookOpen,
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    title: 'Upload Company Policy',
    subtitle: 'Publish and distribute official company policies and guidelines.',
    uploadLabel: 'Upload & Publish',
    docTypes: POLICY_TYPES,
    category: 'company_policy',
    showEmployee: false,
    sectionALabel: 'Policy Information',
    titlePlaceholder: 'e.g. Remote Work & Hybrid Workplace Policy',
  },
};

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_BYTES = 10 * 1024 * 1024;

interface Form {
  title: string;
  document_type: string;
  employee_id: string;
  issue_date: string;
  effective_date: string;
  expiry_date: string;
  version: string;
  description: string;
  visible_to_employee: boolean;
  status: 'draft' | 'published';
}

const defaultForm = (mode: DocumentMode): Form => ({
  title: '',
  document_type: MODE_CONFIG[mode].docTypes[0].value,
  employee_id: '',
  issue_date: new Date().toISOString().split('T')[0],
  effective_date: '',
  expiry_date: '',
  version: 'v1.0',
  description: '',
  visible_to_employee: true,
  status: 'draft',
});

// ─── Component ────────────────────────────────────────────────────────────────

export function DocumentUploadModal({
  open,
  onClose,
  onSuccess,
  mode,
  employees = [],
}: DocumentUploadModalProps) {
  const cfg = MODE_CONFIG[mode];
  const Icon = cfg.icon;

  const [form, setForm] = useState<Form>(() => defaultForm(mode));
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [formError, setFormError] = useState('');
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));

  const selectedEmp = employees.find((e) => e.id === form.employee_id);

  const validateFile = (f: File) => {
    if (!ACCEPTED_TYPES.includes(f.type)) return 'Only PDF, DOC, DOCX files are accepted.';
    if (f.size > MAX_BYTES) return 'File size must be under 10 MB.';
    return null;
  };

  const pickFile = (f: File) => {
    const err = validateFile(f);
    if (err) { toast.error(err); return; }
    setFile(f);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) pickFile(f);
  }, []);

  const handleClose = () => {
    if ((form.title || file) && !confirm('Discard unsaved changes?')) return;
    setForm(defaultForm(mode));
    setFile(null);
    setFormError('');
    setProgress(0);
    onClose();
  };

  const handleSubmit = (status: 'draft' | 'published') => {
    setFormError('');
    if (!form.title.trim())    { setFormError('Title is required.'); return; }
    if (cfg.showEmployee && !form.employee_id) { setFormError('Please select an employee.'); return; }
    if (!form.issue_date)      { setFormError('Issue Date is required.'); return; }
    if (status === 'published' && !file) { setFormError('Please upload a file before publishing.'); return; }

    startTransition(async () => {
      const sb = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );

      let fileUrl = '', fileName = '', fileSize = '';

      if (file) {
        setProgress(20);
        const path = `documents/${Date.now()}_${file.name}`;
        const buckets = ['hr-documents', 'chat-attachments'];
        let uploaded = false;

        for (const bucket of buckets) {
          const { error } = await sb.storage.from(bucket).upload(path, file, { upsert: false });
          if (!error) {
            const { data } = sb.storage.from(bucket).getPublicUrl(path);
            fileUrl = data.publicUrl;
            uploaded = true;
            break;
          }
        }

        if (!uploaded) { setFormError('File upload failed. Please try again.'); setProgress(0); return; }
        fileName = file.name;
        fileSize = file.size < 1024 * 1024
          ? `${Math.round(file.size / 1024)} KB`
          : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
        setProgress(70);
      }

      const payload = {
        user_id: form.employee_id || null,
        title: form.title.trim(),
        document_type: form.document_type,
        category: cfg.category,
        version: form.version || 'v1.0',
        issue_date: form.issue_date,
        file_name: fileName || `${form.title.trim().replace(/\s+/g, '_')}.pdf`,
        file_size: fileSize || '—',
        file_url: fileUrl || null,
        access_role: 'hr' as const,
        description: form.description || null,
        effective_date: form.effective_date || null,
        expiry_date: form.expiry_date || null,
        visible_to_employee: cfg.showEmployee ? form.visible_to_employee : false,
        status,
      };

      const { data, error } = await sb.from('hr_documents').insert(payload).select('*').single();
      setProgress(0);

      if (error) {
        setFormError(error.message || 'Failed to save document.');
        return;
      }

      onSuccess(data as HRDocument);
      setForm(defaultForm(mode));
      setFile(null);
      toast.success(
        status === 'published'
          ? `"${form.title}" published successfully!`
          : `"${form.title}" saved as draft.`
      );
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-[680px] p-0 gap-0 flex flex-col max-h-[92vh]">

        {/* ── Header ── */}
        <div className="flex items-start gap-4 px-7 pt-6 pb-4 flex-shrink-0 border-b border-border">
          <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${cfg.iconBg}`}>
            <Icon className={`h-5 w-5 ${cfg.iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-foreground">{cfg.title}</h2>
            <p className="text-sm text-muted-foreground">{cfg.subtitle}</p>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-7 py-5 space-y-6">

          {/* Section A */}
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              A. {cfg.sectionALabel}
            </p>

            {/* Title + Type */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  {mode === 'letter' ? 'Letter' : mode === 'policy' ? 'Policy' : 'Document'} Title{' '}
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder={cfg.titlePlaceholder}
                  value={form.title}
                  onChange={(e) => set({ title: e.target.value })}
                  className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  {mode === 'letter' ? 'Letter' : mode === 'policy' ? 'Policy' : 'Document'} Type{' '}
                  <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background pl-3 pr-8 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={form.document_type}
                    onChange={(e) => set({ document_type: e.target.value })}
                  >
                    {cfg.docTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Employee + Department (letter & hr_document only) */}
            {cfg.showEmployee && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    Employee <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative flex items-center rounded-md border border-input bg-background focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                    <User className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <select
                      className="w-full h-10 bg-transparent pl-9 pr-8 text-sm appearance-none focus:outline-none"
                      value={form.employee_id}
                      onChange={(e) => set({ employee_id: e.target.value })}
                    >
                      <option value="">Select Employee</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.full_name} ({emp.employee_id || emp.id.slice(0, 6).toUpperCase()})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Department</Label>
                  <Input
                    value={selectedEmp?.department_id ? 'HR & Admin' : ''}
                    placeholder="Auto-populated from employee"
                    readOnly
                    className="bg-muted/40 text-muted-foreground cursor-default"
                  />
                </div>
              </div>
            )}

            {/* Dates */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Issue Date', key: 'issue_date', required: true },
                { label: 'Effective Date', key: 'effective_date', required: false },
                { label: 'Expiry Date', key: 'expiry_date', required: false },
              ].map(({ label, key, required }) => (
                <div key={key} className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    {label} {required && <span className="text-red-500">*</span>}
                  </Label>
                  <div className="relative flex items-center">
                    <Calendar className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type="date"
                      value={(form as any)[key]}
                      onChange={(e) => set({ [key]: e.target.value } as any)}
                      className="pl-9 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Version + Description */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Version</Label>
                <Input
                  placeholder="v1.0"
                  value={form.version}
                  onChange={(e) => set({ version: e.target.value })}
                  className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-sm font-medium">Description / Notes</Label>
                <textarea
                  rows={2}
                  placeholder="Optional notes about this document…"
                  value={form.description}
                  onChange={(e) => set({ description: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section B: Upload File */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">B. Upload File</p>

            {file ? (
              <div className="flex items-center gap-3 p-4 rounded-xl border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/30">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/40">
                  <File className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {file.type.includes('pdf') ? 'PDF' : 'DOC/DOCX'} •{' '}
                    {file.size < 1024 * 1024
                      ? `${Math.round(file.size / 1024)} KB`
                      : `${(file.size / (1024 * 1024)).toFixed(1)} MB`}
                  </p>
                  {progress > 0 && progress < 100 && (
                    <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  )}
                </div>
                <button type="button" onClick={() => setFile(null)} className="p-1.5 rounded-full hover:bg-muted transition-colors flex-shrink-0">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            ) : (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 cursor-pointer transition-colors ${
                  isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : 'border-border hover:border-blue-400 hover:bg-muted/30'
                }`}
              >
                <Upload className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">Drag and drop your document here</p>
                <p className="text-xs text-muted-foreground">
                  or <span className="text-blue-600 dark:text-blue-400 font-medium">browse files</span>
                </p>
                <p className="text-xs text-muted-foreground">Assigned formats: PDF, DOC, DOCX &nbsp;•&nbsp; Max size 10 MB</p>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); e.target.value = ''; }}
            />
          </div>

          {/* Section C: Document Access */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">C. Document Access</p>
            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
              {/* Status */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Document Status <span className="text-red-500">*</span></p>
                  <p className="text-xs text-muted-foreground">Draft saves without publishing; Published makes it available.</p>
                </div>
                <div className="relative">
                  <select
                    className="h-9 rounded-md border border-input bg-background pl-3 pr-8 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={form.status}
                    onChange={(e) => set({ status: e.target.value as 'draft' | 'published' })}
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              {/* Visible to employee — only for letter / hr_document */}
              {cfg.showEmployee && (
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Visible to Employee</p>
                    <p className="text-xs text-muted-foreground">Allow the assigned employee to view this document.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => set({ visible_to_employee: !form.visible_to_employee })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      form.visible_to_employee ? 'bg-blue-600' : 'bg-muted-foreground/30'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      form.visible_to_employee ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {formError && (
            <p className="text-sm text-red-500 font-medium">{formError}</p>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-end gap-3 px-7 py-4 border-t border-border flex-shrink-0">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isPending} className="px-5">
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSubmit('draft')}
            disabled={isPending}
            className="gap-2 px-5 border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/40"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save as Draft
          </Button>
          <Button
            type="button"
            onClick={() => handleSubmit('published')}
            disabled={isPending}
            className="gap-2 px-5 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {cfg.uploadLabel}
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
