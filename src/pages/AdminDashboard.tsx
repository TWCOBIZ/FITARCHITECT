import React, { useEffect, useState } from 'react';
import { Link, Routes, Route, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../contexts/AdminAuthContext';
import { api } from '../services/api'
import AdminSidebar from '../components/admin/AdminSidebar';
import AdminHeader from '../components/admin/AdminHeader';
import Breadcrumbs from '../components/admin/Breadcrumbs';
import { ThemeProvider } from '../contexts/ThemeContext';
import PanelLayout from '../components/admin/PanelLayout';
import { Dialog } from '@headlessui/react';

const panels = [
  { path: '', label: 'Overview' },
  { path: 'users', label: 'Users' },
  { path: 'subscriptions', label: 'Subscriptions' },
  { path: 'analytics', label: 'Analytics' },
  { path: 'parq', label: 'PAR-Q' },
  { path: 'content', label: 'Content' },
  { path: 'notifications', label: 'Notifications' },
  { path: 'system', label: 'System Health' },
  { path: 'settings', label: 'Settings' },
];

type PanelPlaceholderProps = { label: string };
const PanelPlaceholder = ({ label }: PanelPlaceholderProps) => (
  <div className="p-8 text-center text-gray-300 text-xl">{label} panel coming soon.</div>
);

// Users Panel
const UsersPanel: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [role, setRole] = useState('all');
  const [sort, setSort] = useState('createdAt-desc');
  const [editUser, setEditUser] = useState<any | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const auth = useAdminAuth() ?? {};
  const { adminUser } = auth;

  const fetchUsers = () => {
    setLoading(true);
    api.get('/api/admin/users')
      .then(res => setUsers(res.data))
      .catch(() => setError('Failed to load users'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  // Filtering, sorting logic
  const filtered = users.filter(u => {
    if (search && !(`${u.name} ${u.email}`.toLowerCase().includes(search.toLowerCase()))) return false;
    if (status !== 'all' && (status === 'active' ? !u.active : u.active)) return false;
    if (role !== 'all' && (role === 'admin' ? !u.isAdmin : u.isAdmin)) return false;
    return true;
  }).sort((a, b) => {
    if (sort === 'name-asc') return a.name.localeCompare(b.name);
    if (sort === 'name-desc') return b.name.localeCompare(a.name);
    if (sort === 'createdAt-asc') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleEdit = (user: any) => {
    setEditUser(user);
    setShowEdit(true);
  };
  const handleCloseEdit = () => {
    setShowEdit(false);
    setEditUser(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.patch(`/api/admin/users/${editUser.id}`, { name: editUser.name, email: editUser.email });
      setToast({ type: 'success', message: 'User updated' });
      fetchUsers();
      handleCloseEdit();
    } catch {
      setToast({ type: 'error', message: 'Failed to update user' });
    }
  };

  const handleActivate = async (user: any) => {
    if (!window.confirm(`${user.active ? 'Deactivate' : 'Activate'} this user?`)) return;
    try {
      await api.post(`/api/admin/users/${user.id}/${user.active ? 'deactivate' : 'activate'}`);
      setToast({ type: 'success', message: `User ${user.active ? 'deactivated' : 'activated'}` });
      fetchUsers();
    } catch {
      setToast({ type: 'error', message: 'Failed to update user status' });
    }
  };

  const handleResetPassword = async (user: any) => {
    const newPassword = window.prompt('Enter new password for this user:');
    if (!newPassword) return;
    if (!window.confirm('Reset password for this user?')) return;
    try {
      await api.post(`/api/admin/users/${user.id}/reset-password`, { newPassword });
      setToast({ type: 'success', message: 'Password reset' });
    } catch {
      setToast({ type: 'error', message: 'Failed to reset password' });
    }
  };

  const handlePromote = async (user: any) => {
    if (!window.confirm(`${user.isAdmin ? 'Demote this admin to user?' : 'Promote this user to admin?'}`)) return;
    try {
      await api.post(`/api/admin/users/${user.id}/role`, { isAdmin: !user.isAdmin });
      setToast({ type: 'success', message: user.isAdmin ? 'User demoted' : 'User promoted to admin' });
      fetchUsers();
    } catch {
      setToast({ type: 'error', message: 'Failed to update user role' });
    }
  };

  const handleSelectUsers = (ids: number[]) => {
    setSelectedUsers(ids);
  };

  const handleBulkActivate = async () => {
    if (selectedUsers.length === 0) return;
    if (!window.confirm(`Activate selected users?`)) return;
    try {
      await Promise.all(selectedUsers.map(id => api.post(`/api/admin/users/${id}/activate`)));
      setToast({ type: 'success', message: `Selected users activated` });
      fetchUsers();
      setSelectedUsers([]);
    } catch {
      setToast({ type: 'error', message: 'Failed to activate selected users' });
    }
  };

  const handleBulkDeactivate = async () => {
    if (selectedUsers.length === 0) return;
    if (!window.confirm(`Deactivate selected users?`)) return;
    try {
      await Promise.all(selectedUsers.map(id => api.post(`/api/admin/users/${id}/deactivate`)));
      setToast({ type: 'success', message: `Selected users deactivated` });
      fetchUsers();
      setSelectedUsers([]);
    } catch {
      setToast({ type: 'error', message: 'Failed to deactivate selected users' });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUsers.length === 0) return;
    if (!window.confirm(`Delete selected users?`)) return;
    try {
      await Promise.all(selectedUsers.map(id => api.delete(`/api/admin/users/${id}`)));
      setToast({ type: 'success', message: `Selected users deleted` });
      fetchUsers();
      setSelectedUsers([]);
    } catch {
      setToast({ type: 'error', message: 'Failed to delete selected users' });
    }
  };

  const handleImpersonate = async (user: any) => {
    if (!window.confirm(`Impersonate as this user?`)) return;
    try {
      const res = await api.post(`/api/admin/impersonate`, { userId: user.id });
      localStorage.setItem('impersonationToken', res.data.token);
      setToast({ type: 'success', message: `Impersonating as ${user.email}` });
      window.location.href = '/dashboard'; // or wherever the user dashboard is
    } catch {
      setToast({ type: 'error', message: 'Failed to impersonate' });
    }
  };

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  return (
    <div className="p-6">
      <div className="flex flex-wrap gap-2 mb-4 items-end">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name/email" className="px-2 py-1 rounded bg-gray-800 text-white border border-gray-700" />
        <select value={status} onChange={e => setStatus(e.target.value)} className="px-2 py-1 rounded bg-gray-800 text-white border border-gray-700">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select value={role} onChange={e => setRole(e.target.value)} className="px-2 py-1 rounded bg-gray-800 text-white border border-gray-700">
          <option value="all">All Roles</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <select value={sort} onChange={e => setSort(e.target.value)} className="px-2 py-1 rounded bg-gray-800 text-white border border-gray-700">
          <option value="createdAt-desc">Newest</option>
          <option value="createdAt-asc">Oldest</option>
          <option value="name-asc">Name A-Z</option>
          <option value="name-desc">Name Z-A</option>
        </select>
      </div>
      {loading ? <div>Loading...</div> : error ? <div className="text-red-500">{error}</div> : (
        <table className="w-full text-left bg-gray-800 rounded">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="py-2 px-3">Avatar</th>
              <th className="py-2 px-3">Email</th>
              <th className="py-2 px-3">Name</th>
              <th className="py-2 px-3">Role</th>
              <th className="py-2 px-3">Status</th>
              <th className="py-2 px-3">Created At</th>
              <th className="py-2 px-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(user => (
              <tr key={user.id} className="border-b border-gray-700 hover:bg-gray-700">
                <td className="py-2 px-3">
                  {user.avatar ? (
                    <img src={user.avatar} alt="avatar" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <span className="text-gray-500">-</span>
                  )}
                </td>
                <td className="py-2 px-3">{user.email}</td>
                <td className="py-2 px-3">{user.name}</td>
                <td className="py-2 px-3">{user.isAdmin ? 'Admin' : 'User'}</td>
                <td className="py-2 px-3">{user.active ? 'Active' : 'Inactive'}</td>
                <td className="py-2 px-3">{user.createdAt ? new Date(user.createdAt).toLocaleString() : '-'}</td>
                <td className="py-2 px-3 space-x-2">
                  <button onClick={() => handleEdit(user)} className="px-2 py-1 bg-yellow-500 hover:bg-yellow-600 rounded text-black font-semibold">Edit</button>
                  <button onClick={() => handleActivate(user)} className={`px-2 py-1 rounded font-semibold ${user.active ? 'bg-gray-600 hover:bg-gray-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}`}>{user.active ? 'Deactivate' : 'Activate'}</button>
                  <button onClick={() => handleResetPassword(user)} className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white font-semibold">Reset PW</button>
                  <button onClick={() => handlePromote(user)} className={`px-2 py-1 rounded font-semibold ${user.isAdmin ? 'bg-gray-600 hover:bg-gray-700 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}>{user.isAdmin ? 'Demote' : 'Promote'}</button>
                  {user.id !== adminUser?.id && (
                    <button onClick={() => handleImpersonate(user)} className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 rounded text-white font-semibold">Impersonate</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {/* Edit User Modal */}
      {showEdit && editUser && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-gray-900 p-6 rounded shadow-lg w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Edit User</h3>
            <form onSubmit={handleSaveEdit}>
              <div className="mb-2">
                <label className="block mb-1">Name</label>
                <input value={editUser.name} onChange={e => setEditUser({ ...editUser, name: e.target.value })} className="w-full px-2 py-1 rounded bg-gray-800 text-white border border-gray-700" />
              </div>
              <div className="mb-2">
                <label className="block mb-1">Email</label>
                <input value={editUser.email} onChange={e => setEditUser({ ...editUser, email: e.target.value })} className="w-full px-2 py-1 rounded bg-gray-800 text-white border border-gray-700" />
              </div>
              {/* Add more fields as needed */}
              <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={handleCloseEdit} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded text-white">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-2 rounded shadow-lg z-50 ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>{toast.message}</div>
      )}
    </div>
  );
};

// Subscriptions Panel
const SubscriptionsPanel: React.FC = () => {
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSub, setSelectedSub] = useState<any | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>({ revenue: 0, active: 0, cancelled: 0, churn: 0 });
  const [planForm, setPlanForm] = useState<any>({ id: '', name: '', price: '' });
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [planModalType, setPlanModalType] = useState<'add' | 'edit' | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [subsRes, plansRes, analyticsRes] = await Promise.all([
        api.get('/api/admin/subscriptions'),
        api.get('/api/admin/plans'),
        api.get('/api/admin/subscriptions/analytics'),
      ]);
      setSubs(subsRes.data);
      setPlans(plansRes.data);
      setAnalytics(analyticsRes.data);
    } catch (err: any) {
      setError('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  // Group by plan
  const grouped = subs.reduce((acc, sub) => {
    acc[sub.plan] = acc[sub.plan] || [];
    acc[sub.plan].push(sub);
    return acc;
  }, {} as Record<string, any[]>);

  // Fetch subscription details and payment history
  const openDetails = async (sub: any) => {
    setSelectedSub(sub);
    setShowDetails(true);
    setDetailsLoading(true);
    setDetailsError(null);
    try {
      const res = await api.get(`/api/admin/subscriptions/${sub.id}`);
      setPaymentHistory(res.data.paymentHistory || []);
      setSelectedSub({ ...sub, ...res.data });
    } catch {
      setDetailsError('Failed to load details');
    } finally {
      setDetailsLoading(false);
    }
  };

  // Cancel, Refund, Change Plan actions
  const handleCancel = async () => {
    if (!selectedSub) return;
    if (!window.confirm('Cancel this subscription?')) return;
    try {
      await api.post(`/api/admin/subscriptions/${selectedSub.id}/cancel`);
      setToast({ type: 'success', message: 'Subscription cancelled' });
      setShowDetails(false);
      fetchAll();
    } catch {
      setToast({ type: 'error', message: 'Failed to cancel subscription' });
    }
  };
  const handleRefund = async () => {
    if (!selectedSub) return;
    if (!window.confirm('Refund this subscription?')) return;
    try {
      await api.post(`/api/admin/subscriptions/${selectedSub.id}/refund`);
      setToast({ type: 'success', message: 'Subscription refunded' });
      setShowDetails(false);
      fetchAll();
    } catch {
      setToast({ type: 'error', message: 'Failed to refund subscription' });
    }
  };
  const handleChangePlan = async (planId: string) => {
    if (!selectedSub) return;
    if (!window.confirm('Change plan for this subscription?')) return;
    try {
      await api.post(`/api/admin/subscriptions/${selectedSub.id}/change-plan`, { planId });
      setToast({ type: 'success', message: 'Plan changed' });
      setShowDetails(false);
      fetchAll();
    } catch {
      setToast({ type: 'error', message: 'Failed to change plan' });
    }
  };

  // Plan management
  const openAddPlan = () => {
    setPlanForm({ id: '', name: '', price: '' });
    setPlanModalType('add');
  };
  const openEditPlan = (plan: any) => {
    setPlanForm({ ...plan });
    setEditingPlan(plan);
    setPlanModalType('edit');
  };
  const closePlanModal = () => {
    setPlanModalType(null);
    setEditingPlan(null);
    setPlanForm({ id: '', name: '', price: '' });
  };
  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (planModalType === 'add') {
        await api.post('/api/admin/plans', { name: planForm.name, price: Number(planForm.price) });
        setToast({ type: 'success', message: 'Plan added' });
      } else if (planModalType === 'edit' && editingPlan) {
        await api.patch(`/api/admin/plans/${editingPlan.id}`, { name: planForm.name, price: Number(planForm.price) });
        setToast({ type: 'success', message: 'Plan updated' });
      }
      closePlanModal();
      fetchAll();
    } catch {
      setToast({ type: 'error', message: 'Failed to save plan' });
    }
  };
  const handleDeletePlan = async (plan: any) => {
    if (!window.confirm('Delete this plan?')) return;
    try {
      await api.delete(`/api/admin/plans/${plan.id}`);
      setToast({ type: 'success', message: 'Plan deleted' });
      fetchAll();
    } catch {
      setToast({ type: 'error', message: 'Failed to delete plan' });
    }
  };

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  return (
    <div className="p-6">
      {/* Analytics Section */}
      <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded p-4 text-center">
          <div className="text-gray-400">Total Revenue</div>
          <div className="text-2xl font-bold">${analytics.revenue.toLocaleString()}</div>
        </div>
        <div className="bg-gray-800 rounded p-4 text-center">
          <div className="text-gray-400">Active Subs</div>
          <div className="text-2xl font-bold">{analytics.active}</div>
        </div>
        <div className="bg-gray-800 rounded p-4 text-center">
          <div className="text-gray-400">Cancelled</div>
          <div className="text-2xl font-bold">{analytics.cancelled}</div>
        </div>
        <div className="bg-gray-800 rounded p-4 text-center">
          <div className="text-gray-400">Churn Rate</div>
          <div className="text-2xl font-bold">{analytics.churn}%</div>
        </div>
      </div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Subscriptions</h2>
        <button onClick={() => setShowPlans(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white font-semibold">Manage Plans</button>
      </div>
      {loading ? <div>Loading...</div> : error ? <div className="text-red-500">{error}</div> : (
        Object.keys(grouped).length === 0 ? <div>No subscriptions found.</div> : (
          Object.entries(grouped).map(([plan, list]) => (
            <div key={plan} className="mb-6">
              <h3 className="text-lg font-semibold mb-2 capitalize">{plan} ({(list as any[]).length})</h3>
              <table className="w-full text-left bg-gray-800 rounded">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="py-2 px-3">User Email</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">Start</th>
                    <th className="py-2 px-3">End</th>
                    <th className="py-2 px-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(list as any[]).map((sub: any) => (
                    <tr key={sub.id} className="border-b border-gray-700 hover:bg-gray-700">
                      <td className="py-2 px-3">{sub.userEmail}</td>
                      <td className="py-2 px-3">{sub.status}</td>
                      <td className="py-2 px-3">{sub.startDate}</td>
                      <td className="py-2 px-3">{sub.endDate || '-'}</td>
                      <td className="py-2 px-3">
                        <button onClick={() => { setSelectedSub(sub); setShowDetails(true); }} className="px-2 py-1 bg-yellow-500 hover:bg-yellow-600 rounded text-black font-semibold">View Details</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )
      )}
      {/* Subscription Details Modal */}
      {showDetails && selectedSub && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-gray-900 p-6 rounded shadow-lg w-full max-w-lg">
            <h3 className="text-xl font-bold mb-4">Subscription Details</h3>
            <div className="mb-2"><b>User:</b> {selectedSub.userEmail}</div>
            <div className="mb-2"><b>Plan:</b> {selectedSub.plan}</div>
            <div className="mb-2"><b>Status:</b> {selectedSub.status}</div>
            <div className="mb-2"><b>Start:</b> {selectedSub.startDate}</div>
            <div className="mb-2"><b>End:</b> {selectedSub.endDate || '-'}</div>
            <div className="mb-4"><b>Payment History:</b>
              <table className="w-full text-left bg-gray-800 rounded mt-2">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="py-1 px-2">Date</th>
                    <th className="py-1 px-2">Amount</th>
                    <th className="py-1 px-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentHistory.map(p => (
                    <tr key={p.id} className="border-b border-gray-700">
                      <td className="py-1 px-2">{p.date}</td>
                      <td className="py-1 px-2">${p.amount}</td>
                      <td className="py-1 px-2">{p.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={handleChangePlan} className="px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded text-white">Change Plan</button>
              <button onClick={handleCancel} className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded text-white">Cancel</button>
              <button onClick={handleRefund} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white">Refund</button>
              <button onClick={() => setShowDetails(false)} className="px-3 py-2 bg-gray-700 hover:bg-gray-800 rounded text-white">Close</button>
            </div>
          </div>
        </div>
      )}
      {/* Manage Plans Modal */}
      {showPlans && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-gray-900 p-6 rounded shadow-lg w-full max-w-lg">
            <h3 className="text-xl font-bold mb-4">Manage Plans</h3>
            <table className="w-full text-left bg-gray-800 rounded mb-4">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="py-1 px-2">Name</th>
                  <th className="py-1 px-2">Price</th>
                  <th className="py-1 px-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {plans.map(plan => (
                  <tr key={plan.id} className="border-b border-gray-700">
                    <td className="py-1 px-2">{plan.name}</td>
                    <td className="py-1 px-2">${plan.price}</td>
                    <td className="py-1 px-2">
                      <button onClick={() => openEditPlan(plan)} className="px-2 py-1 bg-yellow-500 hover:bg-yellow-600 rounded text-black font-semibold mr-2">Edit</button>
                      <button onClick={() => handleDeletePlan(plan)} className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-white font-semibold">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={openAddPlan} className="px-3 py-2 bg-green-600 hover:bg-green-700 rounded text-white">Add Plan</button>
            <button onClick={() => setShowPlans(false)} className="ml-2 px-3 py-2 bg-gray-700 hover:bg-gray-800 rounded text-white">Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

// Analytics Panel
const AnalyticsPanel: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [toast, setToast] = useState<string|null>(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleConfig, setScheduleConfig] = useState({ frequency: 'weekly', time: '', recipients: '' });
  const [scheduling, setScheduling] = useState(false);

  const fetchData = () => {
    setLoading(true);
    api.get('/api/admin/analytics', { params: { start, end } })
      .then(res => setData(res.data))
      .catch(() => setError('Failed to load analytics'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { fetchData(); }, [start, end]);

  const handleExportPDF = async () => {
    try {
      const res = await api.get('/api/admin/analytics/export', { params: { start, end }, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'analytics.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setToast('PDF downloaded');
    } catch {
      setToast('Failed to export PDF');
    }
  };
  const handleScheduleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setScheduling(true);
    try {
      await api.post('/api/admin/analytics/schedule-report', scheduleConfig);
      setToast('Report scheduled');
      setShowSchedule(false);
    } catch {
      setToast('Failed to schedule report');
    } finally {
      setScheduling(false);
    }
  };
  useEffect(()=>{ if(toast){ const t=setTimeout(()=>setToast(null),3000); return()=>clearTimeout(t);} },[toast]);

  // Mock chart: just a bar for each subscription tier
  const chartData = data?.subscriptionBreakdown || { free: 0, basic: 0, premium: 0 };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Analytics & KPIs</h2>
      <div className="flex gap-2 mb-4 items-end">
        <input type="date" value={start} onChange={e=>setStart(e.target.value)} className="px-2 py-1 rounded bg-gray-800 text-white border border-gray-700" />
        <span>to</span>
        <input type="date" value={end} onChange={e=>setEnd(e.target.value)} className="px-2 py-1 rounded bg-gray-800 text-white border border-gray-700" />
        <button onClick={handleExportPDF} className="px-3 py-1 bg-green-600 rounded text-white ml-2">Download PDF</button>
        <button onClick={()=>setShowSchedule(true)} className="px-3 py-1 bg-blue-600 rounded text-white ml-2">Schedule Report</button>
      </div>
      {loading ? <div>Loading...</div> : error ? <div className="text-red-500">{error}</div> : data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-800 rounded p-4">
            <div className="text-gray-400">Total Users</div>
            <div className="text-3xl font-bold">{data.totalUsers}</div>
          </div>
          <div className="bg-gray-800 rounded p-4">
            <div className="text-gray-400">Active Users (30d)</div>
            <div className="text-3xl font-bold">{data.activeUsers}</div>
          </div>
          <div className="bg-gray-800 rounded p-4">
            <div className="text-gray-400">New Signups (7d)</div>
            <div className="text-3xl font-bold">{data.newSignups}</div>
          </div>
          <div className="bg-gray-800 rounded p-4">
            <div className="text-gray-400">Churn Rate</div>
            <div className="text-3xl font-bold">{data.churnRate}%</div>
          </div>
        </div>
      ) : null}
      {/* Simple bar chart for subscription breakdown */}
      <div className="bg-gray-800 rounded p-4">
        <div className="text-gray-400 mb-2">Subscription Breakdown</div>
        <div className="flex items-end space-x-6 h-32">
          {Object.entries(chartData).map(([tier, count]) => {
            const numCount = typeof count === 'string' ? parseInt(count, 10) : Number(count);
            return (
              <div key={tier} className="flex flex-col items-center flex-1">
                <div
                  className="w-8 bg-blue-500 rounded-t"
                  style={{ height: `${(numCount || 0) * 10 + 10}px` }}
                  title={`${numCount} users`}
                ></div>
                <div className="mt-2 text-sm capitalize">{tier}</div>
                <div className="text-xs text-gray-400">{numCount}</div>
              </div>
            );
          })}
        </div>
      </div>
      {/* Schedule Report Modal */}
      {showSchedule && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-gray-900 p-6 rounded shadow-lg w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Schedule Analytics Report</h3>
            <form onSubmit={handleScheduleReport}>
              <div className="mb-2">
                <label className="block mb-1">Frequency</label>
                <select value={scheduleConfig.frequency} onChange={e=>setScheduleConfig(c=>({...c,frequency:e.target.value}))} className="w-full px-2 py-1 rounded bg-gray-800 text-white border border-gray-700">
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div className="mb-2">
                <label className="block mb-1">Time</label>
                <input type="time" value={scheduleConfig.time} onChange={e=>setScheduleConfig(c=>({...c,time:e.target.value}))} className="w-full px-2 py-1 rounded bg-gray-800 text-white border border-gray-700" />
              </div>
              <div className="mb-2">
                <label className="block mb-1">Recipients (comma-separated emails)</label>
                <input value={scheduleConfig.recipients} onChange={e=>setScheduleConfig(c=>({...c,recipients:e.target.value}))} className="w-full px-2 py-1 rounded bg-gray-800 text-white border border-gray-700" />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={()=>setShowSchedule(false)} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded text-white">Cancel</button>
                <button type="submit" disabled={scheduling} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white">{scheduling ? 'Scheduling...' : 'Schedule'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {toast && <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg">{toast}</div>}
    </div>
  );
};

// PAR-Q Admin Panel
const ParqPanel: React.FC = () => {
  const [tab, setTab] = useState<'submissions' | 'followup' | 'report'>('submissions');
  const [responses, setResponses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<any | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Fetch all responses
  const fetchResponses = () => {
    setLoading(true);
    api.get('/api/admin/parq-responses')
      .then(res => setResponses(res.data))
      .catch(() => setError('Failed to load responses'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { fetchResponses(); }, []);

  // Fetch report
  const fetchReport = () => {
    api.get('/api/admin/parq-report').then(res => setReport(res.data));
  };
  useEffect(() => { if (tab === 'report') fetchReport(); }, [tab]);

  // Filtered responses
  const filtered = responses.filter(r => {
    if (flaggedOnly && !r.flagged) return false;
    if (search && !(r.user?.email?.toLowerCase().includes(search.toLowerCase()) || r.user?.name?.toLowerCase().includes(search.toLowerCase()))) return false;
    if (dateFilter && !(r.createdAt && r.createdAt.startsWith(dateFilter))) return false;
    return true;
  });

  // Open detail modal
  const openDetail = (r: any) => { setSelected(r); setShowDetail(true); setNote(''); };
  const closeDetail = () => { setShowDetail(false); setSelected(null); };

  // Flag questions
  const handleFlag = async (ids: number[]) => {
    if (!selected) return;
    setSaving(true);
    await api.post(`/api/admin/parq-responses/${selected.userId}/flag`, { flaggedQuestions: ids });
    setToast('Flagged for follow-up');
    fetchResponses();
    setSaving(false);
  };
  // Add note
  const handleAddNote = async () => {
    if (!selected || !note) return;
    setSaving(true);
    await api.post(`/api/admin/parq-responses/${selected.userId}/note`, { note });
    setToast('Note added');
    fetchResponses();
    setNote('');
    setSaving(false);
  };
  // Mark as reviewed
  const handleReviewed = async (r: any) => {
    setSaving(true);
    await api.patch(`/api/admin/parq-responses/${r.userId}/reviewed`);
    setToast('Marked as reviewed');
    fetchResponses();
    setSaving(false);
  };

  // --- UI ---
  return (
    <div className="p-6">
      <div className="flex gap-4 mb-4">
        <button onClick={() => setTab('submissions')} className={`px-4 py-2 rounded ${tab==='submissions'?'bg-blue-600 text-white':'bg-gray-700 text-gray-300'}`}>Submissions</button>
        <button onClick={() => setTab('followup')} className={`px-4 py-2 rounded ${tab==='followup'?'bg-blue-600 text-white':'bg-gray-700 text-gray-300'}`}>Follow-up</button>
        <button onClick={() => setTab('report')} className={`px-4 py-2 rounded ${tab==='report'?'bg-blue-600 text-white':'bg-gray-700 text-gray-300'}`}>Reporting</button>
      </div>
      {tab==='submissions' && (
        <div>
          <div className="flex gap-2 mb-2">
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search user/email" className="px-2 py-1 rounded bg-gray-800 text-white border border-gray-700" />
            <input type="date" value={dateFilter} onChange={e=>setDateFilter(e.target.value)} className="px-2 py-1 rounded bg-gray-800 text-white border border-gray-700" />
            <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={flaggedOnly} onChange={e=>setFlaggedOnly(e.target.checked)} />Flagged only</label>
          </div>
          {loading ? <div>Loading...</div> : error ? <div className="text-red-500">{error}</div> : (
            <table className="w-full text-left bg-gray-800 rounded">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="py-2 px-3">User</th>
                  <th className="py-2 px-3">Email</th>
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Flagged</th>
                  <th className="py-2 px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-b border-gray-700 hover:bg-gray-700">
                    <td className="py-2 px-3">{r.user?.name}</td>
                    <td className="py-2 px-3">{r.user?.email}</td>
                    <td className="py-2 px-3">{r.createdAt?.slice(0,10)}</td>
                    <td className="py-2 px-3">{r.flagged ? '🚩' : ''}</td>
                    <td className="py-2 px-3"><button onClick={()=>openDetail(r)} className="px-2 py-1 bg-blue-600 rounded text-white">View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      {tab==='followup' && (
        <div>
          <h3 className="text-lg font-bold mb-2">Flagged for Follow-up</h3>
          <table className="w-full text-left bg-gray-800 rounded">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="py-2 px-3">User</th>
                <th className="py-2 px-3">Email</th>
                <th className="py-2 px-3">Flagged Questions</th>
                <th className="py-2 px-3">Reviewed</th>
                <th className="py-2 px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {responses.filter(r=>r.flagged).map(r=>(
                <tr key={r.id} className="border-b border-gray-700 hover:bg-gray-700">
                  <td className="py-2 px-3">{r.user?.name}</td>
                  <td className="py-2 px-3">{r.user?.email}</td>
                  <td className="py-2 px-3">{(r.flaggedQuestions||[]).join(', ')}</td>
                  <td className="py-2 px-3">{r.reviewed ? '✅' : '⏳'}</td>
                  <td className="py-2 px-3">
                    {!r.reviewed && <button onClick={()=>handleReviewed(r)} className="px-2 py-1 bg-green-600 rounded text-white">Mark Reviewed</button>}
                    <button onClick={()=>openDetail(r)} className="ml-2 px-2 py-1 bg-blue-600 rounded text-white">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {tab==='report' && (
        <div>
          <h3 className="text-lg font-bold mb-2">PAR-Q Reporting</h3>
          {report ? (
            <div className="space-y-2">
              <div>Total submissions: {report.total}</div>
              <div>Flagged: {report.flagged} ({Math.round(report.flaggedRate)}%)</div>
              {/* TODO: Show trends, most common flagged questions */}
            </div>
          ) : <div>Loading...</div>}
        </div>
      )}
      <Dialog open={showDetail} onClose={closeDetail} className="fixed z-50 inset-0 flex items-center justify-center">
        <Dialog.Overlay className="fixed inset-0 bg-black/60" />
        <div className="relative bg-gray-900 rounded-lg p-8 w-full max-w-2xl mx-auto">
          <Dialog.Title className="text-xl font-bold mb-2">PAR-Q Submission Details</Dialog.Title>
          {selected && (
            <div>
              <div className="mb-2">User: <span className="font-semibold">{selected.user?.name}</span> ({selected.user?.email})</div>
              <div className="mb-2">Date: {selected.createdAt?.slice(0,10)}</div>
              <div className="mb-2">Flagged: {selected.flagged ? '🚩' : 'No'}</div>
              <div className="mb-2">Flagged Questions: {(selected.flaggedQuestions||[]).join(', ')}</div>
              <div className="mb-2">Notes: <ul className="list-disc pl-6">{(selected.notes||[]).map((n:string,i:number)=><li key={i}>{n}</li>)}</ul></div>
              <div className="mb-2">Answers:
                <ul className="list-decimal pl-6">
                  {Object.entries(selected.answers||{}).map(([qid, ans]:[string,boolean]) => (
                    <li key={qid} className={selected.flaggedQuestions?.includes(qid) ? 'text-yellow-400' : ''}>
                      Q{qid}: {ans ? 'Yes' : 'No'}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={()=>handleFlag(Object.keys(selected.answers).filter(qid=>selected.answers[qid]))} className="px-3 py-1 bg-yellow-500 rounded text-black">Flag Yes Answers</button>
                <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Add note" className="px-2 py-1 rounded bg-gray-800 text-white border border-gray-700" />
                <button onClick={handleAddNote} className="px-3 py-1 bg-blue-600 rounded text-white">Add Note</button>
                <button onClick={closeDetail} className="ml-auto px-3 py-1 bg-gray-700 rounded text-white">Close</button>
              </div>
            </div>
          )}
        </div>
      </Dialog>
      {toast && <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg">{toast}</div>}
    </div>
  );
};

// Content Management Panel
const ContentPanel: React.FC = () => {
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({ title: '', type: '', body: '', id: null as number | null });
  const [saving, setSaving] = React.useState(false);

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch('/api/admin/content', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch content');
      setItems(await res.json());
    } catch (err: any) {
      setError(err.message || 'Failed to fetch content');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { fetchItems(); }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const token = localStorage.getItem('adminToken');
      const method = form.id ? 'PUT' : 'POST';
      const url = form.id ? `/api/admin/content/${form.id}` : '/api/admin/content';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: form.title, type: form.type, body: form.body })
      });
      if (!res.ok) throw new Error('Failed to save content');
      setForm({ title: '', type: '', body: '', id: null });
      fetchItems();
    } catch (err: any) {
      setError(err.message || 'Failed to save content');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: any) => {
    setForm({ ...item });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this content item?')) return;
    setError(null);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`/api/admin/content/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete content');
      fetchItems();
    } catch (err: any) {
      setError(err.message || 'Failed to delete content');
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Content Management</h2>
      <form onSubmit={handleSave} className="mb-6 space-y-2">
        <div className="flex gap-2">
          <input name="title" value={form.title} onChange={handleChange} placeholder="Title" className="px-2 py-1 rounded bg-gray-800 text-white border border-gray-700 flex-1" required />
          <input name="type" value={form.type} onChange={handleChange} placeholder="Type" className="px-2 py-1 rounded bg-gray-800 text-white border border-gray-700 w-32" required />
        </div>
        <textarea name="body" value={form.body} onChange={handleChange} placeholder="Body" className="w-full px-2 py-1 rounded bg-gray-800 text-white border border-gray-700" rows={3} required />
        <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white font-semibold mt-2">
          {form.id ? (saving ? 'Saving...' : 'Update') : (saving ? 'Saving...' : 'Add')}
        </button>
        {form.id && <button type="button" onClick={() => setForm({ title: '', type: '', body: '', id: null })} className="ml-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded text-white font-semibold">Cancel</button>}
      </form>
      {error && <div className="text-red-400 mb-4">{error}</div>}
      {loading ? <div>Loading...</div> : (
        <table className="w-full text-left bg-gray-800 rounded">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="py-2 px-3">Title</th>
              <th className="py-2 px-3">Type</th>
              <th className="py-2 px-3">Body</th>
              <th className="py-2 px-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} className="border-b border-gray-700 hover:bg-gray-700">
                <td className="py-2 px-3">{item.title}</td>
                <td className="py-2 px-3">{item.type}</td>
                <td className="py-2 px-3 max-w-xs truncate">{item.body}</td>
                <td className="py-2 px-3">
                  <button onClick={() => handleEdit(item)} className="px-2 py-1 bg-yellow-500 hover:bg-yellow-600 rounded text-black font-semibold mr-2">Edit</button>
                  <button onClick={() => handleDelete(item.id)} className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-white font-semibold">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

// Enhanced Notifications Panel
const NotificationsPanel: React.FC = () => {
  const [recipients, setRecipients] = useState<'users'|'admins'>('users');
  const [channel, setChannel] = useState<'email'|'telegram'|'both'>('email');
  const [message, setMessage] = useState('');
  const [schedule, setSchedule] = useState('');
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<string|null>(null);
  const [sent, setSent] = useState<any[]>([]);

  const fetchSent = async () => {
    const res = await api.get('/api/admin/notifications');
    setSent(res.data);
  };
  useEffect(()=>{ fetchSent(); },[]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await api.post('/api/admin/notifications', { recipients, channel, message, schedule });
      setToast('Notification scheduled');
      setMessage('');
      setSchedule('');
      fetchSent();
    } catch {
      setToast('Failed to send notification');
    } finally {
      setSending(false);
    }
  };
  useEffect(()=>{ if(toast){ const t=setTimeout(()=>setToast(null),3000); return()=>clearTimeout(t);} },[toast]);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Notification Management</h2>
      <form onSubmit={handleSend} className="mb-6 flex flex-wrap gap-2 items-end">
        <select value={recipients} onChange={e=>setRecipients(e.target.value as any)} className="px-2 py-1 rounded bg-gray-800 text-white border border-gray-700">
          <option value="users">Users</option>
          <option value="admins">Admins</option>
        </select>
        <select value={channel} onChange={e=>setChannel(e.target.value as any)} className="px-2 py-1 rounded bg-gray-800 text-white border border-gray-700">
          <option value="email">Email</option>
          <option value="telegram">Telegram</option>
          <option value="both">Both</option>
        </select>
        <input value={message} onChange={e=>setMessage(e.target.value)} placeholder="Message" className="px-2 py-1 rounded bg-gray-800 text-white border border-gray-700 flex-1" required />
        <input type="datetime-local" value={schedule} onChange={e=>setSchedule(e.target.value)} className="px-2 py-1 rounded bg-gray-800 text-white border border-gray-700" />
        <button type="submit" disabled={sending} className="px-4 py-2 bg-blue-600 rounded text-white font-semibold">{sending ? 'Sending...' : 'Send'}</button>
      </form>
      <h3 className="text-lg font-bold mb-2">Sent & Scheduled Notifications</h3>
      <table className="w-full text-left bg-gray-800 rounded">
        <thead><tr><th>To</th><th>Channel</th><th>Message</th><th>Scheduled</th><th>Status</th></tr></thead>
        <tbody>{sent.map((n:any)=>(<tr key={n.id}><td>{n.recipients}</td><td>{n.channel}</td><td>{n.message}</td><td>{n.schedule ? new Date(n.schedule).toLocaleString() : '-'}</td><td>{n.status}</td></tr>))}</tbody>
      </table>
      {toast && <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg">{toast}</div>}
    </div>
  );
};

// System Management Panel
const SystemManagementPanel: React.FC = () => {
  const [tab, setTab] = useState<'settings'|'moderation'|'backup'|'errors'|'notifications'|'audit'>('settings');
  const [maintenance, setMaintenance] = useState(false);
  const [notifEmail, setNotifEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string|null>(null);
  const [flaggedContent, setFlaggedContent] = useState<any[]>([]);
  const [errors, setErrors] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [twoFAStatus, setTwoFAStatus] = useState<'enabled'|'disabled'|'pending'>('disabled');
  const [twoFASecret, setTwoFASecret] = useState('');
  const [twoFAQr, setTwoFAQr] = useState('');
  const [twoFAToken, setTwoFAToken] = useState('');
  const [twoFAError, setTwoFAError] = useState('');
  const [twoFASuccess, setTwoFASuccess] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [auditExporting, setAuditExporting] = useState(false);

  // Fetch settings
  const fetchSettings = async () => {
    setLoading(true);
    const res = await api.get('/api/admin/settings');
    setMaintenance(res.data.maintenance);
    setNotifEmail(res.data.notifEmail);
    setLoading(false);
  };
  // Fetch all data
  const fetchAll = async () => {
    setLoading(true);
    const [content, errs, logs, notifs] = await Promise.all([
      api.get('/api/admin/flagged-content'),
      api.get('/api/admin/errors'),
      api.get('/api/admin/audit-logs'),
      api.get('/api/admin/notifications'),
    ]);
    setFlaggedContent(content.data);
    setErrors(errs.data);
    setAuditLogs(logs.data);
    setNotifications(notifs.data);
    setLoading(false);
  };
  useEffect(()=>{ fetchSettings(); fetchAll(); },[]);

  // Fetch 2FA status on mount
  useEffect(() => {
    api.get('/api/admin/me').then(res => {
      if (res.data.twoFactorEnabled) setTwoFAStatus('enabled');
      else setTwoFAStatus('disabled');
    });
  }, []);

  // Save settings
  const handleSaveSettings = async () => {
    setSaving(true);
    await api.patch('/api/admin/settings', { maintenance, notifEmail });
    setSaving(false);
    setToast('Settings saved');
    fetchSettings();
  };
  // Approve/Reject content
  const handleApprove = async (id:string) => {
    await api.post(`/api/admin/content/${id}/approve`);
    setToast('Content approved');
    fetchAll();
  };
  const handleReject = async (id:string) => {
    await api.post(`/api/admin/content/${id}/reject`);
    setToast('Content rejected');
    fetchAll();
  };
  // Backup/Restore
  const handleBackup = async () => {
    await api.post('/api/admin/backup');
    setToast('Backup triggered');
  };
  const handleRestore = async () => {
    await api.post('/api/admin/restore');
    setToast('Restore triggered');
  };
  // Send notification
  const handleSendNotification = async () => {
    await api.post('/api/admin/notifications', { message: 'Test notification' });
    setToast('Notification sent');
    fetchAll();
  };

  const handle2FASetup = async () => {
    setTwoFAError(''); setTwoFASuccess('');
    const res = await api.post('/api/admin/2fa/setup');
    setTwoFASecret(res.data.secret);
    setTwoFAQr(res.data.qr);
    setTwoFAStatus('pending');
  };
  const handle2FAVerify = async () => {
    setTwoFAError(''); setTwoFASuccess('');
    try {
      await api.post('/api/admin/2fa/verify', { token: twoFAToken, secret: twoFASecret });
      setTwoFASuccess('2FA enabled!');
      setTwoFAStatus('enabled');
    } catch (e:any) {
      setTwoFAError(e.response?.data?.error || 'Failed to verify');
    }
  };
  const handle2FADisable = async () => {
    setTwoFAError(''); setTwoFASuccess('');
    await api.post('/api/admin/2fa/disable');
    setTwoFAStatus('disabled');
    setTwoFASecret('');
    setTwoFAQr('');
    setTwoFAToken('');
    setTwoFASuccess('2FA disabled');
  };

  // Real-time log streaming (poll every 3s)
  useEffect(() => {
    if (streaming) {
      const interval = setInterval(() => {
        api.get('/api/admin/errors?stream=1').then(res => setErrors(res.data));
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [streaming]);

  // File upload for restore
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setUploading(true);
    setUploadProgress(0);
    const formData = new FormData();
    formData.append('file', e.target.files[0]);
    try {
      await api.post('/api/admin/restore', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (p) => setUploadProgress(Math.round((p.loaded * 100) / (p.total || 1)))
      });
      setToast('Restore uploaded');
    } catch {
      setToast('Failed to upload restore');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };
  // Audit log export
  const handleAuditExport = async () => {
    setAuditExporting(true);
    try {
      const res = await api.get('/api/admin/audit-logs/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'audit-logs.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setToast('Audit logs exported');
    } catch {
      setToast('Failed to export audit logs');
    } finally {
      setAuditExporting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex gap-4 mb-4">
        <button onClick={()=>setTab('settings')} className={`px-4 py-2 rounded ${tab==='settings'?'bg-blue-600 text-white':'bg-gray-700 text-gray-300'}`}>Settings</button>
        <button onClick={()=>setTab('moderation')} className={`px-4 py-2 rounded ${tab==='moderation'?'bg-blue-600 text-white':'bg-gray-700 text-gray-300'}`}>Content Moderation</button>
        <button onClick={()=>setTab('backup')} className={`px-4 py-2 rounded ${tab==='backup'?'bg-blue-600 text-white':'bg-gray-700 text-gray-300'}`}>Backup/Restore</button>
        <button onClick={()=>setTab('errors')} className={`px-4 py-2 rounded ${tab==='errors'?'bg-blue-600 text-white':'bg-gray-700 text-gray-300'}`}>Error Logs</button>
        <button onClick={()=>setTab('notifications')} className={`px-4 py-2 rounded ${tab==='notifications'?'bg-blue-600 text-white':'bg-gray-700 text-gray-300'}`}>Notifications</button>
        <button onClick={()=>setTab('audit')} className={`px-4 py-2 rounded ${tab==='audit'?'bg-blue-600 text-white':'bg-gray-700 text-gray-300'}`}>Audit Logs</button>
      </div>
      {tab==='settings' && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold mb-2">System Settings</h2>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <span>Maintenance Mode</span>
              <input type="checkbox" checked={maintenance} onChange={e=>setMaintenance(e.target.checked)} className="w-5 h-5" />
            </label>
            <span className="text-sm text-gray-400">(Show maintenance page to users when enabled)</span>
          </div>
          <div>
            <label className="block mb-1">Notification Email</label>
            <input value={notifEmail} onChange={e=>setNotifEmail(e.target.value)} className="px-2 py-1 rounded bg-gray-800 text-white border border-gray-700 w-64" />
          </div>
          <div className="mt-8 border-t border-gray-700 pt-4">
            <h3 className="text-lg font-bold mb-2">Two-Factor Authentication (2FA)</h3>
            {twoFAStatus==='enabled' ? (
              <div>
                <div className="text-green-500 mb-2">2FA is enabled on your account.</div>
                <button onClick={handle2FADisable} className="px-3 py-1 bg-red-600 rounded text-white">Disable 2FA</button>
                {twoFASuccess && <div className="text-green-400 mt-2">{twoFASuccess}</div>}
              </div>
            ) : twoFAStatus==='pending' ? (
              <div>
                <div className="mb-2">Scan this QR code with your authenticator app:</div>
                {twoFAQr && <img src={twoFAQr} alt="2FA QR" className="mb-2 w-40 h-40" />}
                <div className="mb-2">Or enter this secret: <span className="font-mono bg-gray-800 px-2 py-1 rounded">{twoFASecret}</span></div>
                <input value={twoFAToken} onChange={e=>setTwoFAToken(e.target.value)} placeholder="Enter 6-digit code" className="px-2 py-1 rounded bg-gray-800 text-white border border-gray-700" />
                <button onClick={handle2FAVerify} className="ml-2 px-3 py-1 bg-blue-600 rounded text-white">Verify</button>
                {twoFAError && <div className="text-red-400 mt-2">{twoFAError}</div>}
                {twoFASuccess && <div className="text-green-400 mt-2">{twoFASuccess}</div>}
              </div>
            ) : (
              <div>
                <div className="mb-2">2FA is <span className="text-yellow-400">not enabled</span> on your account.</div>
                <button onClick={handle2FASetup} className="px-3 py-1 bg-blue-600 rounded text-white">Enable 2FA</button>
                {twoFAError && <div className="text-red-400 mt-2">{twoFAError}</div>}
                {twoFASuccess && <div className="text-green-400 mt-2">{twoFASuccess}</div>}
              </div>
            )}
          </div>
          <button onClick={handleSaveSettings} disabled={saving} className="px-4 py-2 bg-blue-600 rounded text-white">{saving ? 'Saving...' : 'Save Settings'}</button>
        </div>
      )}
      {tab==='moderation' && (
        <div>
          <h2 className="text-2xl font-bold mb-2">Content Moderation</h2>
          {flaggedContent.length === 0 ? <div>No flagged content.</div> : (
            <table className="w-full text-left bg-gray-800 rounded">
              <thead><tr><th>Content</th><th>User</th><th>Actions</th></tr></thead>
              <tbody>{flaggedContent.map((c:any)=>(<tr key={c.id}><td>{c.body}</td><td>{c.user}</td><td><button onClick={()=>handleApprove(c.id)} className="px-2 py-1 bg-green-600 rounded text-white">Approve</button><button onClick={()=>handleReject(c.id)} className="ml-2 px-2 py-1 bg-red-600 rounded text-white">Reject</button></td></tr>))}</tbody>
            </table>
          )}
        </div>
      )}
      {tab==='backup' && (
        <div>
          <h2 className="text-2xl font-bold mb-2">Backup & Restore</h2>
          <button onClick={handleBackup} className="px-4 py-2 bg-green-600 rounded text-white mr-2">Trigger Backup</button>
          <button onClick={handleRestore} className="px-4 py-2 bg-yellow-500 rounded text-black">Restore from File</button>
          <input type="file" onChange={handleFileUpload} className="mt-4" />
          {uploading && <div>Uploading: {uploadProgress}%</div>}
        </div>
      )}
      {tab==='errors' && (
        <div>
          <h2 className="text-2xl font-bold mb-2">Error Logs</h2>
          <button onClick={() => setStreaming(!streaming)} className="px-4 py-2 bg-blue-600 rounded text-white mb-4">
            {streaming ? 'Stop Streaming' : 'Start Streaming'}
          </button>
          {errors.length === 0 ? <div>No recent errors.</div> : (
            <table className="w-full text-left bg-gray-800 rounded">
              <thead><tr><th>Time</th><th>Message</th><th>Stack</th></tr></thead>
              <tbody>{errors.map((e:any)=>(<tr key={e.id}><td>{e.time}</td><td>{e.message}</td><td>{e.stack}</td></tr>))}</tbody>
            </table>
          )}
        </div>
      )}
      {tab==='notifications' && (
        <div>
          <h2 className="text-2xl font-bold mb-2">System Notifications</h2>
          <button onClick={handleSendNotification} className="px-4 py-2 bg-blue-600 rounded text-white">Send Notification</button>
          <div className="text-gray-400 mt-2">(List of sent notifications coming soon)</div>
        </div>
      )}
      {tab==='audit' && (
        <div>
          <h2 className="text-2xl font-bold mb-2">Audit Logs</h2>
          <button onClick={handleAuditExport} className="px-4 py-2 bg-blue-600 rounded text-white mb-4">
            {auditExporting ? 'Exporting...' : 'Export Audit Logs'}
          </button>
          {auditLogs.length === 0 ? <div>No recent admin actions.</div> : (
            <table className="w-full text-left bg-gray-800 rounded">
              <thead><tr><th>Time</th><th>Admin</th><th>Action</th></tr></thead>
              <tbody>{auditLogs.map((a:any)=>(<tr key={a.id}><td>{a.time}</td><td>{a.admin}</td><td>{a.action}</td></tr>))}</tbody>
            </table>
          )}
        </div>
      )}
      {toast && <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg">{toast}</div>}
    </div>
  );
};

// Data Export Panel
const DataExportPanel: React.FC = () => {
  const [error, setError] = React.useState<string | null>(null);
  const handleExport = async () => {
    setError(null);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch('/api/admin/export', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to export data');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'export.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Export failed');
    }
  };
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Data Export</h2>
      <div className="text-gray-400 mb-4">Export user and subscription data as CSV.</div>
      <button
        className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white font-semibold"
        onClick={handleExport}
      >
        Download CSV
      </button>
      {error && <div className="text-red-400 mt-4">{error}</div>}
    </div>
  );
};

// Stripe Webhook Event Log Panel
const StripeWebhookPanel: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const fetchEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/admin/stripe-webhooks');
      setEvents(res.data);
    } catch {
      setError('Failed to load events');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchEvents(); }, []);

  const handleRetry = async (id: string) => {
    try {
      await api.post('/api/admin/stripe-webhooks/retry', { id });
      setToast('Retry triggered');
      fetchEvents();
    } catch {
      setToast('Failed to retry');
    }
  };
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Stripe Webhook Event Log</h2>
      {loading ? <div>Loading...</div> : error ? <div className="text-red-500">{error}</div> : (
        <table className="w-full text-left bg-gray-800 rounded">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="py-2 px-3">ID</th>
              <th className="py-2 px-3">Type</th>
              <th className="py-2 px-3">Status</th>
              <th className="py-2 px-3">Created</th>
              <th className="py-2 px-3">Last Attempt</th>
              <th className="py-2 px-3">Error</th>
              <th className="py-2 px-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {events.map(ev => (
              <tr key={ev.id} className="border-b border-gray-700 hover:bg-gray-700">
                <td className="py-2 px-3 font-mono">{ev.id}</td>
                <td className="py-2 px-3">{ev.type}</td>
                <td className="py-2 px-3">{ev.status}</td>
                <td className="py-2 px-3">{ev.created ? new Date(ev.created).toLocaleString() : '-'}</td>
                <td className="py-2 px-3">{ev.lastAttempt ? new Date(ev.lastAttempt).toLocaleString() : '-'}</td>
                <td className="py-2 px-3 text-red-400">{ev.error || ''}</td>
                <td className="py-2 px-3">
                  {ev.status === 'failed' && (
                    <button onClick={() => handleRetry(ev.id)} className="px-2 py-1 bg-yellow-500 hover:bg-yellow-600 rounded text-black font-semibold">Retry</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {toast && <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg">{toast}</div>}
    </div>
  );
};

const AdminDashboard = () => {
  const auth = useAdminAuth() ?? {};
  const { adminUser, isAdminAuthenticated, loading, logout } = auth;
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAdminAuthenticated) {
      navigate('/admin/login');
    }
  }, [loading, isAdminAuthenticated, navigate]);

  const handleLogout = () => {
    if (logout) {
      logout();
      navigate('/admin/login');
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">Loading...</div>;
  }

  if (!isAdminAuthenticated) {
    return null;
  }

  return (
    <ThemeProvider>
      <div className="min-h-screen flex bg-gray-900 text-white">
        <AdminSidebar onLogout={handleLogout} />
        {/* Main Content */}
        <main className="flex-1 flex flex-col ml-0 md:ml-64">
          <AdminHeader email={adminUser?.email} />
          <Breadcrumbs />
          <div className="flex-1 overflow-y-auto">
            <Routes>
              <Route index element={<PanelLayout title="Overview">Overview panel coming soon.</PanelLayout>} />
              <Route path="users" element={<UsersPanel />} />
              <Route path="subscriptions" element={<SubscriptionsPanel />} />
              <Route path="analytics" element={<AnalyticsPanel />} />
              <Route path="parq" element={<ParqPanel />} />
              <Route path="content" element={<ContentPanel />} />
              <Route path="notifications" element={<NotificationsPanel />} />
              <Route path="system" element={<SystemManagementPanel />} />
              <Route path="settings" element={<PanelLayout title="Settings">Settings panel coming soon.</PanelLayout>} />
              <Route path="export" element={<DataExportPanel />} />
              <Route path="stripe-webhooks" element={<StripeWebhookPanel />} />
            </Routes>
          </div>
        </main>
      </div>
    </ThemeProvider>
  );
};

export default AdminDashboard; 