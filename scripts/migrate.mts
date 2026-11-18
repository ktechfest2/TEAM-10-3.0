import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

// Schema changes use the direct (unpooled) connection when the host provides one, as Neon does on Vercel.
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const client = postgres(url, { max: 1, prepare: !url.includes("-pooler") });
await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
await client.end();
console.log("Migrations applied");
