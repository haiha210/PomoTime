pub mod goal_commands;
pub mod session_commands;
pub mod stats_commands;
pub mod subject_commands;

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
