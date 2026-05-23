use serde::Deserialize;

use crate::repository::{CreateSubjectInput, RepositoryContext, Subject, UpdateSubjectInput};

use super::{ApiResponse, DeleteCommandResult};

#[derive(Debug, Deserialize)]
pub struct CreateSubjectCommandInput {
  pub user_id: String,
  pub name: String,
  pub color: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateSubjectCommandInput {
  pub id: String,
  pub name: String,
  pub color: Option<String>,
}

#[tauri::command]
pub fn create_subject(input: CreateSubjectCommandInput) -> ApiResponse<Subject> {
  let repository = RepositoryContext::from_env().subjects();

  match repository.create(CreateSubjectInput {
    user_id: input.user_id,
    name: input.name,
    color: input.color,
  }) {
    Ok(subject) => ApiResponse::success(subject),
    Err(error) => ApiResponse::error(error),
  }
}

#[tauri::command]
pub fn list_subjects(user_id: String) -> ApiResponse<Vec<Subject>> {
  let repository = RepositoryContext::from_env().subjects();

  match repository.list_by_user(&user_id) {
    Ok(subjects) => ApiResponse::success(subjects),
    Err(error) => ApiResponse::error(error),
  }
}

#[tauri::command]
pub fn update_subject(input: UpdateSubjectCommandInput) -> ApiResponse<Subject> {
  let repository = RepositoryContext::from_env().subjects();

  match repository.update(
    &input.id,
    UpdateSubjectInput {
      name: input.name,
      color: input.color,
    },
  ) {
    Ok(Some(subject)) => ApiResponse::success(subject),
    Ok(None) => ApiResponse::error("subject not found"),
    Err(error) => ApiResponse::error(error),
  }
}

#[tauri::command]
pub fn delete_subject(id: String) -> ApiResponse<DeleteCommandResult> {
  let repository = RepositoryContext::from_env().subjects();

  match repository.delete(&id) {
    Ok(deleted) => ApiResponse::success(DeleteCommandResult { deleted }),
    Err(error) => ApiResponse::error(error),
  }
}
