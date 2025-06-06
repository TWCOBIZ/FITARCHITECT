import React, { createContext, useContext, useState, useCallback } from 'react';
import { Profile, ProfileUpdate, NutritionProfile } from '../types/user';
import { validateProfile } from '../validation/profileValidation';
import { applyOptimisticUpdate, rollbackOptimisticUpdate } from '../utils/optimisticUpdates';
import { handleProfileError, ProfileError } from '../utils/errorHandling';

interface ProfileContextValue {
  profile: Profile | null;
  updateProfile: (update: ProfileUpdate) => Promise<void>;
  loading: boolean;
  error: ProfileError | null;
  lastKnownGoodProfile: Profile | null;
  optimisticProfile: Profile | null;
  nutritionProfile: NutritionProfile | null;
  updateNutritionProfile: (profile: NutritionProfile) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [optimisticProfile, setOptimisticProfile] = useState<Profile | null>(null);
  const [lastKnownGoodProfile, setLastKnownGoodProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ProfileError | null>(null);
  const [nutritionProfile, setNutritionProfile] = useState<NutritionProfile | null>(null);

  // Stub: Fetch initial profile (to be implemented)
  // useEffect(() => { ... }, []);

  const updateProfile = useCallback(async (update: ProfileUpdate) => {
    setLoading(true);
    setError(null);
    // Validate update
    const validation = validateProfile(update);
    if (!validation.isValid) {
      setError({ type: 'validation', message: 'Validation failed', fieldErrors: validation.errors });
      setLoading(false);
      return;
    }
    // Optimistic update
    setLastKnownGoodProfile(profile);
    const nextProfile = applyOptimisticUpdate(profile, update);
    setOptimisticProfile(nextProfile);
    setProfile(nextProfile);
    let attempt = 0;
    let success = false;
    let lastError: any = null;
    while (attempt < 3 && !success) {
      try {
        // Stub: Replace with real API call
        // await api.updateProfile(update);
        success = true;
      } catch (err) {
        lastError = err;
        attempt++;
        await new Promise(res => setTimeout(res, 2 ** attempt * 100)); // Exponential backoff
      }
    }
    if (!success) {
      setError(handleProfileError(lastError));
      rollbackOptimisticUpdate(setProfile, lastKnownGoodProfile);
      setOptimisticProfile(null);
    } else {
      setOptimisticProfile(null);
    }
    setLoading(false);
  }, [profile, lastKnownGoodProfile]);

  const updateNutritionProfile = async (profile: NutritionProfile) => {
    setNutritionProfile(profile);
    // Persist to backend if needed
    await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nutritionProfile: profile })
    });
  };

  return (
    <ProfileContext.Provider value={{ profile, updateProfile, loading, error, lastKnownGoodProfile, optimisticProfile, nutritionProfile, updateNutritionProfile }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfileContext = () => {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfileContext must be used within a ProfileProvider');
  return ctx;
}; 