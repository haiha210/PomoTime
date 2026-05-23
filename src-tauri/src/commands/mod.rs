pub mod goal_commands;
pub mod session_commands;
pub mod stats_commands;
pub mod subject_commands;
pub mod weekly_target_commands;

use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct ApiResponse<T: Serialize> {
  pub success: bool,
  pub data: Option<T>,
  pub error: Option<String>,
}

impl<T: Serialize> ApiResponse<T> {
  pub fn success(data: T) -> Self {
    Self {
      success: true,
      data: Some(data),
      error: None,
    }
  }

  pub fn error(message: impl Into<String>) -> Self {
    Self {
      success: false,
      data: None,
      error: Some(message.into()),
    }
  }
}

#[derive(Debug, Serialize)]
pub struct DeleteCommandResult {
  pub deleted: bool,
}

#[cfg(test)]
mod tests {
  use std::time::{SystemTime, UNIX_EPOCH};

  use super::{
    goal_commands::{create_goal, delete_goal, list_goals, CreateGoalCommandInput},
    session_commands::{
      add_manual_session, delete_session, list_sessions, update_session, AddManualSessionInput,
      UpdateSessionInput,
    },
    stats_commands::{get_daily_stats, GetDailyStatsInput},
    subject_commands::{create_subject, delete_subject, CreateSubjectCommandInput},
  };

  fn test_user_id(prefix: &str) -> String {
    let timestamp = SystemTime::now()
      .duration_since(UNIX_EPOCH)
      .expect("system time before unix epoch")
      .as_nanos();

    format!("{prefix}-{timestamp}")
  }

  fn setup_database() {
    crate::database::initialize_database()
      .expect("database migration should run before command tests");
  }

  #[test]
  fn command_crud_flow_for_goal_subject_and_session() {
    setup_database();
    let user_id = test_user_id("command-flow-user");

    let goal_response = create_goal(CreateGoalCommandInput {
      user_id: user_id.clone(),
      title: "Command goal".to_string(),
      description: Some("Goal from command integration test".to_string()),
      goal_type: "custom".to_string(),
      start_date: "2026-06-01".to_string(),
      end_date: "2026-06-30".to_string(),
      is_active: true,
    });
    assert!(goal_response.success);
    let goal = goal_response
      .data
      .expect("goal should be returned on success");

    let subject_response = create_subject(CreateSubjectCommandInput {
      user_id: user_id.clone(),
      name: "Command subject".to_string(),
      color: Some("#228B22".to_string()),
    });
    assert!(subject_response.success);
    let subject = subject_response
      .data
      .expect("subject should be returned on success");

    let added_session = add_manual_session(AddManualSessionInput {
      user_id: user_id.clone(),
      goal_id: Some(goal.id.clone()),
      subject_id: Some(subject.id.clone()),
      title: "Command session".to_string(),
      note: "created by integration test".to_string(),
      start_time: "2026-06-03T08:00:00Z".to_string(),
      end_time: "2026-06-03T09:00:00Z".to_string(),
      duration_minutes: 60,
      work_mode: "focus_clock".to_string(),
    });
    assert!(added_session.success);
    let created_session = added_session
      .data
      .expect("session should be returned on success");

    let listed_sessions = list_sessions(user_id.clone());
    assert!(listed_sessions.success);
    let listed_sessions_data = listed_sessions
      .data
      .expect("session list should be returned on success");
    assert!(listed_sessions_data
      .iter()
      .any(|session| session.id == created_session.id));

    let updated_session = update_session(UpdateSessionInput {
      id: created_session.id.clone(),
      goal_id: Some(goal.id.clone()),
      subject_id: Some(subject.id.clone()),
      title: "Command session updated".to_string(),
      note: "updated by integration test".to_string(),
      start_time: "2026-06-03T08:00:00Z".to_string(),
      end_time: "2026-06-03T09:30:00Z".to_string(),
      duration_minutes: 90,
      work_mode: "pomodoro".to_string(),
    });
    assert!(updated_session.success);
    let updated_session_data = updated_session
      .data
      .expect("updated session should be returned on success");
    assert_eq!(updated_session_data.duration_minutes, 90);
    assert_eq!(updated_session_data.title, "Command session updated");

    let daily_stats = get_daily_stats(GetDailyStatsInput {
      user_id: user_id.clone(),
      date: "2026-06-03".to_string(),
      target_minutes: 60,
    });
    assert!(daily_stats.success);
    let daily_stats_data = daily_stats
      .data
      .expect("daily stats should be returned on success");
    assert_eq!(daily_stats_data.studied_minutes, 90);
    assert!(daily_stats_data.is_target_reached);

    let deleted_session = delete_session(created_session.id.clone());
    assert!(deleted_session.success);
    assert!(
      deleted_session
        .data
        .expect("delete payload should exist")
        .deleted
    );

    let deleted_subject = delete_subject(subject.id.clone());
    assert!(deleted_subject.success);
    assert!(
      deleted_subject
        .data
        .expect("delete payload should exist")
        .deleted
    );

    let deleted_goal = delete_goal(goal.id.clone());
    assert!(deleted_goal.success);
    assert!(
      deleted_goal
        .data
        .expect("delete payload should exist")
        .deleted
    );

    let listed_goals = list_goals(user_id);
    assert!(listed_goals.success);
    assert!(listed_goals
      .data
      .expect("goal list should exist")
      .is_empty());
  }
}
