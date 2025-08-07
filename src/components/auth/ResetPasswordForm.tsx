import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';

const ResetPasswordForm: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenValid, setTokenValid] = useState(false);
  const [email, setEmail] = useState('');

  // Password strength validation
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    lowercase: false,
    uppercase: false,
    number: false,
    match: false
  });

  useEffect(() => {
    if (!token) {
      setError('Invalid reset link');
      setVerifying(false);
      return;
    }

    // Verify token validity
    const verifyToken = async () => {
      try {
        const response = await api.get(`/api/password/verify/${token}`);
        setTokenValid(true);
        setEmail(response.data.email);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Invalid or expired reset link');
        setTokenValid(false);
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  useEffect(() => {
    // Update password strength indicators
    setPasswordStrength({
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      match: password === confirmPassword && password.length > 0
    });
  }, [password, confirmPassword]);

  const isPasswordValid = Object.values(passwordStrength).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isPasswordValid) {
      setError('Please ensure your password meets all requirements');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.post('/api/password/reset', {
        token,
        password
      });
      
      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login', { 
          state: { message: 'Password reset successfully. Please log in with your new password.' }
        });
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-gray-900 p-8 rounded-lg shadow-2xl w-full max-w-md border border-gray-700 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-bold text-white mb-2">Verifying Reset Link</h2>
          <p className="text-gray-400">Please wait while we verify your reset token...</p>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900 p-8 rounded-lg shadow-2xl w-full max-w-md border border-gray-700 text-center"
        >
          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Invalid Reset Link</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          
          <div className="space-y-3">
            <button
              onClick={() => navigate('/login')}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
            >
              Back to Login
            </button>
            <button
              onClick={() => navigate('/forgot-password')}
              className="w-full py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
            >
              Request New Reset Link
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900 p-8 rounded-lg shadow-2xl w-full max-w-md border border-gray-700 text-center"
        >
          <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Password Reset Complete!</h2>
          <p className="text-gray-300 mb-6">
            Your password has been successfully reset. You can now log in with your new password.
          </p>
          
          <div className="bg-gray-800 rounded-lg p-4 mb-6">
            <p className="text-gray-300 text-sm">
              Redirecting to login page in 3 seconds...
            </p>
          </div>

          <button
            onClick={() => navigate('/login')}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            Go to Login Now
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-gray-900 p-8 rounded-lg shadow-2xl w-full max-w-md border border-gray-700"
      >
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">Set New Password</h2>
          <p className="text-gray-400 mb-2">
            Enter a new password for your account
          </p>
          <p className="text-blue-400 text-sm font-medium">{email}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
              New Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter new password"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Confirm new password"
              required
              disabled={loading}
            />
          </div>

          {/* Password strength indicators */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-white font-medium mb-3">Password Requirements:</h4>
            <div className="space-y-2">
              {[
                { key: 'length', label: 'At least 8 characters' },
                { key: 'lowercase', label: 'One lowercase letter' },
                { key: 'uppercase', label: 'One uppercase letter' },
                { key: 'number', label: 'One number' },
                { key: 'match', label: 'Passwords match' }
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center">
                  <div className={`w-4 h-4 rounded-full mr-3 flex items-center justify-center ${
                    passwordStrength[key as keyof typeof passwordStrength] 
                      ? 'bg-green-600' 
                      : 'bg-gray-600'
                  }`}>
                    {passwordStrength[key as keyof typeof passwordStrength] && (
                      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <span className={`text-sm ${
                    passwordStrength[key as keyof typeof passwordStrength] 
                      ? 'text-green-400' 
                      : 'text-gray-400'
                  }`}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-900/50 border border-red-500 rounded-lg p-3"
            >
              <p className="text-red-200 text-sm">{error}</p>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading || !isPasswordValid}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium flex items-center justify-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Resetting Password...
              </>
            ) : (
              'Reset Password'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/login')}
            className="text-gray-400 hover:text-gray-300 text-sm"
          >
            Back to Login
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPasswordForm;