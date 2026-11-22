"use client";

import type { ReactNode } from "react";
import type { GarminStatus, SheetApi } from "@/components/app/AppShell";
import { GoalsScreen, ProfileScreen, TrendsScreen, WeekScreen } from "@/components/app/screens";
import type { MilestoneLog } from "@/lib/milestones";
import type { Goal, Profile } from "@/lib/mockData";
import type { DailyRecord } from "@/lib/types";

/**
 * Seksjon med fast høyde: de eksisterende skjermene er bygget for å fylle
 * høyden de får (h-full + flex), så de vises uendret inne i en rullbar side.
 */
function Section({ title, height, children }: { title: string; height: number; children: ReactNode }) {
  return (
    <section style={{ flex: "none" }}>
      <h2
        style={{
          margin: "0.2rem 0.15rem 0.45rem",
          fontSize: "0.72rem",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          fontWeight: 700,
          color: "var(--gray-500)",
        }}
      >
        {title}
      </h2>
      <div style={{ height }}>{children}</div>
    </section>
  );
}

/** Fane 4: mål, profil, ukeplan og trender samlet. */
export function PlanScreen({
  goals,
  goal,
  onGoalChange,
  records,
  profile,
  onSaveProfile,
  garmin,
  onSync,
  sheet,
  logs,
}: {
  goals: Goal[];
  goal: Goal | null;
  onGoalChange: (goal: Goal) => void;
  records: DailyRecord[];
  profile: Profile;
  onSaveProfile: (profile: Profile) => void;
  garmin: GarminStatus;
  onSync: () => Promise<void>;
  sheet: SheetApi;
  logs: MilestoneLog[];
}) {
  return (
    <div className="flex h-full flex-col gap-4" style={{ overflowY: "auto", paddingBottom: "0.5rem" }}>
      <Section title="Mål" height={470}>
        <GoalsScreen
          goals={goals}
          records={records}
          sheet={sheet}
          logs={logs}
          hrMax={profile.hrMax}
          onGoalChange={onGoalChange}
        />
      </Section>

      <Section title="Profil" height={440}>
        <ProfileScreen
          profile={profile}
          onSaveProfile={onSaveProfile}
          garmin={garmin}
          onSync={onSync}
          sheet={sheet}
          showSync={false}
        />
      </Section>

      <Section title="Ukeplan" height={470}>
        <WeekScreen sheet={sheet} profile={profile} onSaveProfile={onSaveProfile} />
      </Section>

      {records.length ? (
        <Section title="Trender" height={400}>
          <TrendsScreen
            records={records}
            goal={goal}
            weeklyKm={profile.weeklyKm}
            logs={logs}
            hrMax={profile.hrMax}
          />
        </Section>
      ) : null}
    </div>
  );
}
