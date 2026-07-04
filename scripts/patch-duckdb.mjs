// Patch duckdb to work with Turbopack:
// 1. Add napi_versions to binary config (Turbopack's node-pre-gyp parser requires it)
// 2. Bypass node-pre-gyp runtime resolution (load .node binding directly)
import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const duckdbPkgPath = join(__dirname, "..", "node_modules", "duckdb", "package.json");
const bindingPath = join(__dirname, "..", "node_modules", "duckdb", "lib", "duckdb-binding.js");

// Patch package.json: add napi_versions to binary config
if (existsSync(duckdbPkgPath)) {
  const pkg = JSON.parse(readFileSync(duckdbPkgPath, "utf8"));
  if (pkg.binary && !pkg.binary.napi_versions) {
    pkg.binary.napi_versions = [3];
    writeFileSync(duckdbPkgPath, JSON.stringify(pkg, null, 2) + "\n");
    console.log("[patch-duckdb] Added napi_versions to binary config");
  }
}

// Patch duckdb-binding.js: bypass node-pre-gyp, load .node directly
if (existsSync(bindingPath)) {
  const directLoader = `var path = require('path');
var binding = require(path.join(__dirname, 'binding', 'duckdb.node'));
module.exports = exports = binding;
`;
  const current = readFileSync(bindingPath, "utf8");
  if (!current.includes("binding/duckdb.node")) {
    writeFileSync(bindingPath, directLoader);
    console.log("[patch-duckdb] Patched duckdb-binding.js to load .node directly");
  }
}
