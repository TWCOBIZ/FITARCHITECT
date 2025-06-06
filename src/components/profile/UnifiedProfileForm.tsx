import React, { useState } from 'react';
import { useProfileContext } from '../../contexts/ProfileContext';
import { BasicProfileSchema, FitnessProfileSchema, NutritionProfileSchema } from '../../validation/profileValidation';
import { useValidation } from '../../hooks/useValidation';

const initialForm = {
  name: '', email: '', age: 18, gender: 'other', height: 170, weight: 70,
  fitnessGoals: '', availableEquipment: [], workoutFrequency: 3, sessionDuration: 45, experienceLevel: 'beginner',
  calorieGoal: 2000, activityLevel: 'moderate', dietaryPreferences: [], allergies: [],
  healthConditions: [], medications: [], physicalLimitations: [], parqCleared: false, subscriptionTier: 'free',
};

export const UnifiedProfileForm = () => {
  const { profile, updateProfile, loading, error } = useProfileContext();
  const [form, setForm] = useState(profile || initialForm);
  const { isValid, errors, validateField, validateAll } = useValidation(
    BasicProfileSchema.merge(FitnessProfileSchema).merge(NutritionProfileSchema),
    form
  );

  const handleChange = (field: string, value: any) => {
    setForm(f => ({ ...f, [field]: value }));
    validateField(field as any, value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll(form)) return;
    await updateProfile(form);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto bg-black text-white p-8 rounded-lg border border-gray-800 shadow-lg">
      <h2 className="text-3xl font-bold mb-6">Edit Profile</h2>
      {/* Basic Fields */}
      <div className="mb-4">
        <label className="block mb-1 font-semibold">Name</label>
        <input className="w-full p-2 rounded bg-gray-900 border border-gray-700 text-white" value={form.name} onChange={e => handleChange('name', e.target.value)} />
        {errors.name && <div className="text-red-400 text-sm mt-1">{errors.name}</div>}
      </div>
      <div className="mb-4">
        <label className="block mb-1 font-semibold">Email</label>
        <input className="w-full p-2 rounded bg-gray-900 border border-gray-700 text-white" value={form.email} onChange={e => handleChange('email', e.target.value)} />
        {errors.email && <div className="text-red-400 text-sm mt-1">{errors.email}</div>}
      </div>
      <div className="flex gap-4 mb-4">
        <div className="flex-1">
          <label className="block mb-1 font-semibold">Age</label>
          <input type="number" className="w-full p-2 rounded bg-gray-900 border border-gray-700 text-white" value={form.age} onChange={e => handleChange('age', Number(e.target.value))} />
          {errors.age && <div className="text-red-400 text-sm mt-1">{errors.age}</div>}
        </div>
        <div className="flex-1">
          <label className="block mb-1 font-semibold">Gender</label>
          <select className="w-full p-2 rounded bg-gray-900 border border-gray-700 text-white" value={form.gender} onChange={e => handleChange('gender', e.target.value)}>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
          {errors.gender && <div className="text-red-400 text-sm mt-1">{errors.gender}</div>}
        </div>
      </div>
      <div className="flex gap-4 mb-4">
        <div className="flex-1">
          <label className="block mb-1 font-semibold">Height (cm)</label>
          <input type="number" className="w-full p-2 rounded bg-gray-900 border border-gray-700 text-white" value={form.height} onChange={e => handleChange('height', Number(e.target.value))} />
          {errors.height && <div className="text-red-400 text-sm mt-1">{errors.height}</div>}
        </div>
        <div className="flex-1">
          <label className="block mb-1 font-semibold">Weight (kg)</label>
          <input type="number" className="w-full p-2 rounded bg-gray-900 border border-gray-700 text-white" value={form.weight} onChange={e => handleChange('weight', Number(e.target.value))} />
          {errors.weight && <div className="text-red-400 text-sm mt-1">{errors.weight}</div>}
        </div>
      </div>
      {/* Fitness Fields */}
      <div className="mb-4">
        <label className="block mb-1 font-semibold">Fitness Goals</label>
        <input className="w-full p-2 rounded bg-gray-900 border border-gray-700 text-white" value={form.fitnessGoals} onChange={e => handleChange('fitnessGoals', e.target.value)} />
        {errors.fitnessGoals && <div className="text-red-400 text-sm mt-1">{errors.fitnessGoals}</div>}
      </div>
      <div className="mb-4">
        <label className="block mb-1 font-semibold">Available Equipment (comma separated)</label>
        <input className="w-full p-2 rounded bg-gray-900 border border-gray-700 text-white" value={form.availableEquipment.join(', ')} onChange={e => handleChange('availableEquipment', e.target.value.split(',').map((s: string) => s.trim()))} />
      </div>
      <div className="flex gap-4 mb-4">
        <div className="flex-1">
          <label className="block mb-1 font-semibold">Workout Frequency (days/week)</label>
          <input type="number" className="w-full p-2 rounded bg-gray-900 border border-gray-700 text-white" value={form.workoutFrequency} onChange={e => handleChange('workoutFrequency', Number(e.target.value))} />
        </div>
        <div className="flex-1">
          <label className="block mb-1 font-semibold">Session Duration (min)</label>
          <input type="number" className="w-full p-2 rounded bg-gray-900 border border-gray-700 text-white" value={form.sessionDuration} onChange={e => handleChange('sessionDuration', Number(e.target.value))} />
        </div>
      </div>
      <div className="mb-4">
        <label className="block mb-1 font-semibold">Experience Level</label>
        <select className="w-full p-2 rounded bg-gray-900 border border-gray-700 text-white" value={form.experienceLevel} onChange={e => handleChange('experienceLevel', e.target.value)}>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>
      {/* Nutrition Fields */}
      <div className="mb-4">
        <label className="block mb-1 font-semibold">Calorie Goal</label>
        <input type="number" className="w-full p-2 rounded bg-gray-900 border border-gray-700 text-white" value={form.calorieGoal} onChange={e => handleChange('calorieGoal', Number(e.target.value))} />
      </div>
      <div className="mb-4">
        <label className="block mb-1 font-semibold">Activity Level</label>
        <select className="w-full p-2 rounded bg-gray-900 border border-gray-700 text-white" value={form.activityLevel} onChange={e => handleChange('activityLevel', e.target.value)}>
          <option value="sedentary">Sedentary</option>
          <option value="light">Light</option>
          <option value="moderate">Moderate</option>
          <option value="active">Active</option>
          <option value="very active">Very Active</option>
        </select>
      </div>
      <div className="mb-4">
        <label className="block mb-1 font-semibold">Dietary Preferences (comma separated)</label>
        <input className="w-full p-2 rounded bg-gray-900 border border-gray-700 text-white" value={form.dietaryPreferences.join(', ')} onChange={e => handleChange('dietaryPreferences', e.target.value.split(',').map((s: string) => s.trim()))} />
      </div>
      <div className="mb-4">
        <label className="block mb-1 font-semibold">Allergies (comma separated)</label>
        <input className="w-full p-2 rounded bg-gray-900 border border-gray-700 text-white" value={form.allergies.join(', ')} onChange={e => handleChange('allergies', e.target.value.split(',').map((s: string) => s.trim()))} />
      </div>
      {/* Health/PAR-Q Fields */}
      <div className="mb-4">
        <label className="block mb-1 font-semibold">Health Conditions (comma separated)</label>
        <input className="w-full p-2 rounded bg-gray-900 border border-gray-700 text-white" value={form.healthConditions.join(', ')} onChange={e => handleChange('healthConditions', e.target.value.split(',').map((s: string) => s.trim()))} />
      </div>
      <div className="mb-4">
        <label className="block mb-1 font-semibold">Medications (comma separated)</label>
        <input className="w-full p-2 rounded bg-gray-900 border border-gray-700 text-white" value={form.medications.join(', ')} onChange={e => handleChange('medications', e.target.value.split(',').map((s: string) => s.trim()))} />
      </div>
      <div className="mb-4">
        <label className="block mb-1 font-semibold">Physical Limitations (comma separated)</label>
        <input className="w-full p-2 rounded bg-gray-900 border border-gray-700 text-white" value={form.physicalLimitations.join(', ')} onChange={e => handleChange('physicalLimitations', e.target.value.split(',').map((s: string) => s.trim()))} />
      </div>
      <div className="mb-4 flex items-center gap-2">
        <input type="checkbox" checked={form.parqCleared} onChange={e => handleChange('parqCleared', e.target.checked)} />
        <label className="font-semibold">PAR-Q Cleared</label>
      </div>
      {/* Subscription */}
      <div className="mb-6">
        <label className="block mb-1 font-semibold">Subscription Tier</label>
        <select className="w-full p-2 rounded bg-gray-900 border border-gray-700 text-white" value={form.subscriptionTier} onChange={e => handleChange('subscriptionTier', e.target.value)}>
          <option value="free">Free</option>
          <option value="premium">Premium</option>
          <option value="pro">Pro</option>
        </select>
      </div>
      <button type="submit" className="w-full bg-white text-black font-bold py-3 rounded-lg shadow hover:bg-gray-200 transition-colors" disabled={loading}>
        {loading ? 'Saving...' : 'Save Profile'}
      </button>
      {error && <div className="text-red-400 text-center mt-4">{error.message}</div>}
    </form>
  );
}; 