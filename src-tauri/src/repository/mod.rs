mod goal_repository;
mod models;
mod session_repository;
mod subject_repository;
mod weekly_target_repository;

pub use goal_repository::GoalRepository;
pub use models::*;
pub use session_repository::StudySessionRepository;
pub use subject_repository::SubjectRepository;
pub use weekly_target_repository::WeeklyGoalTargetRepository;

use postgres::{Client, NoTls};

#[derive(Clone)]
pub struct RepositoryContext {
  database_url: String,
}

impl RepositoryContext {
  pub fn from_env() -> Self {
    Self {
      database_url: crate::database::resolve_database_url(),
    }
  }

  pub fn goals(&self) -> GoalRepository {
    GoalRepository::new(self.database_url.clone())
  }

  pub fn subjects(&self) -> SubjectRepository {
    SubjectRepository::new(self.database_url.clone())
  }

  pub fn sessions(&self) -> StudySessionRepository {
    StudySessionRepository::new(self.database_url.clone())
  }

  pub fn weekly_targets(&self) -> WeeklyGoalTargetRepository {
    WeeklyGoalTargetRepository::new(self.database_url.clone())
  }
}

fn connect(database_url: &str) -> Result<Client, String> {
  Client::connect(database_url, NoTls)
    .map_err(|error| format!("failed to connect PostgreSQL: {error}"))
}

#[cfg(test)]
mod tests;
