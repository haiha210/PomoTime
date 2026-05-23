use serde::Deserialize;

use crate::repository::{CreateGoalInput, Goal, RepositoryContext, UpdateGoalInput};

use super::{ApiResponse, DeleteCommandResult};

#[derive(Debug, Deserialize)]
pub struct CreateGoalCommandInput {
  pub user_id: String,
  pub title: String,
  pub description: Option<String>,
  pub goal_type: String,
  pub start_date: String,
  pub end_date: String,
  pub is_active: bool,
}

#[derive(Debug, Deserialize)]
pub struct UpdateGoalCommandInput {
  pub id: String,
  pub title: String,
  pub description: Option<String>,
  pub goal_type: String,
  pub start_date: String,
  pub end_date: String,
  pub is_active: bool,
}

#[tauri::command]
pub fn create_goal(input: CreateGoalCommandInput) -> ApiResponse<Goal> {
  let repository = RepositoryContext::from_env().goals();

  match repository.create(CreateGoalInput {
    user_id: input.user_id,
    title: input.title,
    description: input.description,
    goal_type: input.goal_type,
    start_date: input.start_date,
    end_date: input.end_date,
    is_active: input.is_active,
  }) {
    Ok(goal) => ApiResponse::success(goal),
    Err(error) => ApiResponse::error(error),
  }
}

#[tauri::command]
pub fn list_goals(user_id: String) -> ApiResponse<Vec<Goal>> {
  let repository = RepositoryContext::from_env().goals();

  match repository.list_by_user(&user_id) {
    Ok(goals) => ApiResponse::success(goals),
    Err(error) => ApiResponse::error(error),
  }
}

#[tauri::command]
pub fn update_goal(input: UpdateGoalCommandInput) -> ApiResponse<Goal> {
  let repository = RepositoryContext::from_env().goals();

  match repository.update(
    &input.id,
    UpdateGoalInput {
      title: input.title,
      description: input.description,
      goal_type: input.goal_type,
      start_date: input.start_date,
      end_date: input.end_date,
      is_active: input.is_active,
    },
  ) {
    Ok(Some(goal)) => ApiResponse::success(goal),
    Ok(None) => ApiResponse::error("goal not found"),
    Err(error) => ApiResponse::error(error),
  }
}

#[tauri::command]
pub fn delete_goal(id: String) -> ApiResponse<DeleteCommandResult> {
  let repository = RepositoryContext::from_env().goals();

  match repository.delete(&id) {
    Ok(deleted) => ApiResponse::success(DeleteCommandResult { deleted }),
    Err(error) => ApiResponse::error(error),
  }
}
