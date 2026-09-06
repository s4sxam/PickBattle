import { UserProfile, LeaderboardEntry } from '../types';

const STORAGE_PROFILE_KEY = 'pickbattle_user_profile';
const STORAGE_ALL_LOCAL_PROFILES = 'pickbattle_local_accounts';

export function getRankTitle(score: number): string {
  if (score >= 8000) return 'Mythic Legend 🌟';
  if (score >= 3500) return 'Grandmaster ⚡';
  if (score >= 1500) return 'Master Strategist 👑';
  if (score >= 600) return 'Arena Champion 🏆';
  if (score >= 200) return 'Skilled Duelist ⚔️';
  return 'Rookie Contender 🥉';
}

/**
 * Get active logged-in profile from browser localStorage
 */
export function getSavedUserProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.username) {
      return parsed;
    }
  } catch (err) {
    console.error('Failed to read user profile:', err);
  }
  return null;
}

/**
 * Save user profile to browser localStorage
 */
export function saveUserProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(profile));
    
    // Also save in local accounts registry for quick account switching on this browser
    const accounts = getAllLocalAccounts();
    const existingIndex = accounts.findIndex((a) => a.id === profile.id || a.username.toLowerCase() === profile.username.toLowerCase());
    if (existingIndex >= 0) {
      accounts[existingIndex] = profile;
    } else {
      accounts.push(profile);
    }
    localStorage.setItem(STORAGE_ALL_LOCAL_PROFILES, JSON.stringify(accounts));
  } catch (err) {
    console.error('Failed to save user profile:', err);
  }
}

/**
 * Get list of accounts stored on this browser
 */
export function getAllLocalAccounts(): UserProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_ALL_LOCAL_PROFILES);
    if (!raw) return [];
    return JSON.parse(raw) || [];
  } catch {
    return [];
  }
}

/**
 * Create or Login to a profile locally in browser
 */
export function loginOrRegisterProfile(
  username: string,
  avatarEmoji: string,
  pin?: string
): { success: boolean; profile?: UserProfile; error?: string } {
  const cleanUser = username.trim();
  if (!cleanUser) {
    return { success: false, error: 'Username is required' };
  }
  if (cleanUser.length < 2 || cleanUser.length > 20) {
    return { success: false, error: 'Username must be between 2 and 20 characters' };
  }

  const accounts = getAllLocalAccounts();
  const existing = accounts.find((a) => a.username.toLowerCase() === cleanUser.toLowerCase());

  if (existing) {
    // If PIN protected, verify
    if (existing.pin && existing.pin.trim() !== '') {
      if (!pin || pin.trim() !== existing.pin.trim()) {
        return { success: false, error: 'Incorrect PIN/Password for this account' };
      }
    }
    // Update avatar if provided
    if (avatarEmoji) {
      existing.avatarEmoji = avatarEmoji;
    }
    existing.lastPlayed = Date.now();
    saveUserProfile(existing);
    return { success: true, profile: existing };
  }

  // Create new browser profile
  const newProfile: UserProfile = {
    id: 'user_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
    username: cleanUser,
    avatarEmoji: avatarEmoji || '😎',
    pin: pin?.trim() || undefined,
    totalScore: 0,
    gamesPlayed: 0,
    matchesWon: 0,
    roundWins: 0,
    trophies: 0,
    winStreak: 0,
    bestStreak: 0,
    lastPlayed: Date.now(),
    createdAt: Date.now(),
  };

  saveUserProfile(newProfile);
  return { success: true, profile: newProfile };
}

/**
 * Update points and stats after a match/round
 */
export function recordGameResult(
  userId: string,
  pointsWon: number,
  isMatchWinner: boolean,
  roundsWonCount: number = 0
): UserProfile | null {
  const current = getSavedUserProfile();
  if (!current) return null;

  current.totalScore += Math.max(0, pointsWon);
  current.gamesPlayed += 1;
  current.roundWins += roundsWonCount;
  current.lastPlayed = Date.now();

  if (isMatchWinner) {
    current.matchesWon += 1;
    current.trophies += 1;
    current.winStreak += 1;
    if (current.winStreak > current.bestStreak) {
      current.bestStreak = current.winStreak;
    }
  } else {
    current.winStreak = 0;
  }

  saveUserProfile(current);
  return current;
}

export function recordMatchPoints(
  pointsWon: number,
  isMatchWinner: boolean,
  roundsWonCount: number = 0,
  trophyAwarded: boolean = false
): UserProfile | null {
  const current = getSavedUserProfile();
  if (!current) return null;

  current.totalScore += Math.max(0, pointsWon);
  current.gamesPlayed += 1;
  current.roundWins += roundsWonCount;
  current.lastPlayed = Date.now();

  if (isMatchWinner) {
    current.matchesWon += 1;
    current.winStreak += 1;
    if (current.winStreak > current.bestStreak) {
      current.bestStreak = current.winStreak;
    }
  } else {
    current.winStreak = 0;
  }

  if (trophyAwarded || isMatchWinner) {
    current.trophies += 1;
  }

  saveUserProfile(current);
  return current;
}


/**
 * Logout / clear active session
 */
export function logoutProfile(): void {
  try {
    localStorage.removeItem(STORAGE_PROFILE_KEY);
  } catch (e) {}
}
