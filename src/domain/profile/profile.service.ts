import { db } from '@/db/database';
import { DomainError, toDomainError } from '@/domain/shared/errors';
import { nowUtc } from '@/domain/shared/dates';
import type { Profile, Goal, UpdateProfileInput, SetGoalInput } from './profile.schema';

function uuid(): string {
  return crypto.randomUUID();
}

export const profileService = {
  /**
   * Returns the local user profile, creating a default one if none exists.
   */
  async getProfile(): Promise<Profile> {
    try {
      const profile = await db.profiles.get('local-user');
      if (profile) return profile;

      // Create default profile on first use
      const now = nowUtc();
      const defaultProfile: Profile = {
        id: 'local-user',
        preferredWeightUnit: 'kg',
        preferredEnergyUnit: 'kcal',
        locale: navigator.language || 'en',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        createdAt: now,
        updatedAt: now,
      };
      await db.profiles.put(defaultProfile);
      return defaultProfile;
    } catch (err) {
      throw toDomainError(err);
    }
  },

  /**
   * Updates the local user profile with partial data.
   */
  async updateProfile(input: UpdateProfileInput): Promise<Profile> {
    try {
      const existing = await profileService.getProfile();
      const updated: Profile = {
        ...existing,
        ...input,
        id: 'local-user',
        updatedAt: nowUtc(),
      };
      await db.profiles.put(updated);
      return updated;
    } catch (err) {
      throw toDomainError(err);
    }
  },

  /**
   * Returns the active goal for the local user.
   */
  async getActiveGoal(): Promise<Goal | null> {
    try {
      const goals = await db.goals
        .where('profileId')
        .equals('local-user')
        .sortBy('updatedAt');
      if (goals.length === 0) return null;
      return goals[goals.length - 1]; // most recently updated
    } catch (err) {
      throw toDomainError(err);
    }
  },

  /**
   * Creates or replaces the active goal.
   */
  async setGoal(input: SetGoalInput): Promise<Goal> {
    try {
      const now = nowUtc();
      const goal: Goal = {
        ...input,
        id: uuid(),
        profileId: 'local-user',
        createdAt: now,
        updatedAt: now,
      };
      await db.goals.put(goal);
      return goal;
    } catch (err) {
      throw toDomainError(err);
    }
  },

  /**
   * Returns true if the profile has enough data for BMR calculation.
   */
  async isProfileComplete(): Promise<boolean> {
    const profile = await profileService.getProfile();
    return !!(
      profile.currentWeightKg &&
      profile.heightCm &&
      profile.birthDate
    );
  },
};
