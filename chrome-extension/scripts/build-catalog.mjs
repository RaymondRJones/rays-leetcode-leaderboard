import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const extensionDirectory = resolve(scriptDirectory, "..");
const sourcePath = resolve(
  extensionDirectory,
  "..",
  "leetcode-elo",
  "public",
  "problems_with_categories.json"
);
const outputPath = resolve(extensionDirectory, "assets", "problem-catalog.json");

const sourceText = await readFile(sourcePath, "utf8");
const rawCatalog = JSON.parse(sourceText);
if (!Array.isArray(rawCatalog) || rawCatalog.length === 0) {
  throw new Error("The source problem catalog must be a non-empty array.");
}

const slugs = new Set();
const problems = rawCatalog.map((problem, index) => {
  const slug = String(problem.TitleSlug || "").trim().toLowerCase();
  const title = String(problem.Title || "").trim();
  const rating = Number(problem.Rating);

  if (!slug || !title || !Number.isFinite(rating)) {
    throw new Error(`Catalog problem at index ${index} is missing required data.`);
  }
  if (slugs.has(slug)) {
    throw new Error(`Catalog contains duplicate slug: ${slug}`);
  }
  slugs.add(slug);

  return {
    slug,
    title,
    id: Number.isFinite(Number(problem.ID)) ? Number(problem.ID) : null,
    rating: Math.round(rating * 100) / 100,
    topics: Array.isArray(problem.Topics)
      ? [...new Set(problem.Topics.map((topic) => String(topic).trim()).filter(Boolean))]
      : []
  };
});

problems.sort((left, right) => left.slug.localeCompare(right.slug));

const output = {
  schemaVersion: 1,
  source: {
    name: "ZeroTrac LeetCode Problem Rating",
    repository: "https://github.com/zerotrac/leetcode_problem_rating",
    license: "MIT",
    digest: `sha256:${createHash("sha256").update(sourceText).digest("hex")}`
  },
  problems
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(output)}\n`, "utf8");

console.log(
  `Built ${problems.length} RayTrack catalog entries at ${outputPath}.`
);
