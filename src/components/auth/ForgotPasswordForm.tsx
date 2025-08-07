import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../services/api';

interface ForgotPasswordFormProps {
  onBack: () => void;
}

const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.post('/api/password/request', { email: email.trim() });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-gray-900 p-8 rounded-lg shadow-2xl w-full max-w-md border border-gray-700"
      >
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Check Your Email</h2>
          <p className="text-gray-300 mb-6">
            If an account with that email exists, we've sent password reset instructions to:
          </p>
          <p className="text-blue-400 font-medium break-all">{email}</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h3 className="text-white font-medium mb-2">Next Steps:</h3>
          <ul className="text-gray-300 text-sm space-y-1">
            <li>• Check your email inbox</li>
            <li>• Look for an email from FitArchitect</li>
            <li>• Click the reset link (expires in 15 minutes)</li>
            <li>• Check spam folder if you don't see it</li>
          </ul>
        </div>

        <div className="space-y-3">
          <button
            onClick={onBack}
            className="w-full py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
          >
            Back to Login
          </button>
          
          <button
            onClick={() => {
              setSubmitted(false);
              setEmail('');
              setError(null);
            }}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            Send Another Email
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-gray-900 p-8 rounded-lg shadow-2xl w-full max-w-md border border-gray-700"
    >
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Reset Password</h2>
        <p className="text-gray-400">
          Enter your email address and we'll send you reset instructions
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your email"
            required
            disabled={loading}
          />
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
          disabled={loading}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium flex items-center justify-center"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Sending Reset Email...
            </>
          ) : (
            'Send Reset Email'
          )}
        </button>

        <button
          type="button"
          onClick={onBack}
          className="w-full py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
        >
          Back to Login
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-gray-400 text-sm">
          Remember your password?{' '}
          <button
            onClick={onBack}
            className="text-blue-400 hover:text-blue-300 font-medium"
          >
            Sign in instead
          </button>
        </p>
      </div>
    </motion.div>
  );
};

export default ForgotPasswordForm;