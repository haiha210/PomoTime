export function TimerView(): React.JSX.Element {
  return (
    <section className="panel">
      <h2>Timer</h2>
      <p>Start a focus clock or pomodoro session and save progress at stop.</p>
      <div className="timer-face">25:00</div>
      <div className="button-row">
        <button className="btn primary" type="button">
          Start
        </button>
        <button className="btn secondary" type="button">
          Pause
        </button>
        <button className="btn danger" type="button">
          Stop
        </button>
      </div>
    </section>
  );
}
