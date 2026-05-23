export function StatsView(): React.JSX.Element {
  return (
    <section className="panel">
      <h2>Statistics</h2>
      <p>Measure your progress with trend and streak breakdowns.</p>
      <div className="grid-cards">
        <article className="stat-card">
          <strong>Average / session</strong>
          <span>0 min</span>
        </article>
        <article className="stat-card">
          <strong>Achieved days</strong>
          <span>0</span>
        </article>
      </div>
    </section>
  );
}
