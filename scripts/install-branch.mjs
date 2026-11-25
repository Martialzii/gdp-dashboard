import { spawnSync } from "node:child_process";
import { access, mkdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const repository = "https://github.com/Martialzii/gdp-dashboard.git";
const usage = `Usage: node scripts/install-branch.mjs [options]

Options:
  --branch <current|branch-name>  Use the current checkout or install a remote branch
  --implementation <typescript|go|both>
  --destination <path>            Remote branch install directory (must not exist)
  --refresh-data                   Fetch World Bank and Natural Earth snapshots
  --dry-run                        Show choices without cloning or installing
  --help`;

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help") options.help = true;
    else if (argument === "--refresh-data") options.refreshData = true;
    else if (argument === "--dry-run") options.dryRun = true;
    else if (["--branch", "--implementation", "--destination"].includes(argument)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${argument} requires a value`);
      options[argument.slice(2)] = value;
      index += 1;
    } else {
      throw new Error(`Unknown option: ${argument}`);
    }
  }
  if (options.implementation && !["typescript", "go", "both"].includes(options.implementation)) {
    throw new Error("--implementation must be typescript, go, or both");
  }
  if (options.destination && options.branch === "current") {
    throw new Error("--destination can only be used with a remote branch");
  }
  return options;
}

function run(command, args, cwd, description) {
  console.log(`\n${description}`);
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32" && command === "npm.cmd",
  });
  if (result.error) throw new Error(`${description} failed: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`${description} failed with exit code ${result.status ?? "unknown"}`);
}

function branchSlug(branch) {
  const slug = branch.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^\.+|\.+$/g, "");
  if (!slug || slug === "." || slug === "..") throw new Error("Branch name cannot form a safe install directory");
  return slug;
}

async function ask(question) {
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await terminal.question(question)).trim();
  } finally {
    terminal.close();
  }
}

async function chooseOptions(options) {
  const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY);
  if (!options.branch && interactive) {
    options.branch = await ask("Install branch [current checkout; type a remote branch name to isolate it]: ") || "current";
  }
  options.branch ??= "current";
  if (!options.implementation && interactive) {
    options.implementation = await ask("Implementation [typescript, go, or both]: ");
  }
  if (!options.implementation) options.implementation = "both";
  if (options.refreshData === undefined && interactive) {
    options.refreshData = /^y(es)?$/i.test(await ask("Refresh data from World Bank and Natural Earth now? [y/N]: "));
  }
  options.refreshData ??= false;
  return options;
}

async function ensureRemoteBranchIsValid(branch) {
  const result = spawnSync("git", ["check-ref-format", "--branch", branch], { encoding: "utf8" });
  if (result.error) throw new Error(`Git is required to install remote branches: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`Invalid Git branch name: ${branch}`);
}

async function main() {
  let options;
  try {
    options = parseArguments(process.argv.slice(2));
    if (options.help) {
      console.log(usage);
      return;
    }
    options = await chooseOptions(options);
    if (options.destination && options.branch === "current") {
      throw new Error("--destination can only be used with a remote branch");
    }

    let sourceDirectory = root;
    let branch = options.branch;
    let destination;
    if (branch !== "current") {
      await ensureRemoteBranchIsValid(branch);
      destination = path.resolve(options.destination ??
        path.join(os.homedir(), ".gdp-dashboard", branchSlug(branch)));
      sourceDirectory = destination;
    } else {
      const result = spawnSync("git", ["branch", "--show-current"], { cwd: root, encoding: "utf8" });
      branch = result.status === 0 && result.stdout.trim() ? result.stdout.trim() : "local checkout";
    }

    console.log(`Branch: ${branch}`);
    console.log(`Implementation: ${options.implementation}`);
    if (destination) console.log(`Install directory: ${destination}`);
    console.log(`Refresh external data now: ${options.refreshData ? "yes" : "no"}`);
    if (options.dryRun) {
      console.log("Dry run: cloning, dependency installation, and data refresh were skipped.");
      return;
    }

    if (destination) {
      try {
        await access(destination);
        throw new Error(`Install directory already exists; refusing to overwrite it: ${destination}`);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
      run("git", [
        "clone", "--depth", "1", "--single-branch", "--no-tags",
        "--branch", options.branch, repository, destination,
      ], root, "Cloning only the selected branch and latest commit");
    }

    if (options.refreshData) {
      run(process.execPath, ["scripts/refresh-dashboard-data.mjs"], sourceDirectory,
        "Refreshing World Bank and Natural Earth datasets");
    }

    const packageFile = JSON.parse(await readFile(path.join(sourceDirectory, "typescript-dashboard", "package.json"), "utf8"));
    const version = packageFile.version;
    if (options.implementation === "typescript" || options.implementation === "both") {
      const npm = process.platform === "win32" ? "npm.cmd" : "npm";
      run(npm, ["ci", "--prefer-offline", "--no-audit", "--no-fund"],
        path.join(sourceDirectory, "typescript-dashboard"), "Installing TypeScript dependencies");
      run(npm, ["run", "build"], path.join(sourceDirectory, "typescript-dashboard"),
        `Building TypeScript dashboard v${version}`);
    }
    if (options.implementation === "go" || options.implementation === "both") {
      const goVersion = spawnSync("go", ["version"], { encoding: "utf8" });
      if (goVersion.error || goVersion.status !== 0) {
        throw new Error("Go 1.21+ is required for the selected Go implementation.");
      }
      const versionMatch = goVersion.stdout.match(/go(\d+)\.(\d+)/);
      if (!versionMatch || Number(versionMatch[1]) < 1 ||
          (Number(versionMatch[1]) === 1 && Number(versionMatch[2]) < 21)) {
        throw new Error(`Go 1.21+ is required; found ${goVersion.stdout.trim()}.`);
      }
      const output = process.platform === "win32" ? "bin/gdp-dashboard.exe" : "bin/gdp-dashboard";
      await mkdir(path.join(sourceDirectory, "bin"), { recursive: true });
      run("go", ["build", "-ldflags", `-X main.appVersion=${version}`, "-o", output, "./go-dashboard"],
        sourceDirectory, `Building Go dashboard v${version}`);
    }
    console.log(`\nInstallation complete: branch ${branch}, dashboard v${version}.`);
    if (options.implementation === "typescript" || options.implementation === "both") {
      console.log(`Run from ${sourceDirectory}: npm --prefix typescript-dashboard start`);
    }
    if (options.implementation === "go" || options.implementation === "both") {
      console.log(`Run: ${path.join(sourceDirectory, "bin", process.platform === "win32" ? "gdp-dashboard.exe" : "gdp-dashboard")}`);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

await main();
