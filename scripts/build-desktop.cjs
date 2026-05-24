#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

function run(command, args, goal) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    cwd: process.cwd(),
  });

  if (result.error) {
    throw new Error(`${goal} failed: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(`${goal} failed with exit code ${result.status}`);
  }
}

function ensureCommandAvailable(command) {
  const check = spawnSync("bash", ["-lc", `command -v ${command}`], {
    stdio: "ignore",
    cwd: process.cwd(),
  });

  return check.status === 0;
}

function newestDeb(debDir) {
  const debFiles = fs
    .readdirSync(debDir)
    .filter((fileName) => fileName.endsWith(".deb"))
    .map((fileName) => {
      const fullPath = path.join(debDir, fileName);
      return {
        fileName,
        fullPath,
        mtimeMs: fs.statSync(fullPath).mtimeMs,
      };
    })
    .sort((left, right) => right.mtimeMs - left.mtimeMs);

  return debFiles[0] || null;
}

function buildLinuxDeb() {
  if (!ensureCommandAvailable("fakeroot")) {
    throw new Error("fakeroot is required for Linux deb build. Install it with: sudo apt install fakeroot");
  }

  run("fakeroot", ["tauri", "build", "--bundles", "deb"], "Linux deb build");

  const debDir = path.join(process.cwd(), "src-tauri", "target", "release", "bundle", "deb");
  if (!fs.existsSync(debDir)) {
    throw new Error(`Deb output directory not found: ${debDir}`);
  }

  const latestDeb = newestDeb(debDir);
  if (!latestDeb) {
    throw new Error(`No .deb file was generated in ${debDir}`);
  }

  const rootDebPath = path.join(process.cwd(), latestDeb.fileName);
  fs.copyFileSync(latestDeb.fullPath, rootDebPath);

  if (ensureCommandAvailable("dpkg-deb")) {
    run("dpkg-deb", ["--info", rootDebPath], "Deb archive validation");
  }

  console.log(`\nDeb package ready: ${latestDeb.fileName}`);
  console.log(`Install with: sudo dpkg -i ${latestDeb.fileName}`);
}

function buildDesktop() {
  if (process.platform === "linux") {
    buildLinuxDeb();
    return;
  }

  run("tauri", ["build"], "Desktop build");
}

try {
  buildDesktop();
} catch (error) {
  console.error(`\nBuild failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
