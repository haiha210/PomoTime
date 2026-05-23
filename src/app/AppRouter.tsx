import { HashRouter, Navigate, Route, Routes } from "react-router-dom";

import { AuthView } from "../features/auth/AuthView";
import type { AuthSession } from "../features/auth/authTypes";
import { DashboardView } from "../features/dashboard/DashboardView";
import { GoalsView } from "../features/goals/GoalsView";
import { HistoryView } from "../features/history/HistoryView";
import { OnboardingView } from "../features/onboarding/OnboardingView";
import { StatsView } from "../features/stats/StatsView";
import { TimerView } from "../features/timer/TimerView";

import { MainLayout } from "./MainLayout";

interface AppRouterProps {
  hasSupabaseConfig: boolean;
  commandStatus: string;
  session: AuthSession | null;
  onLogin(session: AuthSession): void;
  onLogout(): void;
}

export function AppRouter({
  hasSupabaseConfig,
  commandStatus,
  session,
  onLogin,
  onLogout,
}: AppRouterProps): React.JSX.Element {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Navigate to={session ? "/dashboard" : "/auth"} replace />} />
        <Route
          path="/auth"
          element={
            session ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <AuthView hasSupabaseConfig={hasSupabaseConfig} onLogin={onLogin} />
            )
          }
        />

        {session ? (
          <Route element={<MainLayout commandStatus={commandStatus} session={session} onLogout={onLogout} />}>
            <Route path="/onboarding" element={<OnboardingView userId={session.userId} />} />
            <Route path="/dashboard" element={<DashboardView />} />
            <Route path="/timer" element={<TimerView userId={session.userId} />} />
            <Route path="/history" element={<HistoryView userId={session.userId} />} />
            <Route path="/stats" element={<StatsView />} />
            <Route path="/goals" element={<GoalsView userId={session.userId} />} />
          </Route>
        ) : (
          <Route path="*" element={<Navigate to="/auth" replace />} />
        )}
      </Routes>
    </HashRouter>
  );
}
