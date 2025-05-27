import React from 'react';

interface PanelLayoutProps {
  title: string;
  loading?: boolean;
  error?: string | null;
  children: React.ReactNode;
}

const PanelLayout: React.FC<PanelLayoutProps> = ({ title, loading, error, children }) => (
  <div className="p-6">
    <h2 className="text-2xl font-bold mb-4">{title}</h2>
    {loading ? <div>Loading...</div> : error ? <div className="text-red-500 mb-4">{error}</div> : children}
  </div>
);

export default PanelLayout; 