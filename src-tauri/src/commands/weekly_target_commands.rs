use serde::Deserialize;

use crate::repository::{Goal, RepositoryContext, WeeklyGoalTarget};

use super::ApiResponse;

#[derive(Debug, Deserialize)]
pub struct UpsertWeeklyTargetInput {
  pub goal_id: String,
  pub weekday: i16,
  pub target_minutes: i32,
}

#[tauri::command]
pub fn set_active_goal(goal_id: String) -> ApiResponse<Goal> {
  let repository = RepositoryContext::from_env().goals();

  match repository.set_active(&goal_id) {
    Ok(Some(goal)) => ApiResponse::success(goal),
    Ok(None) => ApiResponse::error("goal not found"),
    Err(error) => ApiResponse::error(error),
  }
}

#[tauri::command]
pub fn list_weekly_targets(goal_id: String) -> ApiResponse<Vec<WeeklyGoalTarget>> {
  let repository = RepositoryContext::from_env().weekly_targets();

  match repository.list_by_goal(&goal_id) {
    Ok(targets) => ApiResponse::success(targets),
    Err(error) => ApiResponse::error(error),
  }
}

#[tauri::command]
pub fn upsert_weekly_target(input: UpsertWeeklyTargetInput) -> ApiResponse<WeeklyGoalTarget> {
  let repository = RepositoryContext::from_env().weekly_targets();

  match repository.upsert(&input.goal_id, input.weekday, input.target_minutes) {
    Ok(target) => ApiResponse::success(target),
    Err(error) => ApiResponse::error(error),
  }
}
