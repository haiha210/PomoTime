use serde::{Deserialize, Serialize};

use crate::{repository::RepositoryContext, services::ProgressService};

use super::ApiResponse;

#[derive(Debug, Deserialize)]
pub struct GetDailyStatsInput {
  pub user_id: String,
  pub date: String,
  pub target_minutes: i32,
}

#[derive(Debug, Serialize)]
pub struct DailyStatsResponse {
  pub date: String,
  pub target_minutes: i32,
  pub studied_minutes: i32,
  pub remaining_minutes: i32,
  pub progress_ratio: f64,
  pub is_target_reached: bool,
  pub streak: i32,
}

#[tauri::command]
pub fn get_daily_stats(input: GetDailyStatsInput) -> ApiResponse<DailyStatsResponse> {
  let repository = RepositoryContext::from_env().sessions();

  let sessions = match repository.list_by_user(&input.user_id) {
    Ok(value) => value,
    Err(error) => return ApiResponse::error(error),
  };

  let daily_sessions = sessions
    .iter()
    .filter(|session| session.start_time.starts_with(&input.date))
    .cloned()
    .collect::<Vec<_>>();

  let studied_minutes = ProgressService::sum_studied_minutes(&daily_sessions);
  let progress = ProgressService::calculate_daily_progress(input.target_minutes, studied_minutes);

  let completed_dates = sessions
    .iter()
    .filter(|session| session.duration_minutes > 0)
    .filter_map(|session| extract_date(&session.start_time))
    .collect::<Vec<_>>();

  let streak = match ProgressService::calculate_streak(&completed_dates, &input.date) {
    Ok(value) => value,
    Err(error) => return ApiResponse::error(error),
  };

  ApiResponse::success(DailyStatsResponse {
    date: input.date,
    target_minutes: progress.target_minutes,
    studied_minutes: progress.studied_minutes,
    remaining_minutes: progress.remaining_minutes,
    progress_ratio: progress.progress_ratio,
    is_target_reached: progress.is_target_reached,
    streak,
  })
}

fn extract_date(timestamp: &str) -> Option<String> {
  if timestamp.len() < 10 {
    return None;
  }

  Some(timestamp[0..10].to_string())
}
