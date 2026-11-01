'use client';

import * as React from 'react';
import { useState, useTransition, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { DataTable, type Column } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { StatCard } from '@/components/shared/stat-card';
import { HRClientService } from '@/services/hr.service';
import type { EmployeeProfile, DepartmentItem, DesignationItem } from '@/types/hr.types';
import type { UserRole } from '@/constants/roles';
import { toast } from 'sonner';
import {
  Users,
  Search,
  Filter,
  UserPlus,
  Mail,
  Phone,
  Building2,
  Briefcase,
  MoreVertical,
  Eye,
  EyeOff,
  Key,
  Edit2,
  CheckCircle2,
  Shield,
  Calendar,
} from 'lucide-react';

interface EmployeeDirectoryProps {
  initialEmployees: EmployeeProfile[];
  departments: DepartmentItem[];
  designations: DesignationItem[];
  userRole?: UserRole;
}

export function EmployeeDirectory({
  initialEmployees,
  departments,
  designations,
  userRole = 'hr',
}: EmployeeDirectoryProps) {
  const [employees, setEmployees] = useState<EmployeeProfile[]>(initialEmployees);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeProfile | null>(null);
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [showPassword, setShowPassword] = useState(false);

  // Add Employee Form State - defaults empty so user explicitly selects options
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role: 'employee' as UserRole,
    department_id: '',
    designation_id: '',
    phone: '',
    emergency_contact: '',
    hired_at: new Date().toISOString().split('T')[0],
  });

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pass = 'Gola@';
    for (let i = 0; i < 5; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, password: pass }));
    setShowPassword(true);
    toast.info('Secure temporary password generated.');
  };

  // Filter designations matching the chosen department if selected
  const availableDesignations = useMemo(() => {
    if (!formData.department_id) return designations;
    return designations.filter((d) => d.department_id === formData.department_id);
  }, [designations, formData.department_id]);

  const canManage = userRole === 'hr' || userRole === 'admin';

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !search ||
        emp.full_name.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q) ||
        emp.employee_id.toLowerCase().includes(q);

      const matchesDept = selectedDept === 'all' || emp.department_id === selectedDept;
      const matchesRole = selectedRole === 'all' || emp.role === selectedRole;
      const matchesStatus = selectedStatus === 'all' || emp.status === selectedStatus;

      return matchesSearch && matchesDept && matchesRole && matchesStatus;
    });
  }, [employees, search, selectedDept, selectedRole, selectedStatus]);

  // Statistics
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter((e) => e.status === 'active').length;
  const totalDepts = departments.length;
  const leadershipCount = employees.filter((e) => e.role === 'manager' || e.role === 'admin').length;

  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.first_name || !formData.last_name || !formData.email) {
      toast.error('Please enter first name, last name, and work email');
      return;
    }
    if (!formData.password || formData.password.length < 6) {
      toast.error('Please provide or generate an account password of at least 6 characters');
      return;
    }

    startTransition(async () => {
      const res = await HRClientService.createEmployee(formData);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      if (res.data?.data) {
        setEmployees([res.data.data, ...employees]);
        setIsAddModalOpen(false);
        setFormData({
          first_name: '',
          last_name: '',
          email: '',
          password: '',
          role: 'employee',
          department_id: '',
          designation_id: '',
          phone: '',
          emergency_contact: '',
          hired_at: new Date().toISOString().split('T')[0],
        });
        toast.success(
          `Employee ${res.data.data.full_name} registered (${res.data.data.employee_id})! Credentials & welcome email sent to ${formData.email}.`,
          { duration: 6000 }
        );
      }
    });
  };

  const handleUpdateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    startTransition(async () => {
      const res = await HRClientService.updateEmployee(selectedEmployee.id, selectedEmployee);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setEmployees(employees.map((e) => (e.id === selectedEmployee.id ? (res.data?.data || selectedEmployee) : e)));
      setIsEditModalOpen(false);
      toast.success('Employee records updated successfully!');
    });
  };

  const columns: Column<EmployeeProfile>[] = [
    {
      key: 'employee',
      header: 'Employee Details',
      render: (item) => {
        const initials = item.first_name && item.last_name
          ? `${item.first_name[0]}${item.last_name[0]}`.toUpperCase()
          : item.full_name
          ? item.full_name.slice(0, 2).toUpperCase()
          : 'U';

        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border border-border">
              <AvatarImage src={item.avatar_url ?? undefined} alt={item.full_name} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-foreground truncate">{item.full_name}</span>
                <span className="font-mono text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {item.employee_id}
                </span>
              </div>
              <span className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                <Mail className="h-3 w-3" />
                {item.email}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'department',
      header: 'Department & Role',
      render: (item) => (
        <div>
          <p className="text-sm font-medium text-foreground">{item.department?.name || 'General'}</p>
          <p className="text-xs text-muted-foreground">{item.designation?.title || 'Staff'}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'System Access',
      render: (item) => <StatusBadge role={item.role} />,
    },
    {
      key: 'manager',
      header: 'Reporting Manager',
      render: (item) => (
        <span className="text-xs text-foreground/80 font-medium">
          {item.manager?.full_name || '—'}
        </span>
      ),
    },
    {
      key: 'hired_at',
      header: 'Joining Date',
      render: (item) => (
        <span className="font-mono text-xs text-muted-foreground">
          {item.hired_at ? new Date(item.hired_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (item) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem
              onClick={() => {
                setSelectedEmployee(item);
                setIsDossierOpen(true);
              }}
              className="gap-2 cursor-pointer"
            >
              <Eye className="h-4 w-4 text-primary" />
              <span>View Dossier</span>
            </DropdownMenuItem>

            {canManage && (
              <DropdownMenuItem
                onClick={() => {
                  setSelectedEmployee(item);
                  setIsEditModalOpen(true);
                }}
                className="gap-2 cursor-pointer"
              >
                <Edit2 className="h-4 w-4 text-amber-500" />
                <span>Edit Record</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Metric Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Headcount"
          value={totalEmployees}
          hint="Registered employees"
          icon={Users}
          tone="primary"
        />
        <StatCard
          label="Active Status"
          value={activeEmployees}
          hint="Payroll active"
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard
          label="Departments"
          value={totalDepts}
          hint="Functional teams"
          icon={Building2}
          tone="accent"
        />
        <StatCard
          label="Leadership & HR"
          value={leadershipCount}
          hint="Managers & Administrators"
          icon={Shield}
          tone="neutral"
        />
      </div>

      {/* 2. Search & Filter Bar */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or employee ID (e.g. GCA-1001)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10"
              />
            </div>

            {/* Filter Dropdowns & Add Button */}
            <div className="flex flex-wrap items-center gap-2.5">
              <select
                aria-label="Filter by department"
                className="h-10 rounded-lg border border-input bg-background px-3 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring"
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
              >
                <option value="all">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter by system access role"
                className="h-10 rounded-lg border border-input bg-background px-3 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
              >
                <option value="all">All Roles</option>
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="hr">HR Specialist</option>
                <option value="admin">Administrator</option>
              </select>

              <select
                aria-label="Filter by employment status"
                className="h-10 rounded-lg border border-input bg-background px-3 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              {canManage && (
                <Button
                  onClick={() => setIsAddModalOpen(true)}
                  className="h-10 gap-2 bg-primary hover:bg-primary-hover text-white px-4"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Add Employee</span>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Employee Directory DataTable */}
      <DataTable
        columns={columns}
        data={filteredEmployees}
        emptyTitle="No employee records found"
        emptyDescription="Try adjusting your search criteria or register a new team member."
      />

      {/* 4. Add Employee Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <form onSubmit={handleCreateEmployee}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Register New Employee
              </DialogTitle>
              <DialogDescription>
                Create a verified enterprise employee record. Unique ID will be assigned automatically.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  placeholder="e.g. Ramesh"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  placeholder="e.g. Rao"
                  required
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="email">Work Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="name@company.com"
                  required
                />
              </div>

              {/* Password Field with Show/Hide and Auto-Generate */}
              <div className="space-y-1.5 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Account Password *</Label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 transition-colors"
                  >
                    <Key className="h-3 w-3" />
                    <span>Auto-generate Password</span>
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Set temporary password (min 6 characters)"
                    className="pr-10 font-mono text-xs"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Credentials and congratulations will be emailed to the employee upon registration.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="department">Department</Label>
                <select
                  id="department"
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  value={formData.department_id}
                  onChange={(e) => {
                    const deptId = e.target.value;
                    setFormData({
                      ...formData,
                      department_id: deptId,
                      designation_id: '', // Reset designation when department changes
                    });
                  }}
                >
                  <option value="">-- Select Department --</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="designation">Designation</Label>
                <select
                  id="designation"
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  value={formData.designation_id}
                  onChange={(e) => setFormData({ ...formData, designation_id: e.target.value })}
                >
                  <option value="">-- Select Designation --</option>
                  {availableDesignations.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="role">Role Permission</Label>
                <select
                  id="role"
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="hr">HR Specialist</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 98450 00000"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="hired_at">Joining Date</Label>
                <Input
                  id="hired_at"
                  type="date"
                  value={formData.hired_at}
                  onChange={(e) => setFormData({ ...formData, hired_at: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="emergency">Emergency Contact</Label>
                <Input
                  id="emergency"
                  value={formData.emergency_contact}
                  onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                  placeholder="Spouse / Parent (+91...)"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="bg-primary hover:bg-primary-hover text-white">
                {isPending ? 'Registering…' : 'Register Employee'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 5. View Employee Dossier Modal */}
      {selectedEmployee && (
        <Dialog open={isDossierOpen} onOpenChange={setIsDossierOpen}>
          <DialogContent className="sm:max-w-[540px]">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border border-border">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {selectedEmployee.full_name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <DialogTitle className="text-lg">{selectedEmployee.full_name}</DialogTitle>
                  <DialogDescription className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-xs font-semibold">{selectedEmployee.employee_id}</span>
                    <span>•</span>
                    <StatusBadge role={selectedEmployee.role} />
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-3 text-sm">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-muted/40 border border-border/60">
                <div>
                  <span className="text-xs text-muted-foreground">Department</span>
                  <p className="font-semibold">{selectedEmployee.department?.name || 'General'}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Designation</span>
                  <p className="font-semibold">{selectedEmployee.designation?.title || 'Staff'}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Reporting Manager</span>
                  <p className="font-semibold">{selectedEmployee.manager?.full_name || 'Self / Executive'}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Employment Status</span>
                  <p className="font-semibold capitalize">{selectedEmployee.status}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Contact & Identification
                </h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Corporate Email</span>
                    <span className="font-mono font-medium">{selectedEmployee.email}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Direct Phone</span>
                    <span className="font-mono font-medium">{selectedEmployee.phone || 'Not recorded'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Joining Date</span>
                    <span className="font-mono font-medium">{selectedEmployee.hired_at || '—'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Emergency Contact</span>
                    <span className="font-medium">{selectedEmployee.emergency_contact || 'None registered'}</span>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => setIsDossierOpen(false)}>Close Dossier</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* 6. Edit Employee Modal */}
      {selectedEmployee && canManage && (
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleUpdateEmployee}>
              <DialogHeader>
                <DialogTitle>Edit Employee: {selectedEmployee.full_name}</DialogTitle>
                <DialogDescription>Modify verified departmental and contact information.</DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-3">
                <div className="space-y-1">
                  <Label htmlFor="edit-dept">Department</Label>
                  <select
                    id="edit-dept"
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    value={selectedEmployee.department_id || ''}
                    onChange={(e) =>
                      setSelectedEmployee({ ...selectedEmployee, department_id: e.target.value })
                    }
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="edit-role">System Role</Label>
                  <select
                    id="edit-role"
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    value={selectedEmployee.role}
                    onChange={(e) =>
                      setSelectedEmployee({ ...selectedEmployee, role: e.target.value as UserRole })
                    }
                  >
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="hr">HR Specialist</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    value={selectedEmployee.phone || ''}
                    onChange={(e) =>
                      setSelectedEmployee({ ...selectedEmployee, phone: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="edit-status">Status</Label>
                  <select
                    id="edit-status"
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    value={selectedEmployee.status}
                    onChange={(e) =>
                      setSelectedEmployee({ ...selectedEmployee, status: e.target.value as any })
                    }
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Saving…' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
