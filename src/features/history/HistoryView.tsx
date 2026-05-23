import { formatIsoDate } from "../../shared/utils/dateTime";

const sampleHistory = [
  {
    id: "h-1",
    title: "Rust ownership review",
    durationMinutes: 50,
    startTime: "2026-05-22T08:00:00.000Z",
  },
  {
    id: "h-2",
    title: "PostgreSQL schema drills",
    durationMinutes: 40,
    startTime: "2026-05-21T12:30:00.000Z",
  },
];

export function HistoryView(): React.JSX.Element {
  return (
    <section className="panel">
      <h2>History</h2>
      <p>Review, edit, or clean up your study sessions.</p>
      <ul className="history-list">
        {sampleHistory.map((item) => (
          <li key={item.id}>
            <strong>{item.title}</strong>
            <span>
              {formatIsoDate(item.startTime)} · {item.durationMinutes} minutes
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
