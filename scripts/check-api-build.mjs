import ts from "typescript";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import process from "node:process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = mkdtempSync(join(tmpdir(), "h2otype-api-build-"));
try {
  const config = ts.readConfigFile(
    join(root, "tsconfig.json"),
    ts.sys.readFile,
  );
  if (config.error)
    throw new Error(
      ts.flattenDiagnosticMessageText(config.error.messageText, "\n"),
    );
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
  // Emit the server dependency graph exactly as JavaScript. Do not copy source
  // TypeScript into this isolated directory: that would hide deployment errors.
  const program = ts.createProgram(
    [join(root, "api/daily.ts"), join(root, "functions/api/daily.ts")],
    {
      ...parsed.options,
      noEmit: false,
      noEmitOnError: true,
      allowImportingTsExtensions: false,
      rootDir: root,
      outDir: output,
      incremental: false,
      tsBuildInfoFile: undefined,
    },
  );
  const diagnostics = ts.getPreEmitDiagnostics(program);
  if (diagnostics.length)
    throw new Error(
      ts.formatDiagnosticsWithColorAndContext(diagnostics, {
        getCurrentDirectory: () => root,
        getCanonicalFileName: (file) => file,
        getNewLine: () => "\n",
      }),
    );
  assert.equal(program.emit().emitSkipped, false);
  writeFileSync(
    join(output, "package.json"),
    JSON.stringify({ type: "module" }),
  );
  assert.ok(
    !readFileSync(join(output, "api/daily.js"), "utf8").includes("dailyApi.ts"),
  );
  const result = execFileSync(
    process.execPath,
    [join(root, "scripts/smoke-api-artifact.mjs"), output],
    {
      cwd: output,
      encoding: "utf8",
      timeout: 15000,
    },
  );
  process.stdout.write(result);
} finally {
  // Only remove the throwaway directory created by this check.
  rmSync(output, { recursive: true, force: true });
}
