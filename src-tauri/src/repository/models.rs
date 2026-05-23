use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Goal {
  pub id: String,
  pub user_id: String,
  pub title: String,
  pub description: Option<String>,
  pub goal_type: String,
  pub start_date: String,
  pub end_date: String,
  pub is_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateGoalInput {
  pub user_id: String,
  pub title: String,
  pub description: Option<String>,
  pub goal_type: String,
  pub start_date: String,
  pub end_date: String,
  pub is_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateGoalInput {
  pub title: String,
  pub description: Option<String>,
  pub goal_type: String,
  pub start_date: String,
  pub end_date: String,
  pub is_active: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Subject {
  pub id: String,
  pub user_id: String,
  pub name: String,
  pub color: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateSubjectInput {
  pub user_id: String,
  pub name: String,
  pub color: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateSubjectInput {
  pub name: String,
  pub color: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct WeeklyGoalTarget {
  pub id: String,
  pub goal_id: String,
  pub weekday: i16,
  pub target_minutes: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateWeeklyGoalTargetInput {
  pub goal_id: String,
  pub weekday: i16,
  pub target_minutes: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateWeeklyGoalTargetInput {
  pub weekday: i16,
  pub target_minutes: i32,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct StudySession {
  pub id: String,
  pub user_id: String,
  pub goal_id: Option<String>,
  pub subject_id: Option<String>,
  pub title: String,
  pub note: String,
  pub start_time: String,
  pub end_time: String,
  pub duration_minutes: i32,
  pub work_mode: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateStudySessionInput {
  pub user_id: String,
  pub goal_id: Option<String>,
  pub subject_id: Option<String>,
  pub title: String,
  pub note: String,
  pub start_time: String,
  pub end_time: String,
  pub duration_minutes: i32,
  pub work_mode: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateStudySessionInput {
  pub goal_id: Option<String>,
  pub subject_id: Option<String>,
  pub title: String,
  pub note: String,
  pub start_time: String,
  pub end_time: String,
  pub duration_minutes: i32,
  pub work_mode: String,
}
