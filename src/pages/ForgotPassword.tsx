import React from 'react';
import { useNavigate } from 'react-router-dom';
import ForgotPasswordForm from '../components/auth/ForgotPasswordForm';

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <ForgotPasswordForm onBack={handleBack} />
    </div>
  );
};

export default ForgotPassword;