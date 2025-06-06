import React, { useState } from 'react';
import { useProfileContext } from '../../contexts/ProfileContext';
import { useValidation } from '../../hooks/useValidation';
import { BasicProfileSchema, FitnessProfileSchema, NutritionProfileSchema } from '../../validation/profileValidation';

const steps = [
  { label: 'Physical Stats', fields: ['name', 'age', 'gender', 'height', 'weight'] },
  { label: 'Fitness', fields: ['fitnessGoals', 'availableEquipment', 'workoutFrequency', 'sessionDuration', 'experienceLevel'] },
  { label: 'Nutrition', fields: ['calorieGoal', 'activityLevel', 'dietaryPreferences', 'allergies'] },
  { label: 'PAR-Q', fields: ['healthConditions', 'medications', 'physicalLimitations', 'parqCleared'] },
  { label: 'Subscription', fields: ['subscriptionTier'] },
];

const initialForm = {
  name: '', age: 18, gender: 'other', height: 170, weight: 70,
  fitnessGoals: '', availableEquipment: [], workoutFrequency: 3, sessionDuration: 45, experienceLevel: 'beginner',
  calorieGoal: 2000, activityLevel: 'moderate', dietaryPreferences: [], allergies: [],
  healthConditions: [], medications: [], physicalLimitations: [], parqCleared: false, subscriptionTier: 'free',
};

export const ProfileOnboardingStepper = () => {
  const { updateProfile, loading, error } = useProfileContext();
  const [form, setForm] = useState(initialForm);
  const [step, setStep] = useState(0);
  const { errors, validateField, validateAll } = useValidation(
    BasicProfileSchema.merge(FitnessProfileSchema).merge(NutritionProfileSchema),
    form
  );

  const handleChange = (field: string, value: any) => {
    setForm(f => ({ ...f, [field]: value }));
    validateField(field as any, value);
  };

  const handleNext = async () => {
    if (!validateAll(form)) return;
    if (step < steps.length - 1) setStep(s => s + 1);
    else await updateProfile(form);
  };

  const handleBack = () => setStep(s => Math.max(0, s - 1));

  const renderFields = () => {
    return steps[step].fields.map(field => (
      <div className="mb-4" key={field}>
        <label className="block mb-1 font-semibold capitalize">{field.replace(/([A-Z])/g, ' $1')}</label>
        <input
          className="w-full p-2 rounded bg-gray-900 border border-gray-700 text-white"
          value={form[field] ?? ''}
          onChange={e => handleChange(field, e.target.value)}
        />
        {errors[field] && <div className="text-red-400 text-sm mt-1">{errors[field]}</div>}
      </div>
    ));
  };

  return (
    <div className="max-w-xl mx-auto bg-black text-white p-8 rounded-lg border border-gray-800 shadow-lg">
      <div className="flex items-center mb-6">
        {steps.map((s, i) => (
          <div key={i} className={`flex-1 h-2 rounded ${i <= step ? 'bg-white' : 'bg-gray-700'} mx-1`} />
        ))}
      </div>
      <h2 className="text-2xl font-bold mb-4">{steps[step].label}</h2>
      {renderFields()}
      <div className="flex justify-between mt-6">
        <button onClick={handleBack} disabled={step === 0} className="bg-gray-700 text-white px-4 py-2 rounded disabled:opacity-50">Back</button>
        <button onClick={handleNext} className="bg-white text-black px-4 py-2 rounded font-bold">
          {step === steps.length - 1 ? (loading ? 'Saving...' : 'Finish') : 'Next'}
        </button>
      </div>
      {error && <div className="text-red-400 text-center mt-4">{error.message}</div>}
    </div>
  );
}; 