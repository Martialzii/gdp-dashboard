import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const installer = path.join(root, "scripts", "install-branch.mjs");

function runInstaller(args) {
  return spawnSync(process.execPath, [installer, ...args], {
    cwd: root,
    encoding: "utf8",
    env: process.env,
  });
}

test("branch installer supports a no-network dry run for a selected branch", () => {
  const destination = path.join(os.tmpdir(), "gdp-installer-dry-run");
  const result = runInstaller([
    "--branch", "martialzii-gdp-growth-trends",
    "--implementation", "go",
    "--destination", destination,
    "--dry-run",
  ]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Dry run: cloning, dependency installation, and data refresh were skipped/);
  assert.match(result.stdout, /Implementation: go/);
  assert.match(result.stdout, /Refresh external data now: no/);
});

test("branch installer rejects invalid choices and malformed Git branch names", () => {
  const invalidImplementation = runInstaller(["--implementation", "python", "--dry-run"]);
  assert.notEqual(invalidImplementation.status, 0);
  assert.match(invalidImplementation.stderr, /must be typescript, go, or both/);

  const invalidBranch = runInstaller(["--branch", "../other", "--implementation", "go", "--dry-run"]);
  assert.notEqual(invalidBranch.status, 0);
  assert.match(invalidBranch.stderr, /Invalid Git branch name/);
});

test("branch installer refuses to overwrite an existing destination", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "gdp-installer-existing-"));
  const destination = path.join(parent, "preserve");
  await mkdir(destination);
  await writeFile(path.join(destination, "keep.txt"), "preserve this install");
  try {
    const result = runInstaller([
      "--branch", "martialzii-gdp-growth-trends",
      "--implementation", "go",
      "--destination", destination,
    ]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /refusing to overwrite it/);
    assert.equal(await readFile(path.join(destination, "keep.txt"), "utf8"), "preserve this install");
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

test("branch installer help describes shallow branch installs and opt-in data refresh", () => {
  const result = runInstaller(["--help"]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /--branch <current\|branch-name>/);
  assert.match(result.stdout, /--refresh-data/);
});
