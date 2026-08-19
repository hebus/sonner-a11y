#!/usr/bin/env node
// Packs the library, installs the tarball into a throwaway project and consumes it the way a real
// user would: importing it at runtime, and type-checking a caller under both module resolutions.
// This is the check that would have caught `toast.success` missing from the emitted declarations.
import { execSync } from "node:child_process";
import { mkdtempSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const repo = resolve(import.meta.dirname, "..");
const work = mkdtempSync(join(tmpdir(), "sonner-a11y-verify-"));
const run = (command, cwd) => execSync(command, { cwd, stdio: "pipe" }).toString();

let label = "";
const step = (name) => {
  label = name;
  process.stdout.write(`  ${name}... `);
};
const ok = () => process.stdout.write("ok\n");

// Touches every documented method, so a declaration file that hides one — a `declare namespace`
// whose members stop being exported, say — fails here instead of in a consumer's repository.
const CONSUMER = `import toast from "sonner-a11y";
const id: string | number = toast("hi");
toast.message("a");
toast.success("b", { duration: 10 });
toast.error("c", { important: false });
toast.info("d");
toast.warning("e");
toast.loading("f");
toast.dismiss(id);
toast.config({ theme: "dark", a11y: { labels: { close: "x" } } });
toast.resetConfig();
void toast.promise(Promise.resolve(1), { loading: "l", success: "s" });
`;

const RUNTIME_PROBE = `import toast from "sonner-a11y";
const members = ["message", "success", "error", "info", "warning", "loading", "dismiss", "promise", "config", "resetConfig"];
if (typeof toast !== "function") throw new Error("the default export is not callable");
const missing = members.filter(member => typeof toast[member] !== "function");
if (missing.length) throw new Error("missing at runtime: " + missing.join(", "));
`;

try {
  step("pack");
  run(`npm pack --pack-destination "${work}"`, repo);
  const tarball = readdirSync(work).find((file) => file.endsWith(".tgz"));
  renameSync(join(work, tarball), join(work, "pkg.tgz"));
  ok();

  step("install the tarball");
  writeFileSync(
    join(work, "package.json"),
    JSON.stringify(
      {
        name: "verify",
        private: true,
        type: "module",
        dependencies: { "sonner-a11y": "file:./pkg.tgz", typescript: "^7" },
      },
      null,
      2,
    ),
  );
  run("npm install --no-audit --no-fund --silent", work);
  ok();

  step("import at runtime");
  writeFileSync(join(work, "probe.mjs"), RUNTIME_PROBE);
  run("node probe.mjs", work);
  ok();

  writeFileSync(join(work, "consumer.ts"), CONSUMER);
  for (const moduleResolution of ["bundler", "nodenext"]) {
    step(`type-check a caller (moduleResolution: ${moduleResolution})`);
    writeFileSync(
      join(work, "tsconfig.json"),
      JSON.stringify(
        {
          compilerOptions: {
            module: moduleResolution === "nodenext" ? "nodenext" : "esnext",
            moduleResolution,
            target: "esnext",
            lib: ["esnext", "dom"],
            strict: true,
            noEmit: true,
            types: [],
          },
          files: ["consumer.ts"],
        },
        null,
        2,
      ),
    );
    run("npx tsc -p tsconfig.json", work);
    ok();
  }

  console.log("\nthe published tarball installs, imports and type-checks");
} catch (error) {
  process.stdout.write("FAILED\n\n");
  console.error(`step: ${label}\n`);
  console.error(error.stdout?.toString() || error.message);
  process.exitCode = 1;
} finally {
  rmSync(work, { recursive: true, force: true });
}
