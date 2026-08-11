"use client";

import { useMemo, useState } from "react";
import { getMockRecords, MOCK_GOALS, MOCK_PROFILE } from "@/lib/mockData";
import {
  GoalsScreen,
  HistoryScreen,
  ProfileScreen,
  ReportScreen,
  TodayScreen,
  TrendsScreen,
} from "@/components/app/screens";

type TabKey = "profil" | "rapport" | "mal" | "okt" | "trender" | "historikk";

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: "profil", label: "Profil", icon: "bx-user" },
  { key: "rapport", label: "Rapport", icon: "bx-file" },
  { key: "mal", label: "Mål", icon: "bx-flag" },
  { key: "okt", label: "Dagens", icon: "bx-run" },
  { key: "trender", label: "Trender", icon: "bx-line-chart" },
  { key: "historikk", label: "Historikk", icon: "bx-history" },
];

const TITLES: Record<TabKey, string> = {
  profil: "Profil",
  rapport: "Ukesrapport",
  mal: "Mål",
  okt: "Dagens økt",
  trender: "Trender",
  historikk: "Historikk",
};

export function AppShell({ userEmail }: { userEmail: string }) {
  const [tab, setTab] = useState<TabKey>("okt");
  const records = useMemo(() => getMockRecords(28), []);
  const today = records[records.length - 1];

  return (
    <div className="app-min-h flex flex-col" style={{ background: "var(--canvas)" }}>
      <header
        className="sticky top-0 z-20 flex items-center justify-between"
        style={{
          background: "var(--white)",
          borderBottom: "1px solid var(--border)",
          paddingTop: "max(0.75rem, env(safe-area-inset-top))",
          paddingBottom: "0.75rem",
          paddingLeft: "max(1rem, env(safe-area-inset-left))",
          paddingRight: "max(1rem, env(safe-area-inset-right))",
        }}
      >
        <div>
          <p
            className="leading-none"
            style={{ fontWeight: 700, color: "var(--sp-navy)", fontSize: "1.05rem" }}
          >
            {TITLES[tab]}
          </p>
          <p
            className="mt-0.5 text-[0.66rem]"
            style={{ color: "var(--gray-400)" }}
          >
            Milestones · {userEmail}
          </p>
        </div>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            aria-label="Logg ut"
            className="flex items-center justify-center"
            style={{
              width: 40,
              height: 40,
              borderRadius: "var(--radius-md)",
              color: "var(--gray-500)",
            }}
          >
            <i className="bx bx-log-out" aria-hidden="true" style={{ fontSize: "1.3rem" }} />
          </button>
        </form>
      </header>

      <main
        className="flex-1"
        style={{
          padding: "1rem",
        }}
      >
        {tab === "profil" && (
          <ProfileScreen profile={MOCK_PROFILE} lastSync={new Date().toISOString()} />
        )}
        {tab === "rapport" && <ReportScreen records={records} />}
        {tab === "mal" && <GoalsScreen goals={MOCK_GOALS} records={records} />}
        {tab === "okt" && <TodayScreen today={today} goals={MOCK_GOALS} />}
        {tab === "trender" && <TrendsScreen records={records} />}
        {tab === "historikk" && <HistoryScreen records={records} />}
      </main>

      <nav
        className="sticky bottom-0 z-20"
        style={{
          background: "var(--white)",
          borderTop: "1px solid var(--border)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div className="mx-auto flex" style={{ maxWidth: 480 }}>
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                aria-current={active ? "page" : undefined}
                className="flex flex-1 flex-col items-center justify-center gap-0.5"
                style={{
                  minHeight: 56,
                  color: active ? "var(--blue-main)" : "#98A2B3",
                  paddingTop: 6,
                }}
              >
                <i
                  className={`bx ${t.icon}`}
                  aria-hidden="true"
                  style={{ fontSize: "1.35rem" }}
                />
                <span style={{ fontSize: "0.62rem", fontWeight: active ? 600 : 500 }}>
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
