// Run with: npm run square:check   (reads .env.local)
// Confirms the Square token and location work and shows which site services match Square services.
import { squareConfigured, squareStatus } from "../lib/square";

async function main() {
  if (!squareConfigured()) {
    console.error("Set SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID in .env.local first.");
    process.exit(1);
  }
  const s = await squareStatus();
  console.log(`Environment: ${s.environment}`);
  console.log(`Location: ${s.location.name ?? "(no name)"} [${s.location.id}] status ${s.location.status ?? "unknown"}`);
  console.log(`\nMatched ${s.mapped.length} service(s):`);
  for (const m of s.mapped) console.log(`  ok   ${m.name} -> ${m.id} (${m.durationMin} min)`);
  if (s.unmatched.length) {
    console.log(`\nNOT found in Square (no bookable service with this exact name):`);
    for (const n of s.unmatched) console.log(`  MISSING  ${n}`);
    process.exitCode = 2;
  }
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
