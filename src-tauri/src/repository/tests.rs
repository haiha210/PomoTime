use std::time::{SystemTime, UNIX_EPOCH};

use super::{
  CreateGoalInput, CreateStudySessionInput, CreateSubjectInput, CreateWeeklyGoalTargetInput,
  RepositoryContext, UpdateGoalInput, UpdateStudySessionInput, UpdateSubjectInput,
  UpdateWeeklyGoalTargetInput,
};

fn test_user_id(prefix: &str) -> String {
  let timestamp = SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .expect("system time before unix epoch")
    .as_nanos();

  format!("{prefix}-{timestamp}")
}

fn setup_context() -> RepositoryContext {
  crate::database::initialize_database()
    .expect("database migration should run before repository tests");
  RepositoryContext::from_env()
}

#[test]
fn goal_repository_supports_crud() {
  let context = setup_context();
  let goal_repository = context.goals();
  let user_id = test_user_id("goal-user");

  let created = goal_repository
    .create(CreateGoalInput {
      user_id: user_id.clone(),
      title: "Reach 10h weekly".to_string(),
      description: Some("Focus on backend Rust".to_string()),
      goal_type: "custom".to_string(),
      start_date: "2026-01-01".to_string(),
      end_date: "2026-01-07".to_string(),
      is_active: true,
    })
    .expect("create goal should succeed");

  let fetched = goal_repository
    .find_by_id(&created.id)
    .expect("find goal should succeed")
    .expect("goal should exist");
  assert_eq!(fetched.title, "Reach 10h weekly");

  let updated = goal_repository
    .update(
      &created.id,
      UpdateGoalInput {
        title: "Reach 12h weekly".to_string(),
        description: Some("Include algorithms".to_string()),
        goal_type: "weekly".to_string(),
        start_date: "2026-01-01".to_string(),
        end_date: "2026-01-14".to_string(),
        is_active: false,
      },
    )
    .expect("update goal should succeed")
    .expect("updated goal should exist");
  assert_eq!(updated.title, "Reach 12h weekly");
  assert_eq!(updated.goal_type, "weekly");

  let listed = goal_repository
    .list_by_user(&user_id)
    .expect("list goals should succeed");
  assert!(listed.iter().any(|goal| goal.id == created.id));

  let deleted = goal_repository
    .delete(&created.id)
    .expect("delete goal should succeed");
  assert!(deleted);

  let should_be_none = goal_repository
    .find_by_id(&created.id)
    .expect("find deleted goal should succeed");
  assert!(should_be_none.is_none());
}

#[test]
fn subject_repository_supports_crud() {
  let context = setup_context();
  let subject_repository = context.subjects();
  let user_id = test_user_id("subject-user");

  let created = subject_repository
    .create(CreateSubjectInput {
      user_id: user_id.clone(),
      name: "Databases".to_string(),
      color: Some("#228B22".to_string()),
    })
    .expect("create subject should succeed");

  let fetched = subject_repository
    .find_by_id(&created.id)
    .expect("find subject should succeed")
    .expect("subject should exist");
  assert_eq!(fetched.name, "Databases");

  let updated = subject_repository
    .update(
      &created.id,
      UpdateSubjectInput {
        name: "Databases Advanced".to_string(),
        color: Some("#1E90FF".to_string()),
      },
    )
    .expect("update subject should succeed")
    .expect("updated subject should exist");
  assert_eq!(updated.name, "Databases Advanced");

  let listed = subject_repository
    .list_by_user(&user_id)
    .expect("list subjects should succeed");
  assert!(listed.iter().any(|subject| subject.id == created.id));

  let deleted = subject_repository
    .delete(&created.id)
    .expect("delete subject should succeed");
  assert!(deleted);

  let should_be_none = subject_repository
    .find_by_id(&created.id)
    .expect("find deleted subject should succeed");
  assert!(should_be_none.is_none());
}

#[test]
fn weekly_target_repository_supports_crud() {
  let context = setup_context();
  let goal_repository = context.goals();
  let weekly_target_repository = context.weekly_targets();
  let user_id = test_user_id("weekly-user");

  let goal = goal_repository
    .create(CreateGoalInput {
      user_id,
      title: "Weekly planning".to_string(),
      description: None,
      goal_type: "weekly".to_string(),
      start_date: "2026-02-01".to_string(),
      end_date: "2026-02-28".to_string(),
      is_active: true,
    })
    .expect("goal should be created before weekly target");

  let created = weekly_target_repository
    .create(CreateWeeklyGoalTargetInput {
      goal_id: goal.id.clone(),
      weekday: 1,
      target_minutes: 120,
    })
    .expect("create weekly target should succeed");

  let fetched = weekly_target_repository
    .find_by_id(&created.id)
    .expect("find weekly target should succeed")
    .expect("weekly target should exist");
  assert_eq!(fetched.target_minutes, 120);

  let updated = weekly_target_repository
    .update(
      &created.id,
      UpdateWeeklyGoalTargetInput {
        weekday: 2,
        target_minutes: 150,
      },
    )
    .expect("update weekly target should succeed")
    .expect("updated weekly target should exist");
  assert_eq!(updated.weekday, 2);
  assert_eq!(updated.target_minutes, 150);

  let listed = weekly_target_repository
    .list_by_goal(&goal.id)
    .expect("list weekly targets should succeed");
  assert!(listed.iter().any(|target| target.id == created.id));

  let deleted = weekly_target_repository
    .delete(&created.id)
    .expect("delete weekly target should succeed");
  assert!(deleted);

  let should_be_none = weekly_target_repository
    .find_by_id(&created.id)
    .expect("find deleted weekly target should succeed");
  assert!(should_be_none.is_none());

  goal_repository
    .delete(&goal.id)
    .expect("goal cleanup should succeed");
}

#[test]
fn study_session_repository_supports_crud() {
  let context = setup_context();
  let goal_repository = context.goals();
  let subject_repository = context.subjects();
  let session_repository = context.sessions();
  let user_id = test_user_id("session-user");

  let goal = goal_repository
    .create(CreateGoalInput {
      user_id: user_id.clone(),
      title: "Session goal".to_string(),
      description: None,
      goal_type: "custom".to_string(),
      start_date: "2026-03-01".to_string(),
      end_date: "2026-03-31".to_string(),
      is_active: true,
    })
    .expect("goal should be created before session");

  let subject = subject_repository
    .create(CreateSubjectInput {
      user_id: user_id.clone(),
      name: "Operating Systems".to_string(),
      color: None,
    })
    .expect("subject should be created before session");

  let created = session_repository
    .create(CreateStudySessionInput {
      user_id: user_id.clone(),
      goal_id: Some(goal.id.clone()),
      subject_id: Some(subject.id.clone()),
      title: "Morning focus".to_string(),
      note: "Deep work block".to_string(),
      start_time: "2026-03-01T08:00:00Z".to_string(),
      end_time: "2026-03-01T09:00:00Z".to_string(),
      duration_minutes: 60,
      work_mode: "focus_clock".to_string(),
    })
    .expect("create study session should succeed");

  let fetched = session_repository
    .find_by_id(&created.id)
    .expect("find study session should succeed")
    .expect("study session should exist");
  assert_eq!(fetched.duration_minutes, 60);

  let updated = session_repository
    .update(
      &created.id,
      UpdateStudySessionInput {
        goal_id: Some(goal.id.clone()),
        subject_id: Some(subject.id.clone()),
        title: "Morning focus updated".to_string(),
        note: "Added break".to_string(),
        start_time: "2026-03-01T08:00:00Z".to_string(),
        end_time: "2026-03-01T09:30:00Z".to_string(),
        duration_minutes: 90,
        work_mode: "pomodoro".to_string(),
      },
    )
    .expect("update study session should succeed")
    .expect("updated session should exist");
  assert_eq!(updated.title, "Morning focus updated");
  assert_eq!(updated.duration_minutes, 90);

  let listed = session_repository
    .list_by_user(&user_id)
    .expect("list sessions should succeed");
  assert!(listed.iter().any(|session| session.id == created.id));

  let deleted = session_repository
    .delete(&created.id)
    .expect("delete session should succeed");
  assert!(deleted);

  let should_be_none = session_repository
    .find_by_id(&created.id)
    .expect("find deleted session should succeed");
  assert!(should_be_none.is_none());

  subject_repository
    .delete(&subject.id)
    .expect("subject cleanup should succeed");
  goal_repository
    .delete(&goal.id)
    .expect("goal cleanup should succeed");
}
