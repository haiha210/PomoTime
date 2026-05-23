export function DashboardView(): React.JSX.Element {
  return (
    <section className="panel">
      <h2>Dashboard</h2>
      <p>Track daily minutes, weekly consistency, and active goals in one place.</p>
      <div className="grid-cards">
        <article className="stat-card">
          <strong>Today</strong>
          <span>0 min</span>
        </article>
        <article className="stat-card">
          <strong>7-day total</strong>
          <span>0 min</span>
        </article>
        <article className="stat-card">
          <strong>Streak</strong>
          <span>0 days</span>
        </article>
      </div>
    </section>
  );
}
