import React from 'react';
import ThemeToggle from './ThemeToggle';

interface AdminHeaderProps {
  email?: string;
  children?: React.ReactNode;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({ email, children }) => (
  <header className="flex items-center justify-between px-8 py-4 border-b border-gray-700 bg-gray-900" aria-label="Header">
    <div className="flex items-center">
      <div className="text-2xl font-bold">Admin Dashboard</div>
      {children}
    </div>
    <div className="flex items-center">
      <span className="text-gray-300 mr-4">{email}</span>
      <ThemeToggle />
    </div>
  </header>
);

export default AdminHeader; 