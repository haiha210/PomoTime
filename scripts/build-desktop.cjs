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

function newestArtifact(dir, extension) {
  if (!fs.existsSync(dir)) {
    return null;
  }

  const files = fs
    .readdirSync(dir)
    .filter((fileName) => fileName.toLowerCase().endsWith(extension))
    .map((fileName) => {
      const fullPath = path.join(dir, fileName);
      return {
        fileName,
        fullPath,
        mtimeMs: fs.statSync(fullPath).mtimeMs,
      };
    })
    .sort((left, right) => right.mtimeMs - left.mtimeMs);

  return files[0] || null;
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

  const latestDeb = newestArtifact(debDir, ".deb");
  if (!latestDeb) {
    throw new Error(`No .deb file was generated in ${debDir}`);
  }

  const debPath = latestDeb.fullPath;
  const relativeDebPath = path.relative(process.cwd(), debPath);

  if (ensureCommandAvailable("dpkg-deb")) {
    run("dpkg-deb", ["--info", debPath], "Deb archive validation");
  }

  console.log(`\nDeb package ready: ${relativeDebPath}`);
  console.log(`Install with: sudo dpkg -i ${relativeDebPath}`);
}

function buildWindowsInstallers() {
  run("tauri", ["build", "--bundles", "nsis,msi"], "Windows installer build");

  const bundleDir = path.join(process.cwd(), "src-tauri", "target", "release", "bundle");
  const artifacts = [
    { label: "NSIS", dir: path.join(bundleDir, "nsis"), ext: ".exe" },
    { label: "MSI", dir: path.join(bundleDir, "msi"), ext: ".msi" },
  ];

  let producedAny = false;
  for (const artifact of artifacts) {
    const latest = newestArtifact(artifact.dir, artifact.ext);
    if (!latest) {
      console.warn(`No ${artifact.label} artifact found in ${artifact.dir}`);
      continue;
    }
    producedAny = true;
    const relativePath = path.relative(process.cwd(), latest.fullPath);
    console.log(`\n${artifact.label} installer ready: ${relativePath}`);
  }

  if (!producedAny) {
    throw new Error(`No Windows installers were generated under ${bundleDir}`);
  }
}

function buildDesktop() {
  if (process.platform === "linux") {
    buildLinuxDeb();
    return;
  }

  if (process.platform === "win32") {
    buildWindowsInstallers();
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
