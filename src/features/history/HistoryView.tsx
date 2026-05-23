import { useEffect, useMemo, useState } from "react";

import { tauriCommands, type SessionRecord } from "../../lib/tauriCommands";
import { formatIsoDate } from "../../shared/utils/dateTime";

interface HistoryViewProps {
  userId: string;
}

function downloadText(content: string, fileName: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function escapeCsvValue(value: string): string {
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}

function endIsoFromStartAndDuration(startIso: string, durationMinutes: number): string {
  const start = new Date(startIso);
  return new Date(start.getTime() + durationMinutes * 60_000).toISOString();
}

export function HistoryView({ userId }: HistoryViewProps): React.JSX.Element {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [status, setStatus] = useState("Load sessions from DB to manage history.");

  const [manualTitle, setManualTitle] = useState("Manual session");
  const [manualDate, setManualDate] = useState(new Date().toISOString().slice(0, 10));
  const [manualTime, setManualTime] = useState("08:00");
  const [manualDuration, setManualDuration] = useState(30);
  const [manualNote, setManualNote] = useState("");
  const [manualMode, setManualMode] = useState("focus_clock");

  const [editingId, setEditingId] = useState("");
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDuration, setEditingDuration] = useState(0);

  async function loadSessions(): Promise<void> {
    const response = await tauriCommands.listSessions(userId);
    if (!response.success || !response.data) {
      setStatus(response.error || "Unable to load sessions.");
      return;
    }

    setSessions(response.data);
  }

  useEffect(() => {
    void loadSessions();
  }, [userId]);

  const filteredSessions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return sessions.filter((session) => {
      if (dateFilter && !session.start_time.startsWith(dateFilter)) {
        return false;
      }

      if (subjectFilter !== "all" && (session.subject_id || "none") !== subjectFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = `${session.title} ${session.note}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [sessions, search, dateFilter, subjectFilter]);

  const subjectOptions = useMemo(() => {
    return Array.from(new Set(sessions.map((session) => session.subject_id || "none")));
  }, [sessions]);

  async function handleDelete(sessionId: string): Promise<void> {
    const response = await tauriCommands.deleteSession(sessionId);
    if (!response.success) {
      setStatus(response.error || "Unable to delete session.");
      return;
    }

    setStatus("Session deleted.");
    await loadSessions();
  }

  async function handleAddManualSession(): Promise<void> {
    const startIso = new Date(`${manualDate}T${manualTime}:00.000Z`).toISOString();
    const endIso = endIsoFromStartAndDuration(startIso, manualDuration);

    const response = await tauriCommands.addManualSession({
      userId,
      title: manualTitle.trim() || "Manual session",
      note: manualNote,
      startTime: startIso,
      endTime: endIso,
      durationMinutes: Math.max(1, manualDuration),
      workMode: manualMode,
    });

    if (!response.success) {
      setStatus(response.error || "Unable to add manual session.");
      return;
    }

    setStatus("Manual session added.");
    await loadSessions();
  }

  async function handleUpdateSession(session: SessionRecord): Promise<void> {
    const response = await tauriCommands.updateSession({
      id: session.id,
      goalId: session.goal_id || undefined,
      subjectId: session.subject_id || undefined,
      title: editingTitle.trim() || session.title,
      note: session.note,
      startTime: session.start_time,
      endTime: endIsoFromStartAndDuration(session.start_time, Math.max(1, editingDuration)),
      durationMinutes: Math.max(1, editingDuration),
      workMode: session.work_mode,
    });

    if (!response.success) {
      setStatus(response.error || "Unable to update session.");
      return;
    }

    setEditingId("");
    setStatus("Session updated.");
    await loadSessions();
  }

  function exportAsJson(): void {
    downloadText(
      JSON.stringify(filteredSessions, null, 2),
      "pomotime-history.json",
      "application/json"
    );
  }

  function exportAsCsv(): void {
    const header = ["id", "title", "date", "duration_minutes", "work_mode", "note"];
    const body = filteredSessions.map((session) =>
      [
        session.id,
        session.title,
        session.start_time,
        String(session.duration_minutes),
        session.work_mode,
        session.note,
      ]
        .map((value) => escapeCsvValue(value))
        .join(",")
    );

    downloadText([header.join(","), ...body].join("\n"), "pomotime-history.csv", "text/csv");
  }

  return (
    <section className="panel">
      <h2>History</h2>
      <p>Review, edit, or clean up your study sessions.</p>

      <div className="button-row">
        <label>
          Search
          <input value={search} onChange={(event) => setSearch(event.target.value)} type="text" />
        </label>

        <label>
          Date
          <input value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} type="date" />
        </label>

        <label>
          Subject
          <select
            value={subjectFilter}
            onChange={(event) => setSubjectFilter(event.target.value)}
          >
            <option value="all">All</option>
            {subjectOptions.map((subjectId) => (
              <option key={subjectId} value={subjectId}>
                {subjectId}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="button-row">
        <button className="btn secondary" type="button" onClick={exportAsJson}>
          Export JSON
        </button>
        <button className="btn secondary" type="button" onClick={exportAsCsv}>
          Export CSV
        </button>
      </div>

      <div className="panel">
        <h3>Add manual session</h3>
        <div className="button-row">
          <label>
            Title
            <input value={manualTitle} onChange={(event) => setManualTitle(event.target.value)} type="text" />
          </label>
          <label>
            Date
            <input value={manualDate} onChange={(event) => setManualDate(event.target.value)} type="date" />
          </label>
          <label>
            Time
            <input value={manualTime} onChange={(event) => setManualTime(event.target.value)} type="time" />
          </label>
          <label>
            Duration (min)
            <input
              value={manualDuration}
              onChange={(event) => setManualDuration(Number(event.target.value || 0))}
              type="number"
              min={1}
            />
          </label>
          <label>
            Mode
            <select value={manualMode} onChange={(event) => setManualMode(event.target.value)}>
              <option value="focus_clock">focus_clock</option>
              <option value="pomodoro">pomodoro</option>
            </select>
          </label>
          <label>
            Note
            <input value={manualNote} onChange={(event) => setManualNote(event.target.value)} type="text" />
          </label>
        </div>
        <button className="btn primary" type="button" onClick={() => void handleAddManualSession()}>
          Add manual session
        </button>
      </div>

      <ul className="history-list">
        {filteredSessions.map((session) => (
          <li key={session.id}>
            <strong>
              {editingId === session.id ? (
                <input
                  type="text"
                  value={editingTitle}
                  onChange={(event) => setEditingTitle(event.target.value)}
                />
              ) : (
                session.title
              )}
            </strong>
            <span>
              {formatIsoDate(session.start_time)} · {session.duration_minutes} minutes · {session.work_mode}
            </span>

            {editingId === session.id ? (
              <div className="button-row">
                <label>
                  Duration
                  <input
                    type="number"
                    value={editingDuration}
                    min={1}
                    onChange={(event) => setEditingDuration(Number(event.target.value || 0))}
                  />
                </label>
                <button
                  className="btn primary"
                  type="button"
                  onClick={() => void handleUpdateSession(session)}
                >
                  Save edit
                </button>
                <button className="btn secondary" type="button" onClick={() => setEditingId("")}>
                  Cancel
                </button>
              </div>
            ) : (
              <div className="button-row">
                <button
                  className="btn secondary"
                  type="button"
                  onClick={() => {
                    setEditingId(session.id);
                    setEditingTitle(session.title);
                    setEditingDuration(session.duration_minutes);
                  }}
                >
                  Edit
                </button>
                <button
                  className="btn danger"
                  type="button"
                  onClick={() => void handleDelete(session.id)}
                >
                  Delete
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      <p className="status-line" data-testid="history-status">
        {status}
      </p>
    </section>
  );
}
