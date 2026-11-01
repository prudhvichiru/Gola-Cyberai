'use client';

import React, { useState, useEffect } from 'react';
import { ClientRecord } from '@/types/client.types';
import { ClientFrontendService } from '@/services/client.service';
import { HRClientService } from '@/services/hr.service';
import { EmployeeProfile } from '@/types/hr.types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { StatCard } from '@/components/shared/stat-card';
import {
  Briefcase,
  Building,
  Mail,
  Phone,
  DollarSign,
  Plus,
  Search,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers,
  Edit2,
  UserCheck,
} from 'lucide-react';

export function ClientList() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [employees, setEmployees] = useState<{ id: string; full_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // New Client Form
  const [createForm, setCreateForm] = useState({
    name: '',
    code: '',
    contact_person: '',
    email: '',
    phone: '',
    industry: 'Cybersecurity & Defense',
    status: 'active' as 'active' | 'prospect' | 'inactive',
    billing_currency: 'INR',
    assigned_employee_id: 'emp-1',
  });

  // Edit Client Form
  const [editForm, setEditForm] = useState({
    name: '',
    code: '',
    contact_person: '',
    email: '',
    phone: '',
    industry: 'Cybersecurity & Defense',
    status: 'active' as 'active' | 'prospect' | 'inactive',
    billing_currency: 'INR',
    assigned_employee_id: 'emp-1',
  });

  const loadClients = async () => {
    try {
      setLoading(true);
      const res = await ClientFrontendService.getClients({
        status: statusFilter,
        search,
      });
      if (res.data) setClients(res.data);
    } catch (err) {
      console.error('Failed to load clients:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
    async function loadEmp() {
      try {
        const emps = await HRClientService.getEmployees();
        if (emps && emps.length > 0) {
          setEmployees(emps.map((e) => ({ id: e.id, full_name: e.full_name })));
        }
      } catch (err) {
        console.error('Failed to load employees for client assignment:', err);
      }
    }
    loadEmp();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadClients();
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name) return;
    try {
      setSubmitting(true);
      const selectedEmp = employees.find((e) => e.id === createForm.assigned_employee_id);
      await ClientFrontendService.createClient({
        ...createForm,
        assigned_employee_name: selectedEmp ? selectedEmp.full_name : '',
      });
      setIsCreateOpen(false);
      setCreateForm({
        name: '',
        code: '',
        contact_person: '',
        email: '',
        phone: '',
        industry: 'Cybersecurity & Defense',
        status: 'active',
        billing_currency: 'INR',
        assigned_employee_id: '',
      });
      await loadClients();
    } catch (err: any) {
      alert(err.message || 'Error creating client');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (client: ClientRecord) => {
    setEditingClient(client);
    setEditForm({
      name: client.name,
      code: client.code,
      contact_person: client.contact_person,
      email: client.email,
      phone: client.phone || '',
      industry: client.industry,
      status: client.status,
      billing_currency: client.billing_currency,
      assigned_employee_id: client.assigned_employee_id || 'emp-1',
    });
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient || !editForm.name) return;
    try {
      setSubmitting(true);
      const selectedEmp = employees.find((e) => e.id === editForm.assigned_employee_id);
      await ClientFrontendService.updateClient(editingClient.id, {
        ...editForm,
        assigned_employee_name: selectedEmp ? selectedEmp.full_name : editingClient.assigned_employee_name,
      });
      setEditingClient(null);
      await loadClients();
    } catch (err: any) {
      alert(err.message || 'Error updating client');
    } finally {
      setSubmitting(false);
    }
  };

  const totalBilled = clients.reduce((acc, c) => acc + (c.total_billed || 0), 0);
  const totalProjects = clients.reduce((acc, c) => acc + (c.active_projects_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Clients"
          value={clients.length}
          hint="Enterprise accounts"
          icon={<Building className="h-5 w-5" />}
          tone="primary"
        />
        <StatCard
          label="Active Engagements"
          value={clients.filter((c) => c.status === 'active').length}
          hint="Retainer & ongoing"
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label="Linked Projects"
          value={totalProjects}
          hint="Across all delivery teams"
          icon={<Layers className="h-5 w-5" />}
          tone="info"
        />
        <StatCard
          label="Cumulative Billed"
          value={`₹${(totalBilled / 100000).toFixed(1)}L`}
          hint="Current fiscal year"
          icon={<DollarSign className="h-5 w-5" />}
          tone="warning"
        />
      </div>

      {/* Control Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search clients by name, code, contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card"
          />
        </form>

        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-border bg-card p-1">
            {['all', 'active', 'prospect', 'inactive'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 text-xs font-medium rounded capitalize transition-colors ${
                  statusFilter === st
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            <span>Add Client</span>
          </Button>
        </div>
      </div>

      {/* Clients Grid */}
      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">
          Loading corporate clients...
        </div>
      ) : clients.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="h-6 w-6" />}
          title="No clients found"
          description="Create your first client account to connect projects, telemetry, and contracts."
          action={{
            label: 'Add Client',
            onClick: () => setIsCreateOpen(true),
          }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Card key={client.id} className="border-border shadow-sm hover:shadow transition-shadow flex flex-col justify-between">
              <div>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        {client.name}
                      </CardTitle>
                      <CardDescription className="text-xs font-mono mt-0.5">
                        {client.code} • {client.industry}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={
                        client.status === 'active'
                          ? 'default'
                          : client.status === 'prospect'
                          ? 'secondary'
                          : 'outline'
                      }
                      className="capitalize text-xs"
                    >
                      {client.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="rounded-md bg-muted/40 p-2.5 space-y-1.5 text-xs">
                    <div className="flex items-center gap-2 text-foreground font-medium">
                      <span className="text-muted-foreground">Contact:</span> {client.contact_person}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      <span>{client.email}</span>
                    </div>
                    {client.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Assigned Account Lead Employee */}
                  <div className="rounded-md border border-primary/20 bg-primary/5 p-2 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-3.5 w-3.5 text-primary" />
                      <div>
                        <span className="text-muted-foreground text-[10px] block">Assigned Account Lead:</span>
                        <span className="font-semibold text-foreground">
                          {client.assigned_employee_name || 'Unassigned'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border text-xs">
                    <div>
                      <span className="text-muted-foreground">Active Projects: </span>
                      <span className="font-bold text-foreground">{client.active_projects_count}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Billed: </span>
                      <span className="font-bold text-foreground">
                        ₹{(client.total_billed / 100000).toFixed(1)}L
                      </span>
                    </div>
                  </div>
                </CardContent>
              </div>

              {/* Card Footer with Edit Action */}
              <div className="px-6 pb-4 pt-1 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditModal(client)}
                  className="h-8 gap-1.5 text-xs border-border hover:bg-muted"
                >
                  <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Edit Client</span>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Client Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Corporate Client</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateClient} className="space-y-3 py-1">
            <div>
              <label className="text-xs font-semibold text-foreground">Client Organization Name *</label>
              <Input
                required
                placeholder="e.g. Apex Defense Solutions"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                className="mt-1 h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground">Client Code</label>
                <Input
                  placeholder="e.g. APEX-DEF"
                  value={createForm.code}
                  onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })}
                  className="mt-1 h-9 text-xs font-mono uppercase"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground">Industry</label>
                <Input
                  placeholder="e.g. Defense, Fintech"
                  value={createForm.industry}
                  onChange={(e) => setCreateForm({ ...createForm, industry: e.target.value })}
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            {/* Assigned Account Lead Employee Dropdown */}
            <div>
              <label className="text-xs font-semibold text-foreground">Assigned Internal Lead (Employee) *</label>
              <select
                value={createForm.assigned_employee_id}
                onChange={(e) => setCreateForm({ ...createForm, assigned_employee_id: e.target.value })}
                className="mt-1 h-9 w-full rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground">Primary Contact Person</label>
              <Input
                placeholder="e.g. Major Vikram Rao"
                value={createForm.contact_person}
                onChange={(e) => setCreateForm({ ...createForm, contact_person: e.target.value })}
                className="mt-1 h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground">Contact Email</label>
                <Input
                  type="email"
                  placeholder="contact@company.com"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="mt-1 h-9 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground">Contact Phone</label>
                <Input
                  placeholder="+91 98765 43210"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={submitting}>
                {submitting ? 'Creating...' : 'Register Client'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Client Modal */}
      {editingClient && (
        <Dialog open={!!editingClient} onOpenChange={() => setEditingClient(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Client Details</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleUpdateClient} className="space-y-3 py-1">
              <div>
                <label className="text-xs font-semibold text-foreground">Client Organization Name *</label>
                <Input
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="mt-1 h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground">Client Code</label>
                  <Input
                    value={editForm.code}
                    onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                    className="mt-1 h-9 text-xs font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                    className="mt-1 h-9 w-full rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary capitalize"
                  >
                    <option value="active">Active</option>
                    <option value="prospect">Prospect</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground">Industry</label>
                  <Input
                    value={editForm.industry}
                    onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })}
                    className="mt-1 h-9 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground">Assigned Internal Lead (Employee)</label>
                  <select
                    value={editForm.assigned_employee_id}
                    onChange={(e) => setEditForm({ ...editForm, assigned_employee_id: e.target.value })}
                    className="mt-1 h-9 w-full rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Primary Contact Person</label>
                <Input
                  value={editForm.contact_person}
                  onChange={(e) => setEditForm({ ...editForm, contact_person: e.target.value })}
                  className="mt-1 h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground">Contact Email</label>
                  <Input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="mt-1 h-9 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground">Contact Phone</label>
                  <Input
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="mt-1 h-9 text-xs"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingClient(null)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
