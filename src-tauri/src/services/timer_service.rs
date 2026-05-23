use crate::repository::{CreateStudySessionInput, StudySession, StudySessionRepository};

#[derive(Debug, Clone)]
pub struct StopTimerInput {
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

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StopTimerResult {
  pub session: StudySession,
  pub duration_minutes: i32,
}

#[derive(Clone)]
pub struct TimerService {
  session_repository: StudySessionRepository,
}

impl TimerService {
  pub fn new(session_repository: StudySessionRepository) -> Self {
    Self { session_repository }
  }

  pub fn stop_timer_and_save_session(&self, input: StopTimerInput) -> Result<StopTimerResult, String> {
    let duration_minutes = calculate_duration_minutes(
      input.started_at_unix_seconds,
      input.stopped_at_unix_seconds,
    )?;

    let session = self.session_repository.create(CreateStudySessionInput {
      user_id: input.user_id,
      goal_id: input.goal_id,
      subject_id: input.subject_id,
      title: input.title,
      note: input.note,
      start_time: input.start_time,
      end_time: input.end_time,
      duration_minutes,
      work_mode: input.work_mode,
    })?;

    Ok(StopTimerResult {
      session,
      duration_minutes,
    })
  }
}

pub fn calculate_duration_minutes(
  started_at_unix_seconds: i64,
  stopped_at_unix_seconds: i64,
) -> Result<i32, String> {
  if stopped_at_unix_seconds <= started_at_unix_seconds {
    return Err("stopped_at_unix_seconds must be greater than started_at_unix_seconds".to_string());
  }

  let total_seconds = stopped_at_unix_seconds - started_at_unix_seconds;
  let rounded_minutes = (total_seconds + 59) / 60;

  i32::try_from(rounded_minutes)
    .map_err(|_| "calculated duration_minutes overflowed i32 range".to_string())
}
