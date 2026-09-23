import pg from "pg";
export function makeClient() {
  const raw = process.env.SUPABASE_DB_URL;
  if (!raw) throw new Error("SUPABASE_DB_URL not set");
  const m = raw.match(/^postgres(?:ql)?:\/\/(.*)@([^@\/:]+)(?::(\d+))?\/([^?]+)/);
  const [, cred, host, port, database] = m;
  const i = cred.indexOf(":");
  return new pg.Client({
    user: decodeURIComponent(cred.slice(0, i)),
    password: decodeURIComponent(cred.slice(i + 1)),
    host, port: Number(port || 5432), database,
    ssl: { rejectUnauthorized: false },
  });
}
