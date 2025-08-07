import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AdminLogin = () => {
  const { adminLogin, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    
    // Validate inputs
    if (!email || !password) {
      setFormError('Please enter both email and password');
      return;
    }
    
    try {
      console.log('Attempting admin login with:', { email, passwordLength: password.length });
      await adminLogin(email, password);
      navigate('/admin/dashboard');
    } catch (error) {
      console.error('Admin login error:', error);
      console.error('Error response:', error.response);
      console.error('Error data:', error.response?.data);
      
      // Show more specific error if available
      if (error.response?.data?.error) {
        setFormError(error.response.data.error);
      } else if (error.response?.status === 401) {
        setFormError('Invalid email or password');
      } else {
        setFormError('Login failed. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-black">
      <form onSubmit={handleSubmit} className="bg-gray-800 p-8 rounded-xl shadow-md w-full max-w-sm">
        <h2 className="text-2xl font-bold mb-6 text-center">Admin Login</h2>
        <div className="mb-4">
          <label className="block mb-1 text-gray-300">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-3 py-2 rounded bg-gray-900 text-white border border-gray-700 focus:outline-none"
            required
            autoFocus
          />
        </div>
        <div className="mb-4">
          <label className="block mb-1 text-gray-300">Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-3 py-2 rounded bg-gray-900 text-white border border-gray-700 focus:outline-none"
            required
            minLength={6}
          />
        </div>
        {formError && <div className="text-red-500 mb-4 text-sm">{formError}</div>}
        <button
          type="submit"
          className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded text-white font-semibold transition-colors"
          disabled={isLoading}
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
};

export default AdminLogin; 