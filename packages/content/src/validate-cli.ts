/**
 * CLI entry: validate every shipped case. Exits non-zero on failure so it can
 * gate CI/build (CONTENT_SYSTEM.md "Build must fail when …").
 */
import { CASES } from "./index";
import { validateCase } from "./validate";

let failed = false;
for (const gameCase of Object.values(CASES)) {
  const result = validateCase(gameCase);
  if (result.ok) {
    console.log(`✓ ${gameCase.id} valid`);
  } else {
    failed = true;
    console.error(`✗ ${gameCase.id} INVALID`);
    for (const err of result.errors) console.error(`  - ${err}`);
  }
}

if (failed) {
  console.error("\nContent validation failed.");
  process.exit(1);
}
console.log("\nAll cases valid.");
