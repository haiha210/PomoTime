function App(): React.JSX.Element {
  const hasSupabaseConfig = Boolean(
    (window.POMOTIME_SUPABASE_URL || "").trim() &&
      (window.POMOTIME_SUPABASE_ANON_KEY || "").trim()
  );

  return (
    <main className="app-container">
      <h1>PomoTime</h1>
      <p className="subtitle">React + Tauri desktop foundation is ready.</p>
      <p data-testid="config-status" className="status">
        Supabase config: {hasSupabaseConfig ? "configured" : "demo mode"}
      </p>
    </main>
  );
}

export default App;
