import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";

import type { AuthSession } from "../features/auth/authTypes";
import { tauriCommands, type SessionRecord } from "../lib/tauriCommands";

interface MainLayoutProps {
  commandStatus: string;
  session: AuthSession;
  onLogout(): void;
}

const navItems = [
  { to: "/onboarding", label: "Onboarding", icon: "⌂" },
  { to: "/dashboard", label: "Dashboard", icon: "◫" },
  { to: "/timer", label: "Session Timer", icon: "◷" },
  { to: "/history", label: "History", icon: "≣" },
  { to: "/stats", label: "Statistics", icon: "◰" },
  { to: "/goals", label: "Goal Settings", icon: "◎" },
];

function isoDateFromTimestamp(timestamp: string): string {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    return timestamp.slice(0, 10);
  }

  return parsed.toISOString().slice(0, 10);
}

function addUtcDays(isoDate: string, deltaDays: number): string {
  const parsed = new Date(`${isoDate}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + deltaDays);
  return parsed.toISOString().slice(0, 10);
}

function calculateCurrentStreak(sessions: SessionRecord[]): number {
  const studiedByDate: Record<string, number> = {};

  sessions.forEach((session) => {
    const isoDate = isoDateFromTimestamp(session.start_time);
    studiedByDate[isoDate] = (studiedByDate[isoDate] || 0) + Math.max(0, session.duration_minutes);
  });

  let streak = 0;
  let cursor = new Date().toISOString().slice(0, 10);

  while ((studiedByDate[cursor] || 0) > 0) {
    streak += 1;
    cursor = addUtcDays(cursor, -1);
  }

  return streak;
}

export function MainLayout({ commandStatus, session, onLogout }: MainLayoutProps): React.JSX.Element {
  const [isSidebarHidden, setIsSidebarHidden] = useState(false);
  const [activeGoalTitle, setActiveGoalTitle] = useState("No active goal");
  const [goalCount, setGoalCount] = useState(0);
  const [streak, setStreak] = useState(0);

  const initials = useMemo(() => {
    const parts = session.displayName
      .trim()
      .split(/\s+/)
      .filter((part) => part.length > 0);

    if (parts.length === 0) {
      return "U";
    }

    if (parts.length === 1) {
      return parts[0].slice(0, 1).toUpperCase();
    }

    return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase();
  }, [session.displayName]);

  useEffect(() => {
    let active = true;

    Promise.all([
      tauriCommands.listGoals(session.userId),
      tauriCommands.listSessions(session.userId),
    ])
      .then(([goalsResponse, sessionsResponse]) => {
        if (!active) {
          return;
        }

        if (goalsResponse.success && goalsResponse.data) {
          setGoalCount(goalsResponse.data.length);
          const activeGoal = goalsResponse.data.find((goal) => goal.is_active) || goalsResponse.data[0] || null;
          setActiveGoalTitle(activeGoal ? activeGoal.title : "No active goal");
        } else {
          setGoalCount(0);
          setActiveGoalTitle("No active goal");
        }

        if (sessionsResponse.success && sessionsResponse.data) {
          setStreak(calculateCurrentStreak(sessionsResponse.data));
        } else {
          setStreak(0);
        }
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setGoalCount(0);
        setActiveGoalTitle("No active goal");
        setStreak(0);
      });

    return () => {
      active = false;
    };
  }, [session.userId]);

  return (
    <div className={isSidebarHidden ? "app-shell sidebar-hidden" : "app-shell"}>
      <aside className="sidebar">
        <div className="brand">
          <b>PomoTime</b>
          <span>Minimal desktop prototype</span>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? "nav-btn active" : "nav-btn")}
            >
              <span className="nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
          Linux and Windows first
          <br />
          Tauri + Rust + Supabase
          <div className="btn-row" style={{ marginTop: "10px" }}>
            <button className="btn secondary sidebar-auth-btn" type="button" onClick={onLogout}>
              <span className="sidebar-auth-icon" aria-hidden="true">
                ↩
              </span>
              <span className="sidebar-auth-label">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div className="btn-row">
            <button
              className="btn secondary sidebar-toggle-btn"
              type="button"
              onClick={() => setIsSidebarHidden((current) => !current)}
            >
              <span aria-hidden="true">{isSidebarHidden ? "☰" : "✕"}</span>
              <span>{isSidebarHidden ? "Show sidebar" : "Hide sidebar"}</span>
            </button>

            <span className="goal-chip">Goal: {activeGoalTitle}</span>
            <span className="goal-chip chip-muted">Total goals: {goalCount}</span>
          </div>

          <div className="btn-row">
            <span className="streak-chip">Current streak: {streak} days</span>
            <div className="topbar-user">
              <div className="topbar-user-avatar">{initials}</div>
              <div className="topbar-user-meta">
                <span className="topbar-user-name">{session.displayName}</span>
                <span className="topbar-user-email">{session.email}</span>
              </div>
            </div>
          </div>
        </div>

        <p className="auth-status" data-testid="command-status">
          Command: {commandStatus}
        </p>

        <div className="view-container">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
