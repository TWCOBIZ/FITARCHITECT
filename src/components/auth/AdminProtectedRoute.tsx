import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

const AdminProtectedRoute = ({ children }) => {
  const { isAdminAuthenticated, loading } = useAdminAuth();
  if (loading) return <div className="text-center py-10 text-gray-400">Loading...</div>;
  if (!isAdminAuthenticated) return <Navigate to="/admin/login" replace />;
  return children;
};

export default AdminProtectedRoute; 