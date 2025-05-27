import React from 'react';
import { useNavigate } from 'react-router-dom';

const SubscriptionSuccess: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white px-4">
      <h1 className="text-3xl font-bold mb-6">Subscription Successful!</h1>
      <p className="mb-4 text-lg text-center max-w-xl">
        Thank you for subscribing! Your access has been upgraded and you now have access to premium features.
      </p>
      <ol className="mb-8 text-left max-w-xl list-decimal list-inside space-y-2">
        <li>
          <span className="font-semibold">Complete your profile information</span> so we can personalize your experience.
          <button onClick={() => navigate('/fitness-profile')} className="ml-2 underline text-blue-400 hover:text-blue-200">Go to Profile</button>
        </li>
        <li>
          <span className="font-semibold">Create your first workout plan</span> to get started on your fitness journey.
          <button onClick={() => navigate('/workouts')} className="ml-2 underline text-blue-400 hover:text-blue-200">Create Workout</button>
        </li>
        <li>
          <span className="font-semibold">Explore other features</span> like nutrition tracking and meal planning from the dashboard.
          <button onClick={() => navigate('/dashboard')} className="ml-2 underline text-blue-400 hover:text-blue-200">Go to Dashboard</button>
        </li>
      </ol>
      <p className="text-gray-400 text-center max-w-xl">If you have any questions or need help, contact support from your profile page.</p>
    </div>
  );
};

export default SubscriptionSuccess; 