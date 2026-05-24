import { useEffect, useMemo, useState } from "react";

import { tauriCommands, type GoalRecord, type SessionRecord, type SubjectRecord } from "../../lib/tauriCommands";
import { NativePickerInput } from "../../shared/components/NativePickerInput";
import { formatIsoDate, isValidIsoDate, toLocalIsoDate } from "../../shared/utils/dateTime";

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

function isoDateFromTimestamp(timestamp: string): string {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    return timestamp.slice(0, 10);
  }

  return toLocalIsoDate(parsed);
}

function localIsoDate(date: Date): string {
  return toLocalIsoDate(date);
}

function localTimeHHmm(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function HistoryView({ userId }: HistoryViewProps): React.JSX.Element {
  const [goals, setGoals] = useState<GoalRecord[]>([]);
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);

  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");

  const [status, setStatus] = useState("Load sessions from DB to manage history.");
  const [isManualPanelOpen, setIsManualPanelOpen] = useState(false);

  const [manualGoalId, setManualGoalId] = useState("none");
  const [manualSubjectId, setManualSubjectId] = useState("none");
  const [manualTitle, setManualTitle] = useState("Manual session");
  const [manualDate, setManualDate] = useState(localIsoDate(new Date()));
  const [manualTime, setManualTime] = useState("08:00");
  const [manualDuration, setManualDuration] = useState(30);
  const [manualNote, setManualNote] = useState("");
  const [manualMode, setManualMode] = useState("focus_clock");

  const goalNameById = useMemo(() => {
    const map = new Map<string, string>();
    goals.forEach((goal) => {
      map.set(goal.id, goal.title);
    });
    return map;
  }, [goals]);

  const subjectNameById = useMemo(() => {
    const map = new Map<string, string>();
    subjects.forEach((subject) => {
      map.set(subject.id, subject.name);
    });
    return map;
  }, [subjects]);

  async function loadData(): Promise<void> {
    const [sessionsResponse, goalsResponse, subjectsResponse] = await Promise.all([
      tauriCommands.listSessions(userId),
      tauriCommands.listGoals(userId),
      tauriCommands.listSubjects(userId),
    ]);

    if (!sessionsResponse.success || !sessionsResponse.data) {
      setStatus(sessionsResponse.error || "Unable to load sessions.");
      setSessions([]);
      return;
    }

    setSessions(sessionsResponse.data);

    if (goalsResponse.success && goalsResponse.data) {
      setGoals(goalsResponse.data);
      const activeGoal = goalsResponse.data.find((goal) => goal.is_active) || goalsResponse.data[0] || null;
      setManualGoalId(activeGoal?.id || "none");
    } else {
      setGoals([]);
      setManualGoalId("none");
    }

    if (subjectsResponse.success && subjectsResponse.data) {
      setSubjects(subjectsResponse.data);
      setManualSubjectId(subjectsResponse.data[0]?.id || "none");
    } else {
      setSubjects([]);
      setManualSubjectId("none");
    }
  }

  useEffect(() => {
    void loadData();
  }, [userId]);

  const filteredSessions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const validFromDate = isValidIsoDate(fromDate) ? fromDate : "";
    const validToDate = isValidIsoDate(toDate) ? toDate : "";

    return [...sessions]
      .sort((left, right) => right.start_time.localeCompare(left.start_time))
      .filter((session) => {
        const sessionDate = isoDateFromTimestamp(session.start_time);
        const subjectName = session.subject_id ? subjectNameById.get(session.subject_id) || session.subject_id : "General";
        const goalName = session.goal_id ? goalNameById.get(session.goal_id) || session.goal_id : "No goal";

        if (validFromDate && sessionDate < validFromDate) {
          return false;
        }

        if (validToDate && sessionDate > validToDate) {
          return false;
        }

        if (subjectFilter !== "all" && (session.subject_id || "none") !== subjectFilter) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        const haystack = `${session.title} ${session.note} ${subjectName} ${goalName}`.toLowerCase();
        return haystack.includes(normalizedSearch);
      });
  }, [fromDate, goalNameById, search, sessions, subjectFilter, subjectNameById, toDate]);

  async function handleAddManualSession(): Promise<void> {
    if (!isValidIsoDate(manualDate)) {
      setStatus("Date must use YYYY-MM-DD format.");
      return;
    }

    const startCandidate = new Date(`${manualDate}T${manualTime}:00`);
    if (Number.isNaN(startCandidate.getTime())) {
      setStatus("Please enter a valid start date and time.");
      return;
    }

    const startIso = startCandidate.toISOString();

    const safeDuration = Math.max(1, manualDuration);
    const endIso = endIsoFromStartAndDuration(startIso, safeDuration);

    const response = await tauriCommands.addManualSession({
      userId,
      goalId: manualGoalId === "none" ? undefined : manualGoalId,
      subjectId: manualSubjectId === "none" ? undefined : manualSubjectId,
      title: manualTitle.trim() || "Manual session",
      note: manualNote,
      startTime: startIso,
      endTime: endIso,
      durationMinutes: safeDuration,
      workMode: manualMode,
    });

    if (!response.success) {
      setStatus(response.error || "Unable to add manual session.");
      return;
    }

    setStatus("Manual session added.");
    setIsManualPanelOpen(false);
    await loadData();
  }

  function setManualToNow(): void {
    const now = new Date();
    setManualDate(localIsoDate(now));
    setManualTime(localTimeHHmm(now));
  }

  function exportAsJson(): void {
    const normalized = filteredSessions.map((session) => ({
      id: session.id,
      date: isoDateFromTimestamp(session.start_time),
      goal: session.goal_id ? goalNameById.get(session.goal_id) || session.goal_id : "No goal",
      subject: session.subject_id ? subjectNameById.get(session.subject_id) || session.subject_id : "General",
      title: session.title,
      duration_minutes: session.duration_minutes,
      work_mode: session.work_mode,
      note: session.note,
    }));

    downloadText(JSON.stringify(normalized, null, 2), "pomotime-history.json", "application/json");
  }

  function exportAsCsv(): void {
    const header = ["date", "goal", "subject", "title", "duration_minutes", "work_mode", "note"];
    const body = filteredSessions.map((session) =>
      [
        isoDateFromTimestamp(session.start_time),
        session.goal_id ? goalNameById.get(session.goal_id) || session.goal_id : "No goal",
        session.subject_id ? subjectNameById.get(session.subject_id) || session.subject_id : "General",
        session.title,
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
      <p className="muted">Quick scan with date range filters.</p>

      <div className="grid-4" style={{ marginBottom: "10px" }}>
        <label className="field">
          Search
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            type="text"
            placeholder="Search title or subject"
          />
        </label>

        <label className="field">
          From date
          <NativePickerInput value={fromDate} onChange={(event) => setFromDate(event.target.value)} type="date" />
        </label>

        <label className="field">
          To date
          <NativePickerInput value={toDate} onChange={(event) => setToDate(event.target.value)} type="date" />
        </label>

        <label className="field">
          Subject
          <select value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)}>
            <option value="all">All subjects</option>
            <option value="none">General</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="btn-row" style={{ marginBottom: "10px" }}>
        <button className="btn secondary" type="button" onClick={() => setIsManualPanelOpen((current) => !current)}>
          Add manual session
        </button>
        <button className="btn secondary" type="button" onClick={exportAsJson}>
          Export JSON
        </button>
        <button className="btn secondary" type="button" onClick={exportAsCsv}>
          Export CSV
        </button>
      </div>

      {isManualPanelOpen ? (
        <div className="panel" style={{ marginBottom: "10px" }}>
          <h3>Add manual session</h3>
          <div className="grid-4">
            <label className="field">
              Goal
              <select value={manualGoalId} onChange={(event) => setManualGoalId(event.target.value)}>
                <option value="none">No goal</option>
                {goals.map((goal) => (
                  <option key={goal.id} value={goal.id}>
                    {goal.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              Subject
              <select value={manualSubjectId} onChange={(event) => setManualSubjectId(event.target.value)}>
                <option value="none">General</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              Date
              <NativePickerInput value={manualDate} onChange={(event) => setManualDate(event.target.value)} type="date" />
            </label>

            <label className="field">
              Time
              <NativePickerInput value={manualTime} onChange={(event) => setManualTime(event.target.value)} type="time" />
            </label>
          </div>

          <div className="btn-row" style={{ marginTop: "-2px", marginBottom: "4px" }}>
            <button className="btn ghost" type="button" onClick={setManualToNow}>
              Set now
            </button>
          </div>

          <div className="grid-4">
            <label className="field">
              Title
              <input value={manualTitle} onChange={(event) => setManualTitle(event.target.value)} type="text" />
            </label>

            <label className="field">
              Duration (min)
              <input
                value={manualDuration}
                onChange={(event) => setManualDuration(Number(event.target.value || 0))}
                type="number"
                min={1}
              />
            </label>

            <label className="field">
              Work mode
              <select value={manualMode} onChange={(event) => setManualMode(event.target.value)}>
                <option value="focus_clock">Focus Clock</option>
                <option value="pomodoro">Tomato Sprint</option>
              </select>
            </label>

            <label className="field">
              Note
              <input value={manualNote} onChange={(event) => setManualNote(event.target.value)} type="text" />
            </label>
          </div>

          <div className="btn-row">
            <button className="btn primary" type="button" onClick={() => void handleAddManualSession()}>
              Save session
            </button>
            <button className="btn secondary" type="button" onClick={() => setIsManualPanelOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <p className="status-line" data-testid="history-status" style={{ marginBottom: "8px" }}>
        {status}
      </p>

      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Goal</th>
            <th>Subject</th>
            <th>Title</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          {filteredSessions.length === 0 ? (
            <tr>
              <td colSpan={5} className="muted" style={{ textAlign: "center" }}>
                No sessions match current filters.
              </td>
            </tr>
          ) : (
            filteredSessions.map((session) => {
              const goalName = session.goal_id ? goalNameById.get(session.goal_id) || session.goal_id : "No goal";
              const subjectName = session.subject_id ? subjectNameById.get(session.subject_id) || session.subject_id : "General";

              return (
                <tr key={session.id}>
                  <td>{formatIsoDate(session.start_time)}</td>
                  <td>{goalName}</td>
                  <td>{subjectName}</td>
                  <td>{session.title}</td>
                  <td>{session.duration_minutes} min</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </section>
  );
}
