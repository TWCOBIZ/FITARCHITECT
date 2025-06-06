import React from 'react';
import { UnifiedProfileForm } from '../components/profile/UnifiedProfileForm';

const Profile: React.FC = () => {
  return (
    <div className="min-h-screen bg-black text-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold mb-8">Your Profile</h2>
        <UnifiedProfileForm />
      </div>
    </div>
  );
};

export default Profile; 