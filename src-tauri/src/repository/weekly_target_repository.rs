use postgres::Row;

use super::{connect, CreateWeeklyGoalTargetInput, UpdateWeeklyGoalTargetInput, WeeklyGoalTarget};

#[derive(Clone)]
pub struct WeeklyGoalTargetRepository {
  database_url: String,
}

impl WeeklyGoalTargetRepository {
  pub fn new(database_url: String) -> Self {
    Self { database_url }
  }

  pub fn create(&self, input: CreateWeeklyGoalTargetInput) -> Result<WeeklyGoalTarget, String> {
    let mut client = connect(&self.database_url)?;
    let row = client
      .query_one(
        "
        INSERT INTO weekly_goal_targets (goal_id, weekday, target_minutes, updated_at)
        VALUES (($1::text)::uuid, $2, $3, NOW())
        RETURNING id::text, goal_id::text, weekday, target_minutes
        ",
        &[&input.goal_id, &input.weekday, &input.target_minutes],
      )
      .map_err(|error| format!("failed to create weekly goal target: {error}"))?;

    Ok(map_weekly_target(&row))
  }

  pub fn find_by_id(&self, id: &str) -> Result<Option<WeeklyGoalTarget>, String> {
    let mut client = connect(&self.database_url)?;
    let row = client
      .query_opt(
        "
        SELECT id::text, goal_id::text, weekday, target_minutes
        FROM weekly_goal_targets
        WHERE id = ($1::text)::uuid
        ",
        &[&id],
      )
      .map_err(|error| format!("failed to find weekly goal target by id: {error}"))?;

    Ok(row.as_ref().map(map_weekly_target))
  }

  pub fn list_by_goal(&self, goal_id: &str) -> Result<Vec<WeeklyGoalTarget>, String> {
    let mut client = connect(&self.database_url)?;
    let rows = client
      .query(
        "
        SELECT id::text, goal_id::text, weekday, target_minutes
        FROM weekly_goal_targets
        WHERE goal_id = ($1::text)::uuid
        ORDER BY weekday ASC
        ",
        &[&goal_id],
      )
      .map_err(|error| format!("failed to list weekly goal targets by goal: {error}"))?;

    Ok(rows.iter().map(map_weekly_target).collect())
  }

  pub fn update(
    &self,
    id: &str,
    input: UpdateWeeklyGoalTargetInput,
  ) -> Result<Option<WeeklyGoalTarget>, String> {
    let mut client = connect(&self.database_url)?;
    let row = client
      .query_opt(
        "
        UPDATE weekly_goal_targets
        SET
          weekday = $2,
          target_minutes = $3,
          updated_at = NOW()
        WHERE id = ($1::text)::uuid
        RETURNING id::text, goal_id::text, weekday, target_minutes
        ",
        &[&id, &input.weekday, &input.target_minutes],
      )
      .map_err(|error| format!("failed to update weekly goal target: {error}"))?;

    Ok(row.as_ref().map(map_weekly_target))
  }

  pub fn delete(&self, id: &str) -> Result<bool, String> {
    let mut client = connect(&self.database_url)?;
    let deleted = client
      .execute(
        "DELETE FROM weekly_goal_targets WHERE id = ($1::text)::uuid",
        &[&id],
      )
      .map_err(|error| format!("failed to delete weekly goal target: {error}"))?;

    Ok(deleted > 0)
  }

  pub fn upsert(
    &self,
    goal_id: &str,
    weekday: i16,
    target_minutes: i32,
  ) -> Result<WeeklyGoalTarget, String> {
    let mut client = connect(&self.database_url)?;
    let row = client
      .query_one(
        "
        INSERT INTO weekly_goal_targets (goal_id, weekday, target_minutes, updated_at)
        VALUES (($1::text)::uuid, $2, $3, NOW())
        ON CONFLICT (goal_id, weekday)
        DO UPDATE
        SET
          target_minutes = EXCLUDED.target_minutes,
          updated_at = NOW()
        RETURNING id::text, goal_id::text, weekday, target_minutes
        ",
        &[&goal_id, &weekday, &target_minutes],
      )
      .map_err(|error| format!("failed to upsert weekly goal target: {error}"))?;

    Ok(map_weekly_target(&row))
  }
}

fn map_weekly_target(row: &Row) -> WeeklyGoalTarget {
  WeeklyGoalTarget {
    id: row.get(0),
    goal_id: row.get(1),
    weekday: row.get(2),
    target_minutes: row.get(3),
  }
}
