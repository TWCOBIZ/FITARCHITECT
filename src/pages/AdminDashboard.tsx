import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import AdminSidebar from '../components/admin/AdminSidebar';
import AdminHeader from '../components/admin/AdminHeader';
import Breadcrumbs from '../components/admin/Breadcrumbs';
import { ThemeProvider } from '../contexts/ThemeContext';
import PanelLayout from '../components/admin/PanelLayout';
import { Dialog } from '@headlessui/react';
import ConfirmationModal from '../components/common/ConfirmationModal';
import CustomExercisesPanel from '../components/admin/CustomExercisesPanel';
import ExerciseMediaPanel from '../components/admin/ExerciseMediaPanel';
import ExerciseRegistryPanel from '../components/admin/ExerciseRegistryPanel';
import WorkoutBuilderPanel from '../components/admin/WorkoutBuilderPanel';
import SettingsPanel from '../components/admin/SettingsPanel';
import OverviewPanel from '../components/admin/OverviewPanel';

const panels = [
  { path: '', label: 'Overview', icon: '📊' },
  { path: 'exercise-registry', label: 'Exercise Registry', icon: '📚' },
  { path: 'users', label: 'Users', icon: '👥' },
  { path: 'exercises', label: 'Exercises', icon: '💪' },
  { path: 'workout-builder', label: 'Workout Builder', icon: '🏗️' },
  { path: 'exercise-media', label: 'Exercise Media', icon: '🎬' },
  { path: 'settings', label: 'Settings', icon: '⚙️' },
];

type PanelPlaceholderProps = { label: string };
const PanelPlaceholder = ({ label }: PanelPlaceholderProps) => (
  <div className="p-8 text-center text-gray-300 text-xl">{label} panel coming soon.</div>
);

// Users Panel
const UsersPanel: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [role, setRole] = useState('all');
  const [sort, setSort] = useState('createdAt-desc');
  const [editUser, setEditUser] = useState<any | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void} | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { logout, isAuthenticated, user } = useAuth();

  const fetchUsers = () => {
    setUsersLoading(true);
    api.get('/api/admin/users')
      .then(res => {
        // Handle both array and paginated response formats
        const usersData = Array.isArray(res.data) 
          ? res.data 
          : res.data.users || [];
        setUsers(usersData);
      })
      .catch(() => {
        setError('Failed to load users');
        // Ensure users is always an array even on error
        setUsers([]);
      })
      .finally(() => setUsersLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  // Filtering, sorting logic with safety guard
  const filtered = (users || []).filter(u => {
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
      toast.success('User updated successfully');
      fetchUsers();
      handleCloseEdit();
    } catch {
      toast.error('Failed to update user');
    }
  };

  const handleActivate = async (user: any) => {
    setConfirmModal({
      isOpen: true,
      title: `${user.active ? 'Deactivate' : 'Activate'} User`,
      message: `Are you sure you want to ${user.active ? 'deactivate' : 'activate'} this user?`,
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          await api.post(`/api/admin/users/${user.id}/${user.active ? 'deactivate' : 'activate'}`);
          toast.success(`User ${user.active ? 'deactivated' : 'activated'} successfully`);
          fetchUsers();
        } catch {
          toast.error('Failed to update user status');
        } finally {
          setIsProcessing(false);
          setConfirmModal(null);
        }
      }
    });
  };

  const handleResetPassword = async (user: any) => {
    const newPassword = window.prompt('Enter new password for this user:');
    if (!newPassword) return;
    
    setConfirmModal({
      isOpen: true,
      title: 'Reset User Password',
      message: `Are you sure you want to reset the password for ${user.name || user.email}?`,
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          await api.post(`/api/admin/users/${user.id}/reset-password`, { newPassword });
          toast.success('Password reset successfully');
        } catch {
          toast.error('Failed to reset password');
        } finally {
          setIsProcessing(false);
          setConfirmModal(null);
        }
      }
    });
  };

  const handlePromote = async (user: any) => {
    const action = user.isAdmin ? 'Demote' : 'Promote';
    
    setConfirmModal({
      isOpen: true,
      title: `${action} User Role`,
      message: `Are you sure you want to ${action.toLowerCase()} ${user.name || user.email} ${user.isAdmin ? 'from admin to user' : 'to admin'}?`,
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          await api.post(`/api/admin/users/${user.id}/role`, { isAdmin: !user.isAdmin });
          toast.success(user.isAdmin ? 'User demoted' : 'User promoted to admin');
          fetchUsers();
        } catch {
          toast.error('Failed to update user role');
        } finally {
          setIsProcessing(false);
          setConfirmModal(null);
        }
      }
    });
  };

  const handleSelectUsers = (ids: string[]) => {
    setSelectedUsers(ids);
  };

  const handleBulkActivate = async () => {
    if (selectedUsers.length === 0) return;
    
    setConfirmModal({
      isOpen: true,
      title: 'Activate Selected Users',
      message: `Are you sure you want to activate ${selectedUsers.length} selected user${selectedUsers.length > 1 ? 's' : ''}?`,
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          await Promise.all(selectedUsers.map(id => api.post(`/api/admin/users/${id}/activate`)));
          toast.success(`Selected users activated`);
          fetchUsers();
          setSelectedUsers([]);
        } catch {
          toast.error('Failed to activate selected users');
        } finally {
          setIsProcessing(false);
          setConfirmModal(null);
        }
      }
    });
  };

  const handleBulkDeactivate = async () => {
    if (selectedUsers.length === 0) return;
    
    setConfirmModal({
      isOpen: true,
      title: 'Deactivate Selected Users',
      message: `Are you sure you want to deactivate ${selectedUsers.length} selected user${selectedUsers.length > 1 ? 's' : ''}?`,
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          await Promise.all(selectedUsers.map(id => api.post(`/api/admin/users/${id}/deactivate`)));
          toast.success(`Selected users deactivated`);
          fetchUsers();
          setSelectedUsers([]);
        } catch {
          toast.error('Failed to deactivate selected users');
        } finally {
          setIsProcessing(false);
          setConfirmModal(null);
        }
      }
    });
  };

  const handleBulkDelete = async () => {
    if (selectedUsers.length === 0) return;
    
    setConfirmModal({
      isOpen: true,
      title: 'Delete Selected Users',
      message: `Are you sure you want to permanently delete ${selectedUsers.length} selected user${selectedUsers.length > 1 ? 's' : ''}? This action cannot be undone.`,
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          await Promise.all(selectedUsers.map(id => api.delete(`/api/admin/users/${id}`)));
          toast.success(`Selected users deleted`);
          fetchUsers();
          setSelectedUsers([]);
        } catch {
          toast.error('Failed to delete selected users');
        } finally {
          setIsProcessing(false);
          setConfirmModal(null);
        }
      }
    });
  };

  const handleImpersonate = async (user: any) => {
    setConfirmModal({
      isOpen: true,
      title: 'Impersonate User',
      message: `Are you sure you want to impersonate ${user.name || user.email}? You will be logged in as this user.`,
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          const res = await api.post(`/api/admin/impersonate`, { userId: user.id });
          localStorage.setItem('impersonationToken', res.data.token);
          toast.success(`Impersonating as ${user.email}`);
          window.location.href = '/dashboard'; // or wherever the user dashboard is
        } catch {
          toast.error('Failed to impersonate');
        } finally {
          setIsProcessing(false);
          setConfirmModal(null);
        }
      }
    });
  };


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
      {usersLoading ? <div>Loading...</div> : error ? <div className="text-red-500">{error}</div> : (
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
                  {user && (
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
      
      {/* Confirmation Modal */}
      {confirmModal && (
        <ConfirmationModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal(null)}
          onConfirm={confirmModal.onConfirm}
          title={confirmModal.title}
          message={confirmModal.message}
          type="warning"
          isLoading={isProcessing}
        />
      )}
    </div>
  );
};









const AdminDashboard = () => {
  const { logout, isAuthenticated, user } = useAuth();
  // Admin auth handled by unified context
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/admin/login');
    }
  }, [isAuthenticated, navigate]);

  const handleLogout = () => {
    if (logout) {
      logout();
      navigate('/admin/login');
    }
  };

  if (!isAuthenticated) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <ThemeProvider>
      <div className="min-h-screen flex bg-gray-900 text-white">
        <AdminSidebar onLogout={handleLogout} />
        {/* Main Content */}
        <main className="flex-1 flex flex-col ml-0 md:ml-64">
          <AdminHeader email={user?.email} />
          <Breadcrumbs />
          <div className="flex-1 overflow-y-auto">
            <Routes>
              <Route index element={<OverviewPanel />} />
              <Route path="exercise-registry" element={<ExerciseRegistryPanel />} />
              <Route path="users" element={<UsersPanel />} />
              <Route path="exercises" element={<CustomExercisesPanel />} />
              <Route path="workout-builder" element={<WorkoutBuilderPanel />} />
              <Route path="exercise-media" element={<ExerciseMediaPanel />} />
              <Route path="settings" element={<SettingsPanel />} />
            </Routes>
          </div>
        </main>
      </div>
    </ThemeProvider>
  );
};

export default AdminDashboard; 