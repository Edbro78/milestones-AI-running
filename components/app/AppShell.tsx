"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { MOCK_GOALS, MOCK_PROFILE, type Profile } from "@/lib/mockData";
import { loadLocalProfile, saveLocalProfile } from "@/lib/profileStorage";
import { formatGarminUserError } from "@/lib/garmin/errors";
import type { DailyRecord } from "@/lib/types";
import { BottomSheet } from "@/components/app/ui";
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

export type SheetApi = {
  openSheet: (title: string, node: ReactNode) => void;
  closeSheet: () => void;
};

export type GarminStatus = {
  connected: boolean;
  mock: boolean;
  lastSync: string | null;
  error: string | null;
  loading: boolean;
};

export function AppShell({ userEmail }: { userEmail: string }) {
  const [tab, setTab] = useState<TabKey>("okt");
  const [sheet, setSheet] = useState<{ title: string; node: ReactNode } | null>(
    null,
  );
  const [profile, setProfile] = useState<Profile>({
    ...MOCK_PROFILE,
    hrvBaseline: null,
    rhrBaseline: null,
  });
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [garmin, setGarmin] = useState<GarminStatus>({
    connected: false,
    mock: false,
    lastSync: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const local = loadLocalProfile();
      if (local && !cancelled) setProfile(local);
      try {
        const res = await fetch("/api/profile");
        const data = (await res.json()) as {
          profile?: Profile;
          saved?: boolean;
          error?: string;
        };
        if (!res.ok || !data.profile || cancelled) return;

        let next = data.profile;
        if (!data.saved) {
          if (local) {
            next = {
              ...data.profile,
              ...local,
              hrvBaseline: data.profile.hrvBaseline,
              rhrBaseline: data.profile.rhrBaseline,
            };
          }
          await fetch("/api/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(next),
          });
        }
        if (!cancelled) {
          setProfile((current) => {
            const merged = {
              ...next,
              hrvBaseline:
                typeof current.hrvBaseline === "number"
                  ? current.hrvBaseline
                  : next.hrvBaseline,
              rhrBaseline:
                typeof current.rhrBaseline === "number"
                  ? current.rhrBaseline
                  : next.rhrBaseline,
            };
            saveLocalProfile(merged);
            return merged;
          });
        }
      } catch {
        // Behold local/mock hvis nettverket feiler
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSaveProfile(next: Profile) {
    setProfile(next);
    saveLocalProfile(next);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const data = (await res.json()) as { profile?: Profile; error?: string };
      if (res.ok && data.profile) {
        setProfile(data.profile);
        saveLocalProfile(data.profile);
      }
    } catch {
      // Allerede lagret lokalt som fallback
    }
  }

  const syncGarmin = useCallback(async () => {
    setGarmin((g) => ({ ...g, loading: true, error: null }));
    try {
      const res = await fetch("/api/garmin/sync?days=28");
      const data = await res.json();
      if (!res.ok || data.error) {
        setGarmin({
          connected: false,
          mock: Boolean(data.mock),
          lastSync: null,
          error: formatGarminUserError(
            data.error || data.message || "Kunne ikke synkronisere Garmin",
          ),
          loading: false,
        });
        // Behold eksisterende records hvis vi har noen; ellers tom
        if (!records.length && data.records?.length) {
          setRecords(data.records);
        }
        return;
      }
      setRecords(data.records ?? []);
      setGarmin({
        connected: Boolean(data.connected),
        mock: Boolean(data.mock),
        lastSync: data.lastSync ?? null,
        error: data.message ?? null,
        loading: false,
      });
      setProfile((current) => {
        const next = {
          ...current,
          hrvBaseline:
            typeof data.hrvBaseline === "number" ? data.hrvBaseline : current.hrvBaseline,
          rhrBaseline:
            typeof data.rhrBaseline === "number" ? data.rhrBaseline : current.rhrBaseline,
        };
        saveLocalProfile(next);
        return next;
      });
    } catch (err) {
      setGarmin({
        connected: false,
        mock: false,
        lastSync: null,
        error: formatGarminUserError(err),
        loading: false,
      });
    }
  }, [records.length]);

  useEffect(() => {
    void syncGarmin();
    // Kun ved mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const today = records[records.length - 1] ?? null;

  const sheetApi: SheetApi = {
    openSheet: (title, node) => setSheet({ title, node }),
    closeSheet: () => setSheet(null),
  };

  function goTo(next: TabKey) {
    setSheet(null);
    setTab(next);
  }

  return (
    <div className="app-fixed flex flex-col" style={{ background: "var(--canvas)" }}>
      <header
        className="flex flex-none items-center justify-between"
        style={{
          background: "var(--white)",
          borderBottom: "1px solid var(--border)",
          paddingTop: "max(0.6rem, env(safe-area-inset-top))",
          paddingBottom: "0.6rem",
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
          <p className="mt-0.5 text-[0.64rem]" style={{ color: "var(--gray-400)" }}>
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

      <main className="flex-1" style={{ padding: "0.75rem", overflow: "hidden" }}>
        {garmin.loading && records.length === 0 ? (
          <div
            className="flex h-full items-center justify-center"
            style={{ color: "var(--gray-500)", fontSize: "0.9rem" }}
          >
            Henter Garmin-data…
          </div>
        ) : (
          <>
            {tab === "profil" && (
              <ProfileScreen
                profile={profile}
                onSaveProfile={handleSaveProfile}
                garmin={garmin}
                onSync={syncGarmin}
                sheet={sheetApi}
              />
            )}
            {tab === "rapport" &&
              (records.length ? (
                <ReportScreen
                  records={records}
                  goal={MOCK_GOALS.find((g) => g.isMain) ?? null}
                  weeklyKm={profile.weeklyKm}
                />
              ) : (
                <EmptyGarmin garmin={garmin} onSync={syncGarmin} />
              ))}
            {tab === "mal" && (
              <GoalsScreen goals={MOCK_GOALS} records={records} sheet={sheetApi} />
            )}
            {tab === "okt" &&
              (today ? (
                <TodayScreen today={today} goals={MOCK_GOALS} sheet={sheetApi} />
              ) : (
                <EmptyGarmin garmin={garmin} onSync={syncGarmin} />
              ))}
            {tab === "trender" &&
              (records.length ? (
                <TrendsScreen records={records} />
              ) : (
                <EmptyGarmin garmin={garmin} onSync={syncGarmin} />
              ))}
            {tab === "historikk" &&
              (records.length ? (
                <HistoryScreen records={records} sheet={sheetApi} />
              ) : (
                <EmptyGarmin garmin={garmin} onSync={syncGarmin} />
              ))}
          </>
        )}
      </main>

      <nav
        className="flex-none"
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
                onClick={() => goTo(t.key)}
                aria-current={active ? "page" : undefined}
                className="flex flex-1 flex-col items-center justify-center gap-0.5"
                style={{
                  minHeight: 52,
                  color: active ? "var(--blue-main)" : "#98A2B3",
                  paddingTop: 4,
                }}
              >
                <i className={`bx ${t.icon}`} aria-hidden="true" style={{ fontSize: "1.3rem" }} />
                <span style={{ fontSize: "0.6rem", fontWeight: active ? 600 : 500 }}>
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <BottomSheet
        open={!!sheet}
        onClose={() => setSheet(null)}
        title={sheet?.title ?? ""}
      >
        {sheet?.node}
      </BottomSheet>
    </div>
  );
}

function EmptyGarmin({
  garmin,
  onSync,
}: {
  garmin: GarminStatus;
  onSync: () => Promise<void>;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
      <i
        className="bx bx-link-alt"
        aria-hidden="true"
        style={{ fontSize: "2rem", color: "var(--gray-400)" }}
      />
      <p style={{ fontWeight: 600, color: "var(--sp-navy)" }}>
        Ingen Garmin-data ennå
      </p>
      <p style={{ fontSize: "0.85rem", color: "var(--gray-500)", lineHeight: 1.4 }}>
        {garmin.error ||
          "Koble til Garmin Connect for å hente dagens målinger og historikk."}
      </p>
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => void onSync()}
        disabled={garmin.loading}
      >
        {garmin.loading ? "Synkroniserer…" : "Koble til / synkroniser"}
      </button>
    </div>
  );
}
