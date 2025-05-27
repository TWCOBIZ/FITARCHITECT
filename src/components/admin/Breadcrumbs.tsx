import React from 'react';
import { useLocation, Link } from 'react-router-dom';

const panelLabels: Record<string, string> = {
  '': 'Overview',
  users: 'Users',
  subscriptions: 'Subscriptions',
  analytics: 'Analytics',
  parq: 'PAR-Q',
  content: 'Content',
  notifications: 'Notifications',
  system: 'System Health',
  settings: 'Settings',
  export: 'Export',
};

const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const path = location.pathname.replace(/^\/admin\/dashboard\/?/, '');
  const segments = path.split('/').filter(Boolean);
  const crumbs = ['dashboard', ...segments];

  return (
    <nav className="text-sm text-gray-400 py-2 px-8" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        <li>
          <Link to="/admin/dashboard" className="hover:underline text-blue-400">Dashboard</Link>
        </li>
        {segments.map((seg, idx) => {
          const url = '/admin/dashboard/' + segments.slice(0, idx + 1).join('/');
          return (
            <li key={url} className="flex items-center">
              <span className="mx-2">/</span>
              <Link to={url} className="hover:underline text-blue-400">{panelLabels[seg] || seg}</Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumbs; 