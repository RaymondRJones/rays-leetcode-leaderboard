import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const extensionDirectory = resolve(scriptDirectory, "..");
const manifestPath = resolve(extensionDirectory, "manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

if (manifest.manifest_version !== 3) {
  throw new Error("RayTrack must use Manifest V3.");
}

const forbiddenPermissions = new Set([
  "cookies",
  "history",
  "tabs",
  "webRequest",
  "webRequestBlocking"
]);
const requestedPermissions = [
  ...(manifest.permissions || []),
  ...(manifest.optional_permissions || [])
];
const forbiddenRequested = requestedPermissions.filter((permission) =>
  forbiddenPermissions.has(permission)
);
if (forbiddenRequested.length > 0) {
  throw new Error(`Forbidden broad permissions requested: ${forbiddenRequested.join(", ")}`);
}

const expectedFiles = [
  manifest.background?.service_worker,
  manifest.side_panel?.default_path,
  ...(manifest.content_scripts || []).flatMap((script) => script.js || []),
  "styles.css",
  "src/sidepanel.js",
  "assets/problem-catalog.json"
].filter(Boolean);

await Promise.all(
  expectedFiles.map((file) => access(resolve(extensionDirectory, file)))
);

const catalog = JSON.parse(
  await readFile(resolve(extensionDirectory, "assets/problem-catalog.json"), "utf8")
);
if (!Array.isArray(catalog.problems) || catalog.problems.length < 2000) {
  throw new Error("The packaged problem catalog is unexpectedly small.");
}

console.log(
  `Validated RayTrack MV3 manifest and ${catalog.problems.length} catalog entries.`
);
