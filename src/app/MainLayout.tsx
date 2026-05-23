import { NavLink, Outlet } from "react-router-dom";

import type { AuthSession } from "../features/auth/authTypes";

interface MainLayoutProps {
  commandStatus: string;
  session: AuthSession;
  onLogout(): void;
}

const navItems = [
  { to: "/onboarding", label: "Onboarding" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/timer", label: "Timer" },
  { to: "/history", label: "History" },
  { to: "/stats", label: "Stats" },
  { to: "/goals", label: "Goals" },
];

export function MainLayout({ commandStatus, session, onLogout }: MainLayoutProps): React.JSX.Element {
  const initials = session.displayName.slice(0, 1).toUpperCase();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h1>PomoTime</h1>
        <nav>
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div className="chip" data-testid="command-status">Command: {commandStatus}</div>
          <div className="session-meta">
            <div className="avatar">{initials}</div>
            <div>
              <strong>{session.displayName}</strong>
              <p>{session.email}</p>
            </div>
            <button className="btn secondary" type="button" onClick={onLogout}>
              Logout
            </button>
          </div>
        </header>

        <main className="view-container">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
