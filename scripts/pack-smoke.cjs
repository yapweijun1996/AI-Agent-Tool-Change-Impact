"use strict";

const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { mkdirSync, mkdtempSync, readdirSync, rmSync } = require("node:fs");
const { join } = require("node:path");
const { tmpdir } = require("node:os");

const root = join(__dirname, "..");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const shellOptions = process.platform === "win32" ? { shell: true } : {};
const tempRoot = mkdtempSync(join(tmpdir(), "agent-impact-pack-smoke-"));

function runNpm(args, cwd) {
  return execFileSync(npmCommand, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...shellOptions,
  });
}

try {
  const packDirectory = join(tempRoot, "pack");
  const appDirectory = join(tempRoot, "app");
  mkdirSync(packDirectory);
  mkdirSync(appDirectory);
  runNpm(["pack", "--ignore-scripts", "--pack-destination", packDirectory], root);
  const tarballs = readdirSync(packDirectory).filter((entry) => entry.endsWith(".tgz"));
  assert.equal(tarballs.length, 1, "pack should produce exactly one tarball");
  runNpm(["init", "-y"], appDirectory);
  runNpm(["install", "--offline", "--omit=dev", join(packDirectory, tarballs[0])], appDirectory);

  const apiProbe = execFileSync(process.execPath, [
    "-e",
    "const result = require('agent-change-impact').capabilities(); if (!result.ok || result.schemaVersion !== '0.1-draft') process.exit(1);",
  ], { cwd: appDirectory, encoding: "utf8" });
  assert.equal(apiProbe, "");

  const cliName = process.platform === "win32" ? "agent-impact.cmd" : "agent-impact";
  const cliOutput = execFileSync(join(appDirectory, "node_modules", ".bin", cliName), ["capabilities", "--json"], {
    cwd: appDirectory,
    encoding: "utf8",
    ...shellOptions,
  });
  const cliResult = JSON.parse(cliOutput);
  assert.equal(cliResult.ok, true);
  assert.equal(cliResult.operation, "capabilities");
  process.stdout.write("pack-smoke: pass (installed API and CLI)\n");
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
