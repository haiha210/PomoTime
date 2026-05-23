use std::fs;
use std::path::PathBuf;

fn ensure_frontend_dist_exists() {
  let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").unwrap_or_else(|_| ".".to_string());
  let dist_dir = PathBuf::from(manifest_dir).join("../dist");

  if dist_dir.exists() {
    return;
  }

  fs::create_dir_all(&dist_dir)
    .expect("failed to create ../dist directory required by tauri frontendDist");
}

fn main() {
  ensure_frontend_dist_exists();
  tauri_build::build();
}
