use postgres::{Client, NoTls};

const DEFAULT_DATABASE_URL: &str = "postgresql://pomotime:pomotime@localhost:5432/pomotime";
const MIGRATION_NAME: &str = "0001_init_postgres.sql";
const MIGRATION_SQL: &str = include_str!("../migrations/0001_init_postgres.sql");

pub fn initialize_database() -> Result<(), String> {
  run_migrations(&resolve_database_url())
}

pub fn resolve_database_url() -> String {
  std::env::var("DATABASE_URL").unwrap_or_else(|_| DEFAULT_DATABASE_URL.to_string())
}

fn run_migrations(database_url: &str) -> Result<(), String> {
  let mut client = Client::connect(database_url, NoTls)
    .map_err(|error| format!("failed to connect PostgreSQL: {error}"))?;

  create_migration_table(&mut client)?;

  if is_migration_applied(&mut client, MIGRATION_NAME)? {
    return Ok(());
  }

  // Wrap schema creation + migration mark in one transaction for consistency.
  let mut tx = client
    .transaction()
    .map_err(|error| format!("failed to start migration transaction: {error}"))?;

  tx.batch_execute(MIGRATION_SQL)
    .map_err(|error| format!("failed to apply {MIGRATION_NAME}: {error}"))?;

  tx.execute(
    "INSERT INTO schema_migrations (name, applied_at) VALUES ($1, NOW())",
    &[&MIGRATION_NAME],
  )
  .map_err(|error| format!("failed to record migration {MIGRATION_NAME}: {error}"))?;

  tx.commit()
    .map_err(|error| format!("failed to commit migration transaction: {error}"))?;

  Ok(())
}

fn create_migration_table(client: &mut Client) -> Result<(), String> {
  client
    .batch_execute(
      "
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id BIGSERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ",
    )
    .map_err(|error| format!("failed to ensure schema_migrations table: {error}"))
}

fn is_migration_applied(client: &mut Client, migration_name: &str) -> Result<bool, String> {
  let row = client
    .query_opt(
      "SELECT 1 FROM schema_migrations WHERE name = $1 LIMIT 1",
      &[&migration_name],
    )
    .map_err(|error| format!("failed to query migration state: {error}"))?;

  Ok(row.is_some())
}
