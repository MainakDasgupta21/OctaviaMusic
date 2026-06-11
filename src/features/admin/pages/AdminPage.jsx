import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import Button from '@/components/ui-v2/Button';
import api from '@/lib/api';

const ADMIN_USERS_QUERY_KEY = ['admin', 'users'];

const readFriendlyError = (error, fallback, scope) => {
  const status = error?.response?.status;
  if (status >= 500) {
    if (import.meta.env?.DEV) {
      console.error(`[admin] ${scope} failed`, error);
    }
    return 'Something went wrong. Please try again.';
  }
  return error?.response?.data?.message || fallback;
};

const AdminPage = () => {
  const queryClient = useQueryClient();
  const usersQuery = useQuery({
    queryKey: ADMIN_USERS_QUERY_KEY,
    queryFn: async () => {
      const response = await api.get('/admin/users');
      return Array.isArray(response.data?.items) ? response.data.items : [];
    },
  });

  const roleMutation = useMutation({
    mutationFn: async ({ id, role }) => {
      const response = await api.patch(`/admin/users/${encodeURIComponent(id)}/role`, { role });
      return response.data?.user;
    },
    onSuccess: () => {
      toast.success('User role updated');
      queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(readFriendlyError(error, 'Unable to update role', 'role update'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/admin/users/${encodeURIComponent(id)}`);
    },
    onSuccess: () => {
      toast.success('User removed');
      queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(readFriendlyError(error, 'Unable to delete user', 'delete user'));
    },
  });

  const rows = useMemo(() => usersQuery.data || [], [usersQuery.data]);

  return (
    <div className="page-shell pt-6 md:pt-10 space-y-6">
      <div>
        <p className="eyebrow eyebrow-accent mb-3">Administration</p>
        <h1 className="font-display text-display-lg text-ink leading-tight">User management</h1>
        <p className="font-editorial text-sm text-ink-3 mt-2">
          Promote trusted users to admin or remove accounts.
        </p>
      </div>

      <section className="rounded-sharp border border-white/[0.10] bg-surface-2/45 backdrop-blur-md overflow-hidden">
        <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto_auto] gap-3 px-4 py-3 border-b border-white/[0.08] text-[10px] uppercase tracking-[0.14em] font-mono text-ink-4">
          <span>User</span>
          <span>Role</span>
          <span>Status</span>
          <span aria-hidden="true" />
        </div>

        {usersQuery.isLoading ? (
          <p className="px-4 py-6 text-sm text-ink-3">Loading users…</p>
        ) : usersQuery.isError ? (
          <p className="px-4 py-6 text-sm text-ink-3">
            Unable to load users right now. Try again shortly.
          </p>
        ) : rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-ink-3">No users found.</p>
        ) : (
          rows.map((row) => {
            const id = row.id || row._id;
            const nextRole = row.role === 'admin' ? 'user' : 'admin';
            return (
              <div
                key={id}
                className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto_auto] gap-3 px-4 py-3 border-b border-white/[0.05] last:border-b-0 items-center"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink truncate">
                    {row.displayName || row.username}
                  </p>
                  <p className="text-xs text-ink-3 truncate">{row.email}</p>
                </div>
                <p className="text-sm text-ink-2 capitalize">{row.role || 'user'}</p>
                <Button
                  size="sm"
                  variant="editorial"
                  onClick={() => roleMutation.mutate({ id, role: nextRole })}
                  loading={roleMutation.isPending}
                >
                  Make {nextRole}
                </Button>
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-sharp text-ink-3 hover:text-danger hover:bg-danger/10 focus-ring"
                  onClick={() => {
                    if (window.confirm(`Delete user ${row.email}?`)) {
                      deleteMutation.mutate(id);
                    }
                  }}
                  aria-label={`Delete user ${row.email}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
};

export default AdminPage;
