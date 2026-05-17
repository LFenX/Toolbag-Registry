import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const pluginsDir = join(root, "plugins");
const publicDir = join(root, "public");

const categories = JSON.parse(
  await readFile(join(root, "categories.json"), "utf8"),
);
const appVersion = JSON.parse(
  await readFile(join(root, "app-versions.json"), "utf8"),
);

await rm(publicDir, { recursive: true, force: true });
await mkdir(publicDir, { recursive: true });

const pluginFiles = (await readdir(pluginsDir, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
  .map((entry) => entry.name)
  .sort((a, b) => a.localeCompare(b));

const plugins = [];
for (const file of pluginFiles) {
  const plugin = JSON.parse(await readFile(join(pluginsDir, file), "utf8"));
  if (!plugin.id || !Array.isArray(plugin.releases) || plugin.releases.length === 0) {
    throw new Error(`Invalid plugin registry file: plugins/${file}`);
  }

  const latest = [...plugin.releases].sort(compareReleaseDesc)[0];
  for (const key of ["version", "downloadUrl", "publishedAt"]) {
    if (!latest[key]) {
      throw new Error(`plugins/${file}: latest release is missing ${key}`);
    }
  }

  plugins.push({
    id: plugin.id,
    name: plugin.name,
    description: plugin.description,
    category: plugin.category,
    tags: plugin.tags ?? [],
    latestVersion: latest.version,
    minAppVersion: latest.minAppVersion ?? plugin.minAppVersion ?? "0.2.0",
    riskLevel: latest.riskLevel ?? plugin.riskLevel ?? "safe",
    downloadUrl: latest.downloadUrl,
    signatureUrl: latest.signatureUrl ?? null,
    sha256: latest.sha256 ?? null,
    iconUrl: latest.iconUrl ?? plugin.iconUrl ?? null,
    publishedAt: latest.publishedAt,
    size: latest.size ?? null,
    changelog: latest.changelog ?? null,
    author: normalizeAuthor(plugin.author),
  });
}

const index = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  appVersion,
  categories,
  plugins,
};

await writeFile(join(publicDir, "index.json"), `${JSON.stringify(index, null, 2)}\n`);
await writeFile(join(publicDir, "categories.json"), `${JSON.stringify(categories, null, 2)}\n`);
await writeFile(join(publicDir, "app-versions.json"), `${JSON.stringify(appVersion, null, 2)}\n`);
await writeFile(join(publicDir, ".nojekyll"), "");
await cp(join(root, "schemas"), join(publicDir, "schemas"), { recursive: true });

console.log(`Built registry index with ${plugins.length} plugin(s).`);

function compareReleaseDesc(a, b) {
  const versionCompare = compareSemver(b.version, a.version);
  if (versionCompare !== 0) {
    return versionCompare;
  }
  return String(b.publishedAt ?? "").localeCompare(String(a.publishedAt ?? ""));
}

function compareSemver(a, b) {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  for (let i = 0; i < 3; i += 1) {
    if (pa[i] !== pb[i]) {
      return pa[i] - pb[i];
    }
  }
  return pa.prerelease.localeCompare(pb.prerelease);
}

function parseSemver(version) {
  const match = String(version).match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/);
  if (!match) {
    throw new Error(`Invalid semver: ${version}`);
  }
  return [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    prereleaseRank(match[4] ?? ""),
  ];
}

function prereleaseRank(value) {
  return value ? `-${value}` : "";
}

function normalizeAuthor(author) {
  if (author == null) {
    return null;
  }
  if (typeof author === "string") {
    return author;
  }
  if (typeof author === "object") {
    return author.name ?? author.url ?? null;
  }
  return null;
}
