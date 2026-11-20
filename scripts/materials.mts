/**
 * Adds estimated materials and priority-help traffic (labelled DEMO actors, real ledger) to the database in DATABASE_URL.
 * Usage: npx tsx --conditions=react-server scripts/materials.mts
 */
import { simulateMaterialsAndHelp } from "../lib/server/simulate";
console.log(await simulateMaterialsAndHelp());
process.exit(0);
