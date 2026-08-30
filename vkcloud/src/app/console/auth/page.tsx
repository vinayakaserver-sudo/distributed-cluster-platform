'use client';
import { useState, useEffect } from 'react';
import { Users, Plus, Search, ShieldCheck, Trash2, Key, CheckCircle2, UserPlus, Check } from 'lucide-react';
import { vkcloud } from '@/lib/vkcloud';
import { AuthAppUser } from '@/types';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

export default function AuthStudioPage() {
  const [users, setUsers] = useState<AuthAppUser[]>([]);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchUsers = async () => {
    const list = await vkcloud.listAppUsers();
    setUsers(list);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newEmail || !newPassword) return;

    setCreating(true);
    try {
      await vkcloud.createAppUser(newUsername, newEmail, newPassword);
      toast.success(`User ${newUsername} registered successfully`);
      setShowAddModal(false);
      setNewUsername('');
      setNewEmail('');
      setNewPassword('');
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Auth Studio</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Manage end-users, credentials, and JWT access tokens for your application.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center space-x-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-600/30 hover:bg-blue-500 transition-all"
        >
          <UserPlus className="h-4 w-4" />
          <span>Add Test User</span>
        </button>
      </div>

      {/* Users Table Card */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between border-b border-border bg-muted/30 px-6 py-4 gap-3">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-semibold text-white">Users Directory ({users.length})</span>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by username or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 rounded-lg border border-border bg-background/60 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-500 w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/60 text-muted-foreground uppercase font-mono">
              <tr>
                <th className="px-6 py-3 font-semibold text-white">User</th>
                <th className="px-6 py-3 font-semibold text-white">Email</th>
                <th className="px-6 py-3 font-semibold text-white">Status</th>
                <th className="px-6 py-3 font-semibold text-white">Registered</th>
                <th className="px-6 py-3 font-semibold text-white text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="transition-colors hover:bg-muted/40">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center space-x-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10 text-xs font-bold text-blue-400 font-mono">
                        {user.username.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-white">{user.username}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">{user.id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 font-mono text-muted-foreground">{user.email}</td>
                  <td className="px-6 py-3.5">
                    <span className="inline-flex items-center space-x-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span>Active</span>
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-muted-foreground">{formatDate(user.created_at)}</td>
                  <td className="px-6 py-3.5 text-right">
                    <button
                      onClick={() => toast.success(`Issued new token for ${user.username}`)}
                      className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-white transition-colors"
                      title="Issue JWT"
                    >
                      <Key className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal Dialog */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Create New App User</h3>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Username</label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="john_doe"
                  className="mt-1 w-full rounded-xl border border-border bg-background p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Email</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="mt-1 w-full rounded-xl border border-border bg-background p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1 w-full rounded-xl border border-border bg-background p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500"
                >
                  {creating ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
