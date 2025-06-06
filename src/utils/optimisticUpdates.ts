import { Profile, ProfileUpdate } from '../types/user';

export function applyOptimisticUpdate(profile: Profile | null, update: ProfileUpdate): Profile {
  return { ...profile, ...update } as Profile;
}

export function rollbackOptimisticUpdate(setProfile: (p: Profile | null) => void, lastKnownGood: Profile | null) {
  setProfile(lastKnownGood);
} 