use postgres::Row;

use super::{connect, CreateGoalInput, Goal, UpdateGoalInput};

#[derive(Clone)]
pub struct GoalRepository {
  database_url: String,
}

impl GoalRepository {
  pub fn new(database_url: String) -> Self {
    Self { database_url }
  }

  pub fn create(&self, input: CreateGoalInput) -> Result<Goal, String> {
    let mut client = connect(&self.database_url)?;
    let row = client
      .query_one(
        "
        INSERT INTO learning_goals (
          user_id,
          title,
          description,
          goal_type,
          start_date,
          end_date,
          is_active,
          updated_at
        )
        VALUES ($1, $2, $3, $4, ($5::text)::date, ($6::text)::date, $7, NOW())
        RETURNING
          id::text,
          user_id,
          title,
          description,
          goal_type,
          start_date::text,
          end_date::text,
          is_active
        ",
        &[
          &input.user_id,
          &input.title,
          &input.description,
          &input.goal_type,
          &input.start_date,
          &input.end_date,
          &input.is_active,
        ],
      )
      .map_err(|error| format!("failed to create goal: {error}"))?;

    Ok(map_goal(&row))
  }

  #[cfg(test)]
  pub fn find_by_id(&self, id: &str) -> Result<Option<Goal>, String> {
    let mut client = connect(&self.database_url)?;
    let row = client
      .query_opt(
        "
        SELECT
          id::text,
          user_id,
          title,
          description,
          goal_type,
          start_date::text,
          end_date::text,
          is_active
        FROM learning_goals
        WHERE id = ($1::text)::uuid
        ",
        &[&id],
      )
      .map_err(|error| format!("failed to find goal by id: {error}"))?;

    Ok(row.as_ref().map(map_goal))
  }

  pub fn list_by_user(&self, user_id: &str) -> Result<Vec<Goal>, String> {
    let mut client = connect(&self.database_url)?;
    let rows = client
      .query(
        "
        SELECT
          id::text,
          user_id,
          title,
          description,
          goal_type,
          start_date::text,
          end_date::text,
          is_active
        FROM learning_goals
        WHERE user_id = $1
        ORDER BY created_at ASC
        ",
        &[&user_id],
      )
      .map_err(|error| format!("failed to list goals by user: {error}"))?;

    Ok(rows.iter().map(map_goal).collect())
  }

  pub fn update(&self, id: &str, input: UpdateGoalInput) -> Result<Option<Goal>, String> {
    let mut client = connect(&self.database_url)?;
    let row = client
      .query_opt(
        "
        UPDATE learning_goals
        SET
          title = $2,
          description = $3,
          goal_type = $4,
          start_date = ($5::text)::date,
          end_date = ($6::text)::date,
          is_active = $7,
          updated_at = NOW()
        WHERE id = ($1::text)::uuid
        RETURNING
          id::text,
          user_id,
          title,
          description,
          goal_type,
          start_date::text,
          end_date::text,
          is_active
        ",
        &[
          &id,
          &input.title,
          &input.description,
          &input.goal_type,
          &input.start_date,
          &input.end_date,
          &input.is_active,
        ],
      )
      .map_err(|error| format!("failed to update goal: {error}"))?;

    Ok(row.as_ref().map(map_goal))
  }

  pub fn delete(&self, id: &str) -> Result<bool, String> {
    let mut client = connect(&self.database_url)?;
    let deleted = client
      .execute(
        "DELETE FROM learning_goals WHERE id = ($1::text)::uuid",
        &[&id],
      )
      .map_err(|error| format!("failed to delete goal: {error}"))?;

    Ok(deleted > 0)
  }

  pub fn set_active(&self, goal_id: &str) -> Result<Option<Goal>, String> {
    let mut client = connect(&self.database_url)?;
    let mut tx = client
      .transaction()
      .map_err(|error| format!("failed to start set_active transaction: {error}"))?;

    let user_row = tx
      .query_opt(
        "SELECT user_id FROM learning_goals WHERE id = ($1::text)::uuid",
        &[&goal_id],
      )
      .map_err(|error| format!("failed to find goal owner: {error}"))?;

    let Some(user_row) = user_row else {
      tx.rollback()
        .map_err(|error| format!("failed to rollback missing-goal transaction: {error}"))?;
      return Ok(None);
    };

    let user_id: String = user_row.get(0);

    tx.execute(
      "UPDATE learning_goals SET is_active = FALSE, updated_at = NOW() WHERE user_id = $1",
      &[&user_id],
    )
    .map_err(|error| format!("failed to clear active goals: {error}"))?;

    let updated = tx
      .query_opt(
        "
        UPDATE learning_goals
        SET is_active = TRUE, updated_at = NOW()
        WHERE id = ($1::text)::uuid
        RETURNING
          id::text,
          user_id,
          title,
          description,
          goal_type,
          start_date::text,
          end_date::text,
          is_active
        ",
        &[&goal_id],
      )
      .map_err(|error| format!("failed to set active goal: {error}"))?;

    tx.commit()
      .map_err(|error| format!("failed to commit set_active transaction: {error}"))?;

    Ok(updated.as_ref().map(map_goal))
  }
}

fn map_goal(row: &Row) -> Goal {
  Goal {
    id: row.get(0),
    user_id: row.get(1),
    title: row.get(2),
    description: row.get(3),
    goal_type: row.get(4),
    start_date: row.get(5),
    end_date: row.get(6),
    is_active: row.get(7),
  }
}
