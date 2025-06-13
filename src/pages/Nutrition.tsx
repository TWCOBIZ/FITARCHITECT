import React, { useEffect } from 'react';
import NutritionSummary from '../components/nutrition/NutritionSummary';
import NutritionLogForm from '../components/nutrition/NutritionLogForm';
import NutritionHistory from '../components/nutrition/NutritionHistory';
import NutritionAnalytics from '../components/nutrition/NutritionAnalytics';
import { useAuth } from '../contexts/AuthContext'
import { isProfileComplete } from '../utils/profile'
import { useNavigate } from 'react-router-dom'

const Nutrition: React.FC = () => {
  const { user } = useAuth(); // user.profile is available for all nutrition features
  const navigate = useNavigate();

  useEffect(() => {
    // Allow guests to access nutrition features without complete profile
    if (user && !user.isGuest && user.type !== 'guest' && !isProfileComplete(user)) {
      navigate('/profile', { state: { from: '/nutrition', message: 'Please complete your profile to use nutrition features.' } });
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 text-white">Nutrition Tracker</h1>
        <NutritionSummary />
        <NutritionLogForm />
        <NutritionHistory />
        <NutritionAnalytics />
        {/* NutritionHistory will be added in 20.3 */}
      </div>
    </div>
  );
};

export default Nutrition; 