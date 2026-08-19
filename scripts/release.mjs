// Publishes from a real machine, then tags. Modelled on the same flow used for hebus/docs-overlay
// and @sinequa/atomic: CI never publishes, so the tarball that reaches npmjs is the one that was
// verified locally, and no long-lived npm token has to live in CI.
//
//   pnpm release             publish + tag
//   pnpm release --dry-run   run every check, publish nothing
//   pnpm release --yes       skip the confirmation prompt
//
// This script never bumps anything: Changesets owns the version.
import { execSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { createInterface } from "node:readline/promises";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const assumeYes = args.includes("--yes");

const run = (cmd) => execSync(cmd, { stdio: "inherit" });
const capture = (cmd) =>
  execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] })
    .toString()
    .trim();

const info = (message) => console.log(`  ${message}`);
const warn = (message) => console.log(`  ! ${message}`);
const fail = (message) => {
  console.error(`\n  x ${message}\n`);
  process.exit(1);
};

const root = new URL("..", import.meta.url);
const pkg = JSON.parse(readFileSync(new URL("package.json", root), "utf8"));
const { name, version, files = [] } = pkg;
const tag = `${name}@${version}`;

console.log(`\n  ${name}@${version}${dryRun ? "  (dry run)" : ""}\n`);

// --- the tree must describe exactly what gets published -------------------------------------------

if (capture("git status --porcelain")) fail("Uncommitted changes. Commit or stash them first.");

const branch = capture("git rev-parse --abbrev-ref HEAD");
if (branch !== "main") fail(`On branch "${branch}". Releases are published from main.`);

run("git fetch --tags --quiet origin");
if (capture("git rev-parse HEAD") !== capture("git rev-parse origin/main")) {
  fail("main is not in sync with origin/main. Pull or push first.");
}

// --- already on npm? then this is a no-op, not an error ------------------------------------------

let published = [];
try {
  const raw = capture(`npm view ${name} versions --json --registry https://registry.npmjs.org/`);
  const parsed = JSON.parse(raw);
  // npm returns a bare string when a single version exists, an array otherwise
  published = Array.isArray(parsed) ? parsed : [parsed];
} catch {
  info(`${name} is not on npm yet — this would be the first release.`);
}

if (published.includes(version)) {
  warn(`${name}@${version} is already published — nothing to do.`);
  warn('Run "pnpm changeset version" to prepare the next release.');
  process.exit(0);
}

// --- the published files must match the commit that set this version ------------------------------

// What matters is that the *code* is unchanged. Anything else is fine to have moved since: docs,
// workflows, the demo site. package.json is deliberately absent: here the published manifest is also
// the one carrying scripts and devDependencies, so adding a script would otherwise read as a source
// change even though nothing a consumer receives has moved.
const SOURCE_PATHS = ["src", "rollup.config.mjs", "tsconfig.json"];
let versionCommit = "";
try {
  versionCommit = capture(
    `git log -1 --format=%H -S"\\"version\\": \\"${version}\\"" -- package.json`,
  );
} catch {
  // no match; treated as unknown below
}

if (!versionCommit) {
  warn(`Could not find the commit that set version ${version} — skipping the source-drift check.`);
} else {
  const drifted = capture(
    `git diff --name-only ${versionCommit}..HEAD -- ${SOURCE_PATHS.join(" ")}`,
  );
  if (drifted) {
    console.error("\n  Sources changed after the version was set:\n");
    drifted.split("\n").forEach((f) => console.error(`    ${f}`));
    fail(
      `npm, the changelog and git would describe different trees. Add a changeset and let Changesets bump the version.`,
    );
  }
  info(`Version ${version} was set in ${versionCommit.slice(0, 7)}, sources unchanged since.`);
}

// --- build, then check the tarball is not hollow --------------------------------------------------

info("Building...");
run("pnpm build");

for (const entry of files) {
  const path = new URL(entry, root);
  if (!existsSync(path))
    fail(`"${entry}" is declared in files but does not exist. The tarball would be missing it.`);
  const stats = statSync(path);
  if (stats.isFile() && stats.size === 0) fail(`"${entry}" is empty.`);
}

// npm pack is the authority on what actually ships
const packed = JSON.parse(capture("npm pack --dry-run --json"));
const { files: packedFiles = [], unpackedSize = 0 } = packed[0] ?? {};
if (packedFiles.length === 0 || unpackedSize === 0) fail("npm pack produced an empty tarball.");
info(`Tarball: ${packedFiles.length} files, ${(unpackedSize / 1024).toFixed(1)} kB unpacked.`);

// --- confirm, publish, tag -----------------------------------------------------------------------

if (dryRun) {
  console.log(`\n  Dry run: would publish ${tag} and push the tag.\n`);
  process.exit(0);
}

if (!assumeYes) {
  if (!process.stdin.isTTY) fail("Not a terminal. Re-run with --yes if this is intentional.");
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question(`\n  Publish ${tag} to npmjs and push the tag? [y/N] `))
    .trim()
    .toLowerCase();
  rl.close();
  if (answer !== "y" && answer !== "yes") fail("Aborted.");
}

run("npm publish --access public --registry https://registry.npmjs.org/");
info(`${tag} published.`);

// tag only once the publish succeeded, so a failed publish leaves no misleading tag behind
let tagged = false;
try {
  capture(`git rev-parse -q --verify refs/tags/${tag}`);
  tagged = true;
} catch {
  // no such tag, as expected
}

if (tagged) {
  warn(`Tag ${tag} already exists — skipping.`);
} else {
  run(`git tag -a ${tag} -m "${tag}"`);
  run(`git push origin ${tag}`);
  info(`Tag ${tag} pushed.`);
}

console.log("");
