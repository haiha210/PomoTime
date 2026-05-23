use std::collections::HashSet;

use chrono::{Duration, NaiveDate, Utc};

use crate::repository::StudySession;

#[derive(Debug, Clone, PartialEq)]
pub struct DailyProgress {
  pub target_minutes: i32,
  pub studied_minutes: i32,
  pub remaining_minutes: i32,
  pub progress_ratio: f64,
  pub is_target_reached: bool,
}

pub struct ProgressService;

impl ProgressService {
  pub fn sum_studied_minutes(sessions: &[StudySession]) -> i32 {
    sessions
      .iter()
      .fold(0_i32, |acc, session| acc.saturating_add(session.duration_minutes))
  }

  pub fn calculate_daily_progress(target_minutes: i32, studied_minutes: i32) -> DailyProgress {
    let safe_target_minutes = target_minutes.max(0);
    let safe_studied_minutes = studied_minutes.max(0);

    let remaining_minutes = (safe_target_minutes - safe_studied_minutes).max(0);
    let is_target_reached = safe_studied_minutes >= safe_target_minutes && safe_target_minutes > 0;

    let progress_ratio = if safe_target_minutes == 0 {
      0.0
    } else {
      (safe_studied_minutes as f64 / safe_target_minutes as f64).min(1.0)
    };

    DailyProgress {
      target_minutes: safe_target_minutes,
      studied_minutes: safe_studied_minutes,
      remaining_minutes,
      progress_ratio,
      is_target_reached,
    }
  }

  pub fn calculate_streak(completed_dates: &[String], today: &str) -> Result<i32, String> {
    let today_date = parse_date(today)?;
    let unique_dates = parse_unique_dates(completed_dates)?;

    let mut streak = 0_i32;
    let mut cursor = today_date;

    while unique_dates.contains(&cursor) {
      streak += 1;
      cursor -= Duration::days(1);
    }

    Ok(streak)
  }

  pub fn calculate_streak_until_today(completed_dates: &[String]) -> Result<i32, String> {
    let today = Utc::now().date_naive().format("%Y-%m-%d").to_string();
    Self::calculate_streak(completed_dates, &today)
  }
}

fn parse_unique_dates(date_strings: &[String]) -> Result<HashSet<NaiveDate>, String> {
  date_strings
    .iter()
    .map(|value| parse_date(value))
    .collect::<Result<HashSet<_>, _>>()
}

fn parse_date(value: &str) -> Result<NaiveDate, String> {
  NaiveDate::parse_from_str(value, "%Y-%m-%d")
    .map_err(|error| format!("invalid date '{value}': {error}"))
}
