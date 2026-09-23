import { makeClient } from "./db.mjs";
const c = makeClient(); await c.connect();
const r = await c.query(process.argv[2]); console.log(JSON.stringify(r.rows, null, 1)); await c.end();
