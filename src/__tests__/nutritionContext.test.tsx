import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { NutritionProvider, useNutrition } from '../contexts/NutritionContext';

const TestComponent = () => {
  const { dailyLog, addFoodEntry, updateFoodEntry, removeFoodEntry, getAnalytics, analytics, error } = useNutrition();
  return <div>{JSON.stringify({ dailyLog, analytics, error })}</div>;
};

describe('NutritionContext', () => {
  it('should add, update, and remove food entries', async () => {
    const wrapper = ({ children }) => <NutritionProvider>{children}</NutritionProvider>;
    const { getByText } = render(<TestComponent />, { wrapper });
    // Add food entry
    await act(async () => {
      await useNutrition().addFoodEntry({ name: 'Test Food', calories: 100, protein: 10, carbs: 20, fat: 5, servingSize: '1', servingUnit: 'g' });
    });
    await waitFor(() => expect(getByText(/Test Food/)).toBeTruthy());
    // Update food entry
    await act(async () => {
      await useNutrition().updateFoodEntry(0, { name: 'Updated Food', calories: 200, protein: 20, carbs: 40, fat: 10, servingSize: '2', servingUnit: 'g' });
    });
    await waitFor(() => expect(getByText(/Updated Food/)).toBeTruthy());
    // Remove food entry
    await act(async () => {
      await useNutrition().removeFoodEntry(0);
    });
    await waitFor(() => expect(getByText(/Updated Food/)).toBeFalsy());
  });

  it('should fetch analytics', async () => {
    const wrapper = ({ children }) => <NutritionProvider>{children}</NutritionProvider>;
    const { getByText } = render(<TestComponent />, { wrapper });
    await act(async () => {
      await useNutrition().getAnalytics();
    });
    await waitFor(() => expect(getByText(/analytics/)).toBeTruthy());
  });

  it('should handle errors', async () => {
    const wrapper = ({ children }) => <NutritionProvider>{children}</NutritionProvider>;
    const { getByText } = render(<TestComponent />, { wrapper });
    // Simulate error by passing invalid data
    await act(async () => {
      await useNutrition().addFoodEntry({ name: '', calories: -1, protein: -1, carbs: -1, fat: -1, servingSize: '', servingUnit: '' });
    });
    await waitFor(() => expect(getByText(/error/i)).toBeTruthy());
  });
}); 