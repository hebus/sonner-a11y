// Tags the version Changesets has already written to package.json, and pushes it.
// Pushing the tag is what publishes: .github/workflows/publish.yml runs on `v*` and
// publishes to npm with OIDC provenance. This script therefore never runs `npm publish`
// itself, and it deliberately stays a manual step so the release moment is a decision.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const run = cmd => execSync(cmd, { stdio: 'inherit' });
const capture = cmd => execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();

const fail = message => {
    console.error(`\n  ✗ ${message}\n`);
    process.exit(1);
};

const { name, version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const tag = `v${version}`;

console.log(`\n  ${name}@${version}\n`);

// a tag must describe a committed state, not a dirty working tree
if (capture('git status --porcelain')) fail('Uncommitted changes. Commit or stash them before tagging.');

const branch = capture('git rev-parse --abbrev-ref HEAD');
if (branch !== 'main') fail(`On branch "${branch}". Releases are tagged from main.`);

run('git fetch --tags --quiet origin');

let tagged = false;
try {
    capture(`git rev-parse -q --verify refs/tags/${tag}`);
    tagged = true;
} catch {
    // no such tag, which is what we want
}
if (tagged) fail(`${tag} already exists. Run "pnpm changeset version" to bump the version first.`);

// refuse to tag a commit that main does not have yet
const local = capture('git rev-parse HEAD');
const remote = capture('git rev-parse origin/main');
if (local !== remote) fail('main is not in sync with origin/main. Pull or push first.');

run(`git tag -a ${tag} -m "${name}@${version}"`);
run(`git push origin ${tag}`);

console.log(`\n  ✓ ${tag} pushed — Publish to NPM will pick it up.\n`);
