'use client';
import { useState, useEffect } from 'react';
import { 
  Users, 
  Database, 
  Trash2, 
  Search, 
  RefreshCw, 
  Eye, 
  FolderOpen, 
  HardDrive, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  ShieldAlert, 
  X,
  FileText
} from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatBytes, formatLatency } from '@/lib/utils';
import { toast } from 'sonner';

export default function TenantsPage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Inspect Modal
  const [inspectUser, setInspectUser] = useState<string | null>(null);
  const [tenantDetails, setTenantDetails] = useState<any | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  // Delete Modal
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const data = await api.getTenants();
      setTenants(data || []);
    } catch (err: any) {
      toast.error('Failed to load tenants data from cluster');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleInspect = async (username: string) => {
    setInspectUser(username);
    setInspectLoading(true);
    try {
      const details = await api.getTenantDetails(username);
      setTenantDetails(details);
    } catch (err: any) {
      toast.error(`Failed to inspect tenant data for ${username}`);
    } finally {
      setInspectLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteTenant(deleteTarget);
      toast.success(`Tenant ${deleteTarget} and isolated database schema purged.`);
      setDeleteTarget(null);
      fetchTenants();
    } catch (err: any) {
      toast.error(`Delete failed: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const filteredTenants = tenants.filter(
    (t) =>
      t.username.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase()) ||
      (t.use_case || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalTables = tenants.reduce((acc, t) => acc + (t.table_count || 0), 0);
  const totalDbBytes = tenants.reduce((acc, t) => acc + (t.db_bytes || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Tenants & User Data Management</h1>
          <p className="text-sm text-muted-foreground">
            Super-admin oversight: view what developers have stored, why they are using your cluster, and manage accounts.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={fetchTenants} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-4">
          <span className="text-xs font-medium text-muted-foreground uppercase">Total Registered Developers</span>
          <div className="mt-2 text-2xl font-bold text-foreground">{tenants.length}</div>
          <p className="mt-1 text-xs text-emerald-500">Active Tenants</p>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <span className="text-xs font-medium text-muted-foreground uppercase">Isolated DB Schemas</span>
          <div className="mt-2 text-2xl font-bold text-foreground">{tenants.length}</div>
          <p className="mt-1 text-xs text-blue-500">PostgreSQL Schema Isolation</p>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <span className="text-xs font-medium text-muted-foreground uppercase">Total User Tables</span>
          <div className="mt-2 text-2xl font-bold text-foreground">{totalTables}</div>
          <p className="mt-1 text-xs text-purple-500">Across All Schemas</p>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <span className="text-xs font-medium text-muted-foreground uppercase">Storage & DB Size</span>
          <div className="mt-2 text-2xl font-bold text-foreground">{formatBytes(totalDbBytes)}</div>
          <p className="mt-1 text-xs text-emerald-500">Neon Cloud Storage</p>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between border-b p-4 gap-3 bg-muted/20">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Registered Users ({tenants.length})</span>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search user, email, or purpose..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-64 pl-8 text-xs"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b bg-muted/40 text-muted-foreground font-mono uppercase">
              <tr>
                <th className="p-4">Developer</th>
                <th className="p-4">Isolated Schema</th>
                <th className="p-4">Tables / DB Size</th>
                <th className="p-4">Stored Files</th>
                <th className="p-4">Why they are using</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredTenants.map((t) => (
                <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary font-mono">
                        {t.username.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">{t.username}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">{t.email}</span>
                      </div>
                    </div>
                  </td>

                  <td className="p-4 font-mono">
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                      {t.tenant_schema}
                    </Badge>
                  </td>

                  <td className="p-4 font-mono">
                    <div className="flex flex-col">
                      <span className="font-semibold text-foreground">{t.table_count} tables</span>
                      <span className="text-[10px] text-muted-foreground">{formatBytes(t.db_bytes)}</span>
                    </div>
                  </td>

                  <td className="p-4 font-mono">
                    <span className="font-semibold text-foreground">{t.files_count} files</span>
                  </td>

                  <td className="p-4 max-w-xs truncate text-muted-foreground" title={t.use_case}>
                    {t.use_case || 'Web Application'}
                  </td>

                  <td className="p-4">
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                      Active
                    </Badge>
                  </td>

                  <td className="p-4 text-right space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleInspect(t.username)}
                      title="Inspect user data & tables"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      <span>Inspect</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteTarget(t.username)}
                      title="Delete account & purge schema"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}

              {filteredTenants.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    No developer accounts match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Tenant Data Drawer / Modal */}
      {inspectUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl border bg-card p-6 shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-primary" />
                <h3 className="text-base font-bold text-foreground">
                  Data Inspector: <span className="text-primary">{inspectUser}</span>
                </h3>
              </div>
              <button
                onClick={() => setInspectUser(null)}
                className="rounded p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {inspectLoading ? (
              <div className="flex h-32 items-center justify-center">
                <RefreshCw className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {/* Schema Banner */}
                <div className="rounded-xl border bg-muted/40 p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-muted-foreground uppercase text-[10px]">PostgreSQL Namespace</span>
                    <Badge variant="outline" className="font-mono">{tenantDetails?.tenant_schema}</Badge>
                  </div>
                  <p className="text-muted-foreground">
                    All tables and queries for this user are strictly isolated inside this PostgreSQL schema.
                  </p>
                </div>

                {/* Tables List */}
                <div>
                  <h4 className="font-semibold text-foreground mb-2 flex items-center space-x-1.5">
                    <Layers className="h-4 w-4 text-blue-400" />
                    <span>User's Database Tables ({tenantDetails?.tables?.length || 0})</span>
                  </h4>
                  {tenantDetails?.tables?.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {tenantDetails.tables.map((table: string) => (
                        <div key={table} className="rounded-lg border bg-background p-2 font-mono text-blue-400">
                          {table}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic">No custom tables created yet by this user.</p>
                  )}
                </div>

                {/* Files List */}
                <div className="border-t pt-3">
                  <h4 className="font-semibold text-foreground mb-2 flex items-center space-x-1.5">
                    <FolderOpen className="h-4 w-4 text-emerald-400" />
                    <span>Uploaded Objects in Storage ({tenantDetails?.files?.length || 0})</span>
                  </h4>
                  {tenantDetails?.files?.length > 0 ? (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {tenantDetails.files.map((file: any) => (
                        <div key={file.file_id} className="flex items-center justify-between rounded-lg border bg-background p-2">
                          <span className="font-mono truncate max-w-xs">{file.filename}</span>
                          <span className="text-muted-foreground">{formatBytes(file.size)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic">No files uploaded yet.</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end border-t pt-3">
              <Button variant="outline" size="sm" onClick={() => setInspectUser(null)}>
                Close Inspector
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Danger Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-destructive/50 bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-destructive">
              <ShieldAlert className="h-6 w-6" />
              <h3 className="text-base font-bold">Delete Tenant & Purge Schema?</h3>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to delete <strong className="text-foreground">{deleteTarget}</strong>?
              This will permanently drop their PostgreSQL schema (<strong className="text-destructive font-mono">tenant_{deleteTarget}</strong>), delete all their tables, and purge their stored files. This action cannot be undone.
            </p>

            <div className="flex justify-end space-x-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={deleting}
                onClick={handleDeleteConfirm}
              >
                {deleting ? 'Purging...' : 'Delete & Purge Schema'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
