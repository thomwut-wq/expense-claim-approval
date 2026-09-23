import { readFileSync } from "fs";
import { makeClient } from "./db.mjs";
const c = makeClient(); await c.connect();
await c.query(readFileSync(new URL("../supabase/schema.sql", import.meta.url), "utf8"));
console.log("schema applied"); await c.end();
