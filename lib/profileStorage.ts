import { MOCK_PROFILE, type Profile } from "@/lib/mockData";

const STORAGE_KEY = "milestones_profile_v1";

export function loadProfile(): Profile {
  if (typeof window === "undefined") return MOCK_PROFILE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return MOCK_PROFILE;
    const parsed = JSON.parse(raw) as Partial<Profile>;
    return { ...MOCK_PROFILE, ...parsed };
  } catch {
    return MOCK_PROFILE;
  }
}

export function saveProfile(profile: Profile): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function ageFromBirthDate(birthDate: string): number {
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return 0;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return Math.max(0, age);
}
