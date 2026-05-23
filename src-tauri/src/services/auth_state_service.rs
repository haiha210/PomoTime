#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LocalAuthState {
  pub user_id: String,
  pub email: String,
  pub access_token: String,
  pub refresh_token: Option<String>,
  pub synced_unix_seconds: i64,
  pub is_authenticated: bool,
}

#[derive(Debug, Clone)]
pub struct AuthSyncInput {
  pub user_id: String,
  pub email: String,
  pub access_token: String,
  pub refresh_token: Option<String>,
  pub synced_unix_seconds: i64,
}

pub struct AuthStateService;

impl AuthStateService {
  pub fn sync_local_state(
    previous_state: Option<LocalAuthState>,
    input: AuthSyncInput,
  ) -> LocalAuthState {
    let refresh_token = if input.refresh_token.is_some() {
      input.refresh_token
    } else {
      previous_state
        .as_ref()
        .and_then(|state| state.refresh_token.clone())
    };

    LocalAuthState {
      user_id: input.user_id,
      email: input.email,
      access_token: input.access_token,
      refresh_token,
      synced_unix_seconds: input.synced_unix_seconds,
      is_authenticated: true,
    }
  }

  pub fn clear_state(synced_unix_seconds: i64) -> LocalAuthState {
    LocalAuthState {
      user_id: String::new(),
      email: String::new(),
      access_token: String::new(),
      refresh_token: None,
      synced_unix_seconds,
      is_authenticated: false,
    }
  }
}
