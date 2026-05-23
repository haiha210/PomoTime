use postgres::Row;

use super::{connect, CreateSubjectInput, Subject, UpdateSubjectInput};

#[derive(Clone)]
pub struct SubjectRepository {
  database_url: String,
}

impl SubjectRepository {
  pub fn new(database_url: String) -> Self {
    Self { database_url }
  }

  pub fn create(&self, input: CreateSubjectInput) -> Result<Subject, String> {
    let mut client = connect(&self.database_url)?;
    let row = client
      .query_one(
        "
        INSERT INTO subjects (user_id, name, color, updated_at)
        VALUES ($1, $2, $3, NOW())
        RETURNING id::text, user_id, name, color
        ",
        &[&input.user_id, &input.name, &input.color],
      )
      .map_err(|error| format!("failed to create subject: {error}"))?;

    Ok(map_subject(&row))
  }

  #[cfg(test)]
  pub fn find_by_id(&self, id: &str) -> Result<Option<Subject>, String> {
    let mut client = connect(&self.database_url)?;
    let row = client
      .query_opt(
        "
        SELECT id::text, user_id, name, color
        FROM subjects
        WHERE id = ($1::text)::uuid
        ",
        &[&id],
      )
      .map_err(|error| format!("failed to find subject by id: {error}"))?;

    Ok(row.as_ref().map(map_subject))
  }

  pub fn list_by_user(&self, user_id: &str) -> Result<Vec<Subject>, String> {
    let mut client = connect(&self.database_url)?;
    let rows = client
      .query(
        "
        SELECT id::text, user_id, name, color
        FROM subjects
        WHERE user_id = $1
        ORDER BY created_at ASC
        ",
        &[&user_id],
      )
      .map_err(|error| format!("failed to list subjects by user: {error}"))?;

    Ok(rows.iter().map(map_subject).collect())
  }

  pub fn update(&self, id: &str, input: UpdateSubjectInput) -> Result<Option<Subject>, String> {
    let mut client = connect(&self.database_url)?;
    let row = client
      .query_opt(
        "
        UPDATE subjects
        SET
          name = $2,
          color = $3,
          updated_at = NOW()
        WHERE id = ($1::text)::uuid
        RETURNING id::text, user_id, name, color
        ",
        &[&id, &input.name, &input.color],
      )
      .map_err(|error| format!("failed to update subject: {error}"))?;

    Ok(row.as_ref().map(map_subject))
  }

  pub fn delete(&self, id: &str) -> Result<bool, String> {
    let mut client = connect(&self.database_url)?;
    let deleted = client
      .execute("DELETE FROM subjects WHERE id = ($1::text)::uuid", &[&id])
      .map_err(|error| format!("failed to delete subject: {error}"))?;

    Ok(deleted > 0)
  }
}

fn map_subject(row: &Row) -> Subject {
  Subject {
    id: row.get(0),
    user_id: row.get(1),
    name: row.get(2),
    color: row.get(3),
  }
}
