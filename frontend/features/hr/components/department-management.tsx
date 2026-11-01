'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StatCard } from '@/components/shared/stat-card';
import { HRClientService } from '@/services/hr.service';
import type { DepartmentItem, DesignationItem, EmployeeProfile } from '@/types/hr.types';
import { toast } from 'sonner';
import {
  Building2,
  Briefcase,
  Plus,
  Users,
  Shield,
  Layers,
  CheckCircle2,
} from 'lucide-react';

interface DepartmentManagementProps {
  initialDepartments: DepartmentItem[];
  initialDesignations: DesignationItem[];
  employees: EmployeeProfile[];
  canManage?: boolean;
}

export function DepartmentManagement({
  initialDepartments,
  initialDesignations,
  employees,
  canManage = true,
}: DepartmentManagementProps) {
  const [departments, setDepartments] = useState<DepartmentItem[]>(initialDepartments);
  const [designations, setDesignations] = useState<DesignationItem[]>(initialDesignations);

  const [isAddDeptOpen, setIsAddDeptOpen] = useState(false);
  const [isAddDesigOpen, setIsAddDesigOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [deptForm, setDeptForm] = useState({
    name: '',
    description: '',
    head_id: '',
  });

  const [desigForm, setDesigForm] = useState({
    title: '',
    department_id: departments[0]?.id || '',
  });

  const handleCreateDept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptForm.name) {
      toast.error('Please enter department name');
      return;
    }

    startTransition(async () => {
      const res = await HRClientService.createDepartment(deptForm);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      if (res.data?.data) {
        setDepartments([...departments, { ...res.data.data, employee_count: 0, designations: [] }]);
        setIsAddDeptOpen(false);
        setDeptForm({ name: '', description: '', head_id: '' });
        toast.success(`Department "${res.data.data.name}" established!`);
      }
    });
  };

  const handleCreateDesig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desigForm.title || !desigForm.department_id) {
      toast.error('Please enter designation title and select department');
      return;
    }

    startTransition(async () => {
      const res = await HRClientService.createDesignation(desigForm);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      if (res.data?.data) {
        setDesignations([...designations, res.data.data]);
        setIsAddDesigOpen(false);
        setDesigForm({ title: '', department_id: departments[0]?.id || '' });
        toast.success(`Designation "${res.data.data.title}" created!`);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Departments"
          value={departments.length}
          hint="Operational divisions"
          icon={Building2}
          tone="primary"
        />
        <StatCard
          label="Designation Roles"
          value={designations.length}
          hint="Career ladders"
          icon={Briefcase}
          tone="accent"
        />
        <StatCard
          label="Total Staff Mapped"
          value={employees.length}
          hint="100% assigned"
          icon={Users}
          tone="success"
        />
      </div>

      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">Organizational Structure</h3>
          <p className="text-xs text-muted-foreground">
            Manage functional departments, department heads, and designated job roles.
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddDesigOpen(true)}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Add Designation</span>
            </Button>
            <Button
              size="sm"
              onClick={() => setIsAddDeptOpen(true)}
              className="gap-1.5 bg-primary hover:bg-primary-hover text-white"
            >
              <Plus className="h-4 w-4" />
              <span>Add Department</span>
            </Button>
          </div>
        )}
      </div>

      {/* Departments Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {departments.map((dept) => {
          const deptDesignations = designations.filter((d) => d.department_id === dept.id);
          const deptMembers = employees.filter((e) => e.department_id === dept.id);

          return (
            <Card key={dept.id} className="border-border hover:border-primary/40 transition-all shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold">{dept.name}</CardTitle>
                      <CardDescription className="text-xs">
                        Head: {dept.head?.full_name || 'Executive Staff'}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">
                    {deptMembers.length} {deptMembers.length === 1 ? 'member' : 'members'}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 pt-0">
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {dept.description || 'Core organizational business division.'}
                </p>

                <div className="space-y-1.5 pt-2 border-t border-border/50">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Active Roles ({deptDesignations.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {deptDesignations.length === 0 ? (
                      <span className="text-xs text-muted-foreground italic">No roles mapped</span>
                    ) : (
                      deptDesignations.map((desig) => (
                        <span
                          key={desig.id}
                          className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[11px] text-foreground font-medium border border-border"
                        >
                          {desig.title}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add Department Modal */}
      <Dialog open={isAddDeptOpen} onOpenChange={setIsAddDeptOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <form onSubmit={handleCreateDept}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Add New Department
              </DialogTitle>
              <DialogDescription>
                Create a functional operational department in Gola CyberAI.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="dept-name">Department Name *</Label>
                <Input
                  id="dept-name"
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  placeholder="e.g. Artificial Intelligence & Labs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dept-desc">Description</Label>
                <Input
                  id="dept-desc"
                  value={deptForm.description}
                  onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                  placeholder="Mandate and primary responsibilities"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dept-head">Department Head (Manager)</Label>
                <select
                  id="dept-head"
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  value={deptForm.head_id}
                  onChange={(e) => setDeptForm({ ...deptForm, head_id: e.target.value })}
                >
                  <option value="">Select Department Head</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.full_name} ({e.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddDeptOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="bg-primary hover:bg-primary-hover text-white">
                {isPending ? 'Creating…' : 'Create Department'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Designation Modal */}
      <Dialog open={isAddDesigOpen} onOpenChange={setIsAddDesigOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <form onSubmit={handleCreateDesig}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                Add Designation Role
              </DialogTitle>
              <DialogDescription>
                Define a specific job title within a department.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="desig-title">Job Title / Designation *</Label>
                <Input
                  id="desig-title"
                  value={desigForm.title}
                  onChange={(e) => setDesigForm({ ...desigForm, title: e.target.value })}
                  placeholder="e.g. Lead Threat Analyst"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="desig-dept">Department *</Label>
                <select
                  id="desig-dept"
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  value={desigForm.department_id}
                  onChange={(e) => setDesigForm({ ...desigForm, department_id: e.target.value })}
                  required
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddDesigOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="bg-primary hover:bg-primary-hover text-white">
                {isPending ? 'Creating…' : 'Create Designation'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
