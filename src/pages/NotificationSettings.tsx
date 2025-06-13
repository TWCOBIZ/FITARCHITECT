import React from 'react';
import { motion } from 'framer-motion';
import NotificationPreferences from '../components/settings/NotificationPreferences';

const NotificationSettings: React.FC = () => {
  return (
    <div className="min-h-screen bg-black text-white p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto"
      >
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Notification Settings</h1>
          <p className="text-gray-400">Manage your Telegram notifications and preferences</p>
        </div>

        {/* Telegram Integration */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-gray-900 rounded-lg p-6 mb-6"
        >
          <h2 className="text-2xl font-semibold mb-4 flex items-center">
            <span className="mr-3">📲</span>
            Telegram Integration
          </h2>
          <NotificationPreferences />
        </motion.div>

        {/* Premium Feature Notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-gradient-to-r from-purple-900 to-blue-900 rounded-lg p-4 border border-purple-500"
        >
          <div className="flex items-center">
            <span className="text-2xl mr-3">⭐</span>
            <div>
              <h3 className="font-semibold">Premium Feature</h3>
              <p className="text-sm text-gray-300">
                Telegram notifications are available for Premium subscribers only.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-6 bg-gray-900 rounded-lg p-6"
        >
          <h3 className="text-xl font-semibold mb-4">How to Set Up Telegram Notifications</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>Open Telegram and search for the FitArchitect bot</li>
            <li>Start a conversation with the bot by sending /start</li>
            <li>Copy your Chat ID from the bot response</li>
            <li>Paste the Chat ID in the form above</li>
            <li>Configure your notification preferences</li>
            <li>Save your settings to start receiving notifications</li>
          </ol>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default NotificationSettings;