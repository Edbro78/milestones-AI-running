import { MOCK_PROFILE, type Profile } from "@/lib/mockData";

const STORAGE_KEY = "milestones_profile_v1";

export type ProfileRow = {
  id: string;
  name: string | null;
  birth_date: string | null;
  weight_kg: number | null;
  max_hr: number | null;
  hr_threshold: number | null;
  weekly_km: number | null;
  hrv_baseline: number | null;
  rhr_baseline: number | null;
};

export function ageFromBirthDate(birthDate: string): number {
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return 0;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return Math.max(0, age);
}

export function loadLocalProfile(): Profile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Profile>;
    return { ...MOCK_PROFILE, ...parsed };
  } catch {
    return null;
  }
}

export function saveLocalProfile(profile: Profile): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

/** @deprecated Bruk loadLocalProfile — beholdt for eksisterende kall. */
export function loadProfile(): Profile {
  return loadLocalProfile() ?? MOCK_PROFILE;
}

/** @deprecated Bruk saveLocalProfile. */
export function saveProfile(profile: Profile): void {
  saveLocalProfile(profile);
}

export function rowToProfile(row: Partial<ProfileRow> | null | undefined): Partial<Profile> {
  if (!row) return {};
  return {
    ...(row.name != null ? { name: row.name } : {}),
    ...(row.birth_date != null ? { birthDate: row.birth_date } : {}),
    ...(row.weight_kg != null ? { weightKg: Number(row.weight_kg) } : {}),
    ...(row.max_hr != null ? { hrMax: row.max_hr } : {}),
    ...(row.hr_threshold != null ? { hrThreshold: row.hr_threshold } : {}),
    ...(row.weekly_km != null ? { weeklyKm: Number(row.weekly_km) } : {}),
    hrvBaseline: row.hrv_baseline != null ? Number(row.hrv_baseline) : null,
    rhrBaseline: row.rhr_baseline != null ? Number(row.rhr_baseline) : null,
  };
}

export function mergeProfile(
  remote: Partial<Profile>,
  local: Profile | null,
): Profile {
  const base = local ?? MOCK_PROFILE;
  return {
    name: remote.name ?? base.name,
    birthDate: remote.birthDate ?? base.birthDate,
    weightKg: remote.weightKg ?? base.weightKg,
    hrMax: remote.hrMax ?? base.hrMax,
    hrThreshold: remote.hrThreshold ?? base.hrThreshold,
    weeklyKm: remote.weeklyKm ?? base.weeklyKm,
    hrvBaseline:
      remote.hrvBaseline !== undefined ? remote.hrvBaseline : (base.hrvBaseline ?? null),
    rhrBaseline:
      remote.rhrBaseline !== undefined ? remote.rhrBaseline : (base.rhrBaseline ?? null),
  };
}

export function userFieldsForDb(profile: Profile) {
  return {
    name: profile.name,
    birth_date: profile.birthDate || null,
    weight_kg: profile.weightKg,
    max_hr: profile.hrMax,
    hr_threshold: profile.hrThreshold,
    weekly_km: profile.weeklyKm,
    updated_at: new Date().toISOString(),
  };
}

export function hasSavedUserFields(row: Partial<ProfileRow> | null | undefined): boolean {
  if (!row) return false;
  return Boolean(
    row.name ||
      row.birth_date ||
      row.weight_kg != null ||
      row.max_hr != null ||
      row.hr_threshold != null ||
      row.weekly_km != null,
  );
}
