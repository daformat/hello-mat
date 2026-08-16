// Generates public/sitemap.xml by walking the pages directory.
// Run automatically before every build (see the "prebuild" script).

import { execFileSync } from "node:child_process";
import { readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PAGES_DIR = join(ROOT, "pages");
const OUTPUT = join(ROOT, "public", "sitemap.xml");

const SITE_URL = (process.env.SITE_URL ?? "https://hello-mat.com").replace(
  /\/$/,
  ""
);

const PAGE_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js", ".mdx"];
const IGNORED_DIRS = ["api"];

/** Collects every page file, skipping api routes and Next.js special files. */
const collectPageFiles = (dir) => {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.includes(entry.name) || entry.name.startsWith("_")) {
        continue;
      }
      files.push(...collectPageFiles(path));
    } else if (
      PAGE_EXTENSIONS.some((extension) => entry.name.endsWith(extension)) &&
      !entry.name.startsWith("_") &&
      !/\.(test|spec|d)\./.test(entry.name)
    ) {
      files.push(path);
    }
  }
  return files;
};

/** pages/design-engineering/index.tsx -> /design-engineering */
const routeFromFile = (file) => {
  const route = `/${relative(PAGES_DIR, file)}`
    .replace(
      new RegExp(`(${PAGE_EXTENSIONS.join("|")})$`.replace(/\./g, "\\.")),
      ""
    )
    .replace(/\/index$/, "");
  return route === "" ? "/" : route;
};

/**
 * Last modification date: the file's last commit, falling back to its mtime
 * when git history isn't available (shallow clones, tarball deploys).
 */
const lastModified = (file) => {
  try {
    const date = execFileSync(
      "git",
      ["log", "-1", "--format=%cI", "--", file],
      { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
    ).trim();
    if (date) {
      return date.slice(0, 10);
    }
  } catch {
    // git unavailable — fall through to the file mtime
  }
  return statSync(file).mtime.toISOString().slice(0, 10);
};

const priorityForRoute = (route) => {
  if (route === "/") {
    return "1.0";
  }
  const depth = route.split("/").filter(Boolean).length;
  return depth === 1 ? "0.8" : "0.7";
};

const pageFiles = collectPageFiles(PAGES_DIR);
const dynamicRoutes = [];
const entries = [];

for (const file of pageFiles) {
  const route = routeFromFile(file);
  if (route.includes("[")) {
    dynamicRoutes.push(route);
    continue;
  }
  entries.push({
    route,
    lastmod: lastModified(file),
    priority: priorityForRoute(route),
  });
}

entries.sort((a, b) => a.route.localeCompare(b.route));

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(({ route, lastmod, priority }) =>
    [
      "  <url>",
      `    <loc>${SITE_URL}${route}</loc>`,
      `    <lastmod>${lastmod}</lastmod>`,
      `    <priority>${priority}</priority>`,
      "  </url>",
    ].join("\n")
  )
  .join("\n")}
</urlset>
`;

writeFileSync(OUTPUT, xml);

console.log(
  `Sitemap: wrote ${entries.length} urls to ${relative(ROOT, OUTPUT)}`
);
if (dynamicRoutes.length) {
  console.warn(
    `Sitemap: skipped ${
      dynamicRoutes.length
    } dynamic route(s), add them manually if they should be indexed: ${dynamicRoutes.join(
      ", "
    )}`
  );
}
