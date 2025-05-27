import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

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
  { path: 'export', label: 'Export' },
];

const AdminSidebar: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  return (
    <aside className={`w-64 bg-gray-800 flex flex-col py-8 px-4 border-r border-gray-700 fixed md:static z-20 h-full md:h-auto transition-transform ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`} aria-label="Sidebar">
      <button className="md:hidden mb-4 text-white" onClick={() => setOpen(o => !o)} aria-label="Toggle sidebar">
        {open ? '✖' : '☰'}
      </button>
      <div className="mb-8 text-2xl font-bold text-blue-400">Admin</div>
      <nav className="flex-1 space-y-2" aria-label="Main navigation">
        {panels.map(panel => {
          const to = panel.path ? `/admin/dashboard/${panel.path}` : '/admin/dashboard';
          const active = location.pathname === to;
          return (
            <Link
              key={panel.path}
              to={to}
              className={`block px-3 py-2 rounded transition-colors ${active ? 'bg-gray-700 text-blue-400' : 'hover:bg-gray-700'}`}
              tabIndex={0}
            >
              {panel.label}
            </Link>
          );
        })}
      </nav>
      <button
        onClick={onLogout}
        className="mt-8 px-3 py-2 bg-red-600 hover:bg-red-700 rounded text-white font-semibold"
      >
        Logout
      </button>
    </aside>
  );
};

export default AdminSidebar; 