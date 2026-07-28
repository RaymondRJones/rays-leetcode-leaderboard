import { access, cp, mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const extensionDirectory = resolve(scriptDirectory, "..");
const chromeCandidates = [
  process.env.CHROME_BIN,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser"
].filter(Boolean);

const chromePath = await findFirstAccessible(chromeCandidates);
if (!chromePath) {
  console.log("Skipped Chrome package smoke test because no Chrome executable was found.");
  process.exit(0);
}

const temporaryRoot = await mkdtemp(join(tmpdir(), "raytrack-pack-"));
const temporaryExtension = join(temporaryRoot, "raytrack");
const packagePath = `${temporaryExtension}.crx`;

try {
  await cp(extensionDirectory, temporaryExtension, {
    recursive: true,
    filter: (source) => !source.includes(`${join("node_modules", "")}`)
  });

  const result = await runChrome(chromePath, [
    `--pack-extension=${temporaryExtension}`
  ]);
  if (result.exitCode !== 0) {
    throw new Error(
      `Chrome rejected the RayTrack package: ${result.stderr || result.stdout}`.trim()
    );
  }

  const packageStats = await stat(packagePath);
  if (!packageStats.isFile() || packageStats.size === 0) {
    throw new Error("Chrome did not produce a non-empty RayTrack CRX package.");
  }

  console.log(
    `Chrome packaged RayTrack successfully (${packageStats.size.toLocaleString()} bytes).`
  );
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}

async function findFirstAccessible(candidates) {
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next platform-specific Chrome location.
    }
  }
  return null;
}

async function runChrome(executable, argumentsList) {
  const child = spawn(executable, argumentsList, {
    stdio: ["ignore", "pipe", "pipe"]
  });
  let stdout = "";
  let stderr = "";

  child.stdout.on("data", (chunk) => {
    stdout += String(chunk);
  });
  child.stderr.on("data", (chunk) => {
    stderr += String(chunk);
  });

  const exitCode = await new Promise((resolveExit, rejectExit) => {
    child.once("error", rejectExit);
    child.once("exit", (code) => resolveExit(code ?? 1));
  });

  return { exitCode, stdout: stdout.trim(), stderr: stderr.trim() };
}
