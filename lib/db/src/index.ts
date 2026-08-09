import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { drizzle } from "drizzle-orm/node-postgres";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";
import * as schema from "./schema";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function findWorkspaceRoot(startDir: string): string {
  let current = startDir;
  while (current && current !== path.parse(current).root) {
    if (fs.existsSync(path.join(current, "pnpm-workspace.yaml"))) {
      return current;
    }
    current = path.dirname(current);
  }
  return startDir;
}

const { Pool } = pg;

export let pool: any = null;
export let db: any = null;

const databaseUrl = process.env.DATABASE_URL;

if (databaseUrl && !databaseUrl.startsWith("pglite://")) {
  pool = new Pool({ connectionString: databaseUrl });
  db = drizzle(pool, { schema });
} else {
  const rootDir = findWorkspaceRoot(process.cwd());
  const dataDir = process.env.DATABASE_PATH
    ? path.resolve(process.env.DATABASE_PATH)
    : path.join(rootDir, ".data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const pgliteInstance = new PGlite(path.join(dataDir, "pgdata"));
  let initPromise: Promise<any> | null = pgliteInstance.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      default_framework TEXT,
      slack_webhook_url TEXT,
      discord_webhook_url TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      key_hash TEXT NOT NULL,
      prefix TEXT NOT NULL,
      note TEXT,
      project_id INTEGER,
      is_active BOOLEAN DEFAULT TRUE NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      last_used_at TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS analyses (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      input_type TEXT NOT NULL,
      raw_input TEXT NOT NULL,
      github_url TEXT,
      code_context TEXT,
      tags TEXT,
      auto_tags TEXT,
      project_id INTEGER,
      status TEXT DEFAULT 'pending' NOT NULL,
      confidence_score REAL,
      confidence_breakdown TEXT,
      severity TEXT,
      severity_reason TEXT,
      audit_trail TEXT,
      correlations TEXT,
      extracted_entities TEXT,
      hypotheses TEXT,
      reproduction_steps TEXT,
      test_code TEXT,
      flow_diagram TEXT,
      clarifying_questions TEXT,
      test_syntax_status TEXT,
      fix_suggestions TEXT,
      resolution_status TEXT DEFAULT 'open' NOT NULL,
      resolved_by TEXT,
      resolved_at TIMESTAMP,
      fix_description TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS collaboration_annotations (
      id SERIAL PRIMARY KEY,
      analysis_id INTEGER NOT NULL,
      author_name TEXT NOT NULL,
      type TEXT NOT NULL,
      step_ref TEXT,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );
  `).then(() => { initPromise = null; }).catch(err => { console.error("PGlite init table error:", err); initPromise = null; });

  pool = {
    connect: async () => pool,
    release: () => {},
    query: async (queryText: any, values?: any[]) => {
      if (initPromise) {
        await initPromise;
      }
      let text = typeof queryText === "string" ? queryText : queryText.text;
      let params = typeof queryText === "string" ? values : (queryText.values ?? values);
      let options: any = {};
      if (typeof queryText === "object" && queryText.rowMode) {
        options.rowMode = queryText.rowMode;
      }
      const res = await pgliteInstance.query(text, Array.isArray(params) ? params : [], options);
      return {
        rows: res.rows,
        fields: res.fields,
        rowCount: res.rows.length,
        command: "",
      };
    },
    end: async () => {
      if (initPromise) await initPromise;
      await pgliteInstance.close();
    },
  };

  db = drizzle(pool, { schema });
}

export * from "./schema";


