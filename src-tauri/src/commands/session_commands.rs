use serde::Deserialize;

use crate::{
  repository::{RepositoryContext, StudySession},
  services::{StopTimerInput, TimerService},
};

use super::{ApiResponse, DeleteCommandResult};

#[derive(Debug, Deserialize)]
pub struct StopTimerCommandInput {
  pub user_id: String,
  pub goal_id: Option<String>,
  pub subject_id: Option<String>,
  pub title: String,
  pub note: String,
  pub start_time: String,
  pub end_time: String,
  pub started_at_unix_seconds: i64,
  pub stopped_at_unix_seconds: i64,
  pub work_mode: String,
}

#[tauri::command]
pub fn save_stopped_timer(input: StopTimerCommandInput) -> ApiResponse<StudySession> {
  let context = RepositoryContext::from_env();
  let timer_service = TimerService::new(context.sessions());

  match timer_service.stop_timer_and_save_session(StopTimerInput {
    user_id: input.user_id,
    goal_id: input.goal_id,
    subject_id: input.subject_id,
    title: input.title,
    note: input.note,
    start_time: input.start_time,
    end_time: input.end_time,
    started_at_unix_seconds: input.started_at_unix_seconds,
    stopped_at_unix_seconds: input.stopped_at_unix_seconds,
    work_mode: input.work_mode,
  }) {
    Ok(result) => ApiResponse::success(result.session),
    Err(error) => ApiResponse::error(error),
  }
}

#[tauri::command]
pub fn list_sessions(user_id: String) -> ApiResponse<Vec<StudySession>> {
  let repository = RepositoryContext::from_env().sessions();

  match repository.list_by_user(&user_id) {
    Ok(sessions) => ApiResponse::success(sessions),
    Err(error) => ApiResponse::error(error),
  }
}

#[tauri::command]
pub fn delete_session(id: String) -> ApiResponse<DeleteCommandResult> {
  let repository = RepositoryContext::from_env().sessions();

  match repository.delete(&id) {
    Ok(deleted) => ApiResponse::success(DeleteCommandResult { deleted }),
    Err(error) => ApiResponse::error(error),
  }
}
