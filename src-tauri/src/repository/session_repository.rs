use postgres::Row;

use super::{connect, CreateStudySessionInput, StudySession, UpdateStudySessionInput};

#[derive(Clone)]
pub struct StudySessionRepository {
  database_url: String,
}

impl StudySessionRepository {
  pub fn new(database_url: String) -> Self {
    Self { database_url }
  }

  pub fn create(&self, input: CreateStudySessionInput) -> Result<StudySession, String> {
    let mut client = connect(&self.database_url)?;
    let row = client
      .query_one(
        "
        INSERT INTO study_sessions (
          user_id,
          goal_id,
          subject_id,
          title,
          note,
          start_time,
          end_time,
          duration_minutes,
          work_mode,
          updated_at
        )
        VALUES (
          $1,
          ($2::text)::uuid,
          ($3::text)::uuid,
          $4,
          $5,
          ($6::text)::timestamptz,
          ($7::text)::timestamptz,
          $8,
          $9,
          NOW()
        )
        RETURNING
          id::text,
          user_id,
          goal_id::text,
          subject_id::text,
          title,
          note,
          start_time::text,
          end_time::text,
          duration_minutes,
          work_mode
        ",
        &[
          &input.user_id,
          &input.goal_id,
          &input.subject_id,
          &input.title,
          &input.note,
          &input.start_time,
          &input.end_time,
          &input.duration_minutes,
          &input.work_mode,
        ],
      )
      .map_err(|error| format!("failed to create study session: {error}"))?;

    Ok(map_session(&row))
  }

  pub fn find_by_id(&self, id: &str) -> Result<Option<StudySession>, String> {
    let mut client = connect(&self.database_url)?;
    let row = client
      .query_opt(
        "
        SELECT
          id::text,
          user_id,
          goal_id::text,
          subject_id::text,
          title,
          note,
          start_time::text,
          end_time::text,
          duration_minutes,
          work_mode
        FROM study_sessions
        WHERE id = ($1::text)::uuid
        ",
        &[&id],
      )
      .map_err(|error| format!("failed to find study session by id: {error}"))?;

    Ok(row.as_ref().map(map_session))
  }

  pub fn list_by_user(&self, user_id: &str) -> Result<Vec<StudySession>, String> {
    let mut client = connect(&self.database_url)?;
    let rows = client
      .query(
        "
        SELECT
          id::text,
          user_id,
          goal_id::text,
          subject_id::text,
          title,
          note,
          start_time::text,
          end_time::text,
          duration_minutes,
          work_mode
        FROM study_sessions
        WHERE user_id = $1
        ORDER BY start_time ASC
        ",
        &[&user_id],
      )
      .map_err(|error| format!("failed to list study sessions by user: {error}"))?;

    Ok(rows.iter().map(map_session).collect())
  }

  pub fn update(
    &self,
    id: &str,
    input: UpdateStudySessionInput,
  ) -> Result<Option<StudySession>, String> {
    let mut client = connect(&self.database_url)?;
    let row = client
      .query_opt(
        "
        UPDATE study_sessions
        SET
          goal_id = ($2::text)::uuid,
          subject_id = ($3::text)::uuid,
          title = $4,
          note = $5,
          start_time = ($6::text)::timestamptz,
          end_time = ($7::text)::timestamptz,
          duration_minutes = $8,
          work_mode = $9,
          updated_at = NOW()
        WHERE id = ($1::text)::uuid
        RETURNING
          id::text,
          user_id,
          goal_id::text,
          subject_id::text,
          title,
          note,
          start_time::text,
          end_time::text,
          duration_minutes,
          work_mode
        ",
        &[
          &id,
          &input.goal_id,
          &input.subject_id,
          &input.title,
          &input.note,
          &input.start_time,
          &input.end_time,
          &input.duration_minutes,
          &input.work_mode,
        ],
      )
      .map_err(|error| format!("failed to update study session: {error}"))?;

    Ok(row.as_ref().map(map_session))
  }

  pub fn delete(&self, id: &str) -> Result<bool, String> {
    let mut client = connect(&self.database_url)?;
    let deleted = client
      .execute("DELETE FROM study_sessions WHERE id = ($1::text)::uuid", &[&id])
      .map_err(|error| format!("failed to delete study session: {error}"))?;

    Ok(deleted > 0)
  }
}

fn map_session(row: &Row) -> StudySession {
  StudySession {
    id: row.get(0),
    user_id: row.get(1),
    goal_id: row.get(2),
    subject_id: row.get(3),
    title: row.get(4),
    note: row.get(5),
    start_time: row.get(6),
    end_time: row.get(7),
    duration_minutes: row.get(8),
    work_mode: row.get(9),
  }
}
