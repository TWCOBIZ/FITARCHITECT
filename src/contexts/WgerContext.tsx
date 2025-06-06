import React, { createContext, useContext, useState, useEffect } from 'react';
import { Exercise } from '../types/workout';
import { api } from '../services/api'
import { mapWgerExerciseToCanonical } from '../services/wgerService'

interface WgerContextType {
  exercises: Exercise[];
  isLoading: boolean;
  error: string | null;
  getExercises: () => Promise<Exercise[]>;
  getExerciseById: (id: string) => Promise<Exercise | null>;
}

const WgerContext = createContext<WgerContextType | undefined>(undefined);

// Define a type for the raw exercise object returned by the API
interface RawWgerExercise {
  id: number;
  name: string;
  description: string;
  muscles: { name: string }[];
  equipment: { name: string }[];
  difficulty?: string;
  instructions?: string;
}

export const WgerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getExercises = async (): Promise<Exercise[]> => {
    setIsLoading(true);
    setError(null);
    const baseUrl = import.meta.env.VITE_WGER_API_URL;
    if (!baseUrl) {
      setError('WGER API URL is not configured.');
      setIsLoading(false);
      return [];
    }
    try {
      const response = await fetch(`${baseUrl}/exercise/`, {
        headers: {
          'Authorization': `Token ${import.meta.env.VITE_WGER_API_TOKEN}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch exercises');
      }

      const data = await response.json();
      const formattedExercises = data.results.map((exercise: RawWgerExercise) => mapWgerExerciseToCanonical({
        id: exercise.id,
        name: exercise.name,
        muscles: exercise.muscles.map((m) => m.name),
        equipment: exercise.equipment.map((e) => e.name),
        description: exercise.description,
        difficulty: exercise.difficulty,
        instructions: exercise.instructions ? [exercise.instructions] : [],
      }));

      setExercises(formattedExercises);
      return formattedExercises;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const getExerciseById = async (id: string): Promise<Exercise | null> => {
    const baseUrl = import.meta.env.VITE_WGER_API_URL;
    if (!baseUrl) {
      setError('WGER API URL is not configured.');
      return null;
    }
    try {
      const response = await fetch(`${baseUrl}/exercise/${id}/`, {
        headers: {
          'Authorization': `Token ${import.meta.env.VITE_WGER_API_TOKEN}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch exercise');
      }

      const exercise = await response.json();
      const raw: RawWgerExercise = exercise;
      return mapWgerExerciseToCanonical({
        id: raw.id,
        name: raw.name,
        muscles: raw.muscles.map((m) => m.name),
        equipment: raw.equipment.map((e) => e.name),
        description: raw.description,
        difficulty: raw.difficulty,
        instructions: raw.instructions ? [raw.instructions] : [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  };

  useEffect(() => {
    getExercises().catch(console.error);
  }, []);

  return (
    <WgerContext.Provider value={{ exercises, isLoading, error, getExercises, getExerciseById }}>
      {children}
    </WgerContext.Provider>
  );
};

export const useWger = () => {
  const context = useContext(WgerContext);
  if (context === undefined) {
    throw new Error('useWger must be used within a WgerProvider');
  }
  return context;
}; 