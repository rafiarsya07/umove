import postgres from "postgres";
import { config } from "./config.js";

/**
 * The database connection pool. The app connects as `umove_app`, a role
 * that can read and write rows but cannot create, alter or drop anything
 * (see db/init/02-app-role.sh).
 *
 * Every query is parameterised by the `sql` tagged template, so user input
 * is never concatenated into SQL.
 */
export const sql = postgres(config.databaseUrl, {
  max: 10,
  idle_timeout: 30,
  connect_timeout: 10,
  // A runaway query is cancelled by the server after 5 seconds.
  connection: { statement_timeout: 5000, application_name: "umove-app" },
  onnotice: () => {},
});

export async function dbHealthy(): Promise<boolean> {
  try {
    await sql`select 1`;
    return true;
  } catch {
    return false;
  }
}
