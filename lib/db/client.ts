import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

const globalForDb = globalThis as unknown as { tallySql?: ReturnType<typeof postgres> };
export const sqlClient = globalForDb.tallySql ?? postgres(url, {
    max: 5,
    // Transaction-mode poolers (e.g. Neon "-pooler" hosts) cannot keep prepared statements.
    prepare: !url.includes("-pooler"),
  });
if (process.env.NODE_ENV !== "production") globalForDb.tallySql = sqlClient;

export const db = drizzle(sqlClient, { schema });
export { schema };
