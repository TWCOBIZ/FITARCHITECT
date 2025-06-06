import React, { useState } from 'react';
import { useProfileContext } from '../../contexts/ProfileContext';
import { BasicProfileSchema } from '../../validation/profileValidation';
import { useValidation } from '../../hooks/useValidation';

const initialForm = { name: '', email: '', password: '', age: 18, gender: 'other' };

export const SingleRegistrationForm = () => {
  const { updateProfile, loading, error } = useProfileContext();
  const [form, setForm] = useState(initialForm);
  const { isValid, errors, validateField, validateAll } = useValidation(BasicProfileSchema.extend({ password: BasicProfileSchema.shape.name }), form);
  const [success, setSuccess] = useState(false);

  const handleChange = (field: string, value: any) => {
    setForm(f => ({ ...f, [field]: value }));
    validateField(field as any, value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll(form)) return;
    await updateProfile(form);
    setSuccess(true);
    // TODO: redirect to onboarding or dashboard
  };

  if (success) return <div className="text-white text-center p-8">Registration successful! Redirecting...</div>;

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto bg-black text-white p-8 rounded-lg border border-gray-800 shadow-lg">
      <h2 className="text-3xl font-bold mb-6">Register</h2>
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
      <div className="mb-4">
        <label className="block mb-1 font-semibold">Password</label>
        <input type="password" className="w-full p-2 rounded bg-gray-900 border border-gray-700 text-white" value={form.password} onChange={e => handleChange('password', e.target.value)} />
        {errors.password && <div className="text-red-400 text-sm mt-1">{errors.password}</div>}
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
      <button type="submit" className="w-full bg-white text-black font-bold py-3 rounded-lg shadow hover:bg-gray-200 transition-colors" disabled={loading}>
        {loading ? 'Registering...' : 'Register'}
      </button>
      {error && <div className="text-red-400 text-center mt-4">{error.message}</div>}
    </form>
  );
}; 