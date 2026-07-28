import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { NOTIFICATION_ICON_DATA_URL } from "../src/notification-icon.js";

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
for (const requiredPermission of ["alarms", "notifications", "sidePanel", "storage"]) {
  if (!requestedPermissions.includes(requiredPermission)) {
    throw new Error(`RayTrack is missing required permission: ${requiredPermission}`);
  }
}

const expectedFiles = [
  manifest.background?.service_worker,
  manifest.side_panel?.default_path,
  ...(manifest.content_scripts || []).flatMap((script) => script.js || []),
  "styles.css",
  "src/sidepanel.js",
  "assets/icon.svg",
  "assets/icon-128.png",
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

const icon = await readFile(resolve(extensionDirectory, "assets/icon-128.png"));
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
if (!icon.subarray(0, pngSignature.length).equals(pngSignature)) {
  throw new Error("The extension icon is not a valid PNG file.");
}
if (icon.readUInt32BE(16) !== 128 || icon.readUInt32BE(20) !== 128) {
  throw new Error("The extension icon must be exactly 128x128 pixels.");
}

const notificationIconPrefix = "data:image/png;base64,";
if (!NOTIFICATION_ICON_DATA_URL.startsWith(notificationIconPrefix)) {
  throw new Error("The notification icon must be an inline PNG data URL.");
}
const notificationIcon = Buffer.from(
  NOTIFICATION_ICON_DATA_URL.slice(notificationIconPrefix.length),
  "base64"
);
if (!notificationIcon.subarray(0, pngSignature.length).equals(pngSignature)) {
  throw new Error("The inline notification icon is not a valid PNG.");
}
if (
  notificationIcon.readUInt32BE(16) !== 64 ||
  notificationIcon.readUInt32BE(20) !== 64
) {
  throw new Error("The inline notification icon must be exactly 64x64 pixels.");
}

console.log(
  `Validated RayTrack MV3 manifest and ${catalog.problems.length} catalog entries.`
);
