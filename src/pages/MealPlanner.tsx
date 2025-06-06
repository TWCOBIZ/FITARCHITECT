import { useNutritionProfile } from '../hooks/useNutritionProfile';

const MealPlanner = () => {
  const nutritionProfile = useNutritionProfile();
  return (
    <div>
      {/* Render meal planning UI using nutritionProfile */}
      <div>Nutrition Profile: {JSON.stringify(nutritionProfile)}</div>
    </div>
  );
};

export default MealPlanner; 