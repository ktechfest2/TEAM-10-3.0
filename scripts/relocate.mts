/**
 * Adds the estimated polling-unit moves (labelled DEMO collation officer, `estimated: true`) to the database in
 * DATABASE_URL, through the real ledger. Usage: npx tsx --conditions=react-server scripts/relocate.mts
 */
import { simulateRelocations } from "../lib/server/simulate";
console.log(await simulateRelocations());
process.exit(0);
