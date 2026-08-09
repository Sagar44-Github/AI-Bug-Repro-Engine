# 📜 Comprehensive Prompt Engineering Suite (`prompts.md`)

This document contains the complete, 50-step prompt suite used to architect, engineer, debug, test, and verify the **AI-Powered Multi-Agent Bug Reproduction Engine**. Includes all debugging sessions, error resolution prompts, and iterative testing cycles encountered during the vibe-coding process.

---

### Prompt 1: Monorepo Architecture & Package Layout Design
> "Act as a Principal Software Architect. I want to build an enterprise-grade AI-Powered Multi-Agent Bug Reproduction Engine from scratch.
> 
> Set up a monorepo workspace using PNPM (`pnpm-workspace.yaml`) with the following strict workspace package structure:
> 1. `artifacts/bug-engine`: React 18, Vite, TypeScript, Tailwind CSS frontend client web application.
> 2. `artifacts/api-server`: Express TypeScript API backend server handling LLM requests, streaming, and REST endpoints.
> 3. `lib/db`: Drizzle ORM database package integrated with `@electric-sql/pglite` (WASM Embedded PostgreSQL) so the app runs zero-config locally without external PostgreSQL server setup.
> 4. `lib/api-zod`: Shared Zod validation contract package used by both frontend and backend for strict payload type checking.
> 5. `scripts`: CLI workspace package containing automated database seeders, CSV dataset importers, and deployment verification tools.
> 
> Configuration Requirements:
> - Root `package.json` with PNPM workspace scripts (`pnpm dev`, `pnpm build`, `pnpm seed`, `pnpm verify`).
> - Shared `tsconfig.base.json` enforcing strict TypeScript type checking (`strict: true`, `noImplicitAny: true`).
> - Embedded WASM database connection storing data files locally under `.data/pgdata`.
> - Configure Vite proxy in `@workspace/bug-engine` so frontend requests to `/api/*` on port 5000 automatically route to the Express API server running on port 8080.
> 
> Output the configuration files and directory structure, then verify workspace package linking."

---

### Prompt 2: Embedded WASM PostgreSQL Engine & Drizzle Schema Architecture
> "Act as a Lead Database Architect. Design and implement the persistence layer in `lib/db`.
> 
> Specifications:
> 1. Database Engine: `@electric-sql/pglite` WASM embedded PostgreSQL instance persisting data to directory `.data/pgdata`.
> 2. ORM: Drizzle ORM (`drizzle-orm/node-postgres` adapter).
> 3. Table Schema `analysesTable` in `lib/db/src/schema/analyses.ts`:
>    - `id`: serial primary key (`id`).
>    - `title`: text, non-null (bug summary title).
>    - `inputType`: text, non-null (`raw_text` | `stack_trace` | `github_url`).
>    - `rawInput`: text, non-null (unstructured user text, stack trace, or issue description).
>    - `githubUrl`: text, nullable (optional source repository link).
>    - `codeContext`: text, nullable (optional code snippet attached by user).
>    - `status`: text, non-null (`pending` | `running` | `completed` | `failed`).
>    - `confidenceScore`: real, nullable (0.0 to 1.0 score).
>    - `extractedEntities`: text / json string (parsed component, trigger, error, and environment signals).
>    - `hypotheses`: text / json string (array of ranked root-cause theories with mechanisms and evidence).
>    - `reproductionSteps`: text / json string (step-by-step instructions, prerequisites, and expected vs actual outcomes).
>    - `testCode`: text, nullable (executable TypeScript Jest / React Testing Library unit test code).
>    - `flowDiagram`: text, nullable (valid Mermaid.js `flowchart TD` graph definition).
>    - `clarifyingQuestions`: text / json string (array of follow-up questions for ambiguous reports).
>    - `tags` / `autoTags`: text / json string (taxonomy tags for filtering).
>    - `confidenceBreakdown`: text / json string (itemized point breakdown awarded by scoring rubric).
>    - `severity`: text, nullable (`critical` | `high` | `medium` | `low`).
>    - `severityReason`: text, nullable (justification string).
>    - `auditTrail`: text / json string (timestamped execution log of each agent run).
>    - `fixSuggestions`: text / json string (ranked remediation recommendations with target file paths).
>    - `createdAt`, `updatedAt`: timestamp with default `now()`.
> 
> 4. Connection Pool & Initialization:
>    - Create `lib/db/src/index.ts` exporting `db` and `pool`.
>    - Implement an asynchronous initialization queue (`initPromise`) that executes `CREATE TABLE IF NOT EXISTS analyses (...)` automatically on first query without using top-level await (to avoid CJS bundler output crashes).
> 
> Write the implementation and test database creation."

---

### Prompt 2.1: 🐛 DEBUG — PGlite WASM Initialization Crash on Windows
> "The server crashes immediately on startup with this error:
> ```
> Error: ENOENT: no such file or directory, open '.data/pgdata/PG_VERSION'
> TypeError: Cannot read properties of undefined (reading 'query')
> ```
> The PGlite WASM instance is failing to initialize because the `.data/pgdata` directory doesn't exist on first run.
> 
> Fix this by:
> 1. Ensuring the data directory `.data/pgdata` is created automatically if it doesn't exist before PGlite initialization.
> 2. Wrapping the PGlite constructor in a try-catch so if the WASM binary fails to load, we get a clear error message instead of an undefined reference crash.
> 3. Adding a startup log message confirming successful database initialization: `[PGlite] Embedded PostgreSQL initialized at .data/pgdata`.
> 
> Also verify that the `CREATE TABLE IF NOT EXISTS` migration runs successfully after the fix."

---

### Prompt 2.2: 🧪 TEST — Verify Database Schema & Table Creation
> "Run a quick verification test to confirm the database schema is correctly created:
> 1. Start the API server and check the startup logs for the `[PGlite] Embedded PostgreSQL initialized` message.
> 2. Execute a raw SQL query `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'analyses' ORDER BY ordinal_position;` to verify all 22 columns exist.
> 3. Insert a test record via `INSERT INTO analyses (title, input_type, raw_input, status) VALUES ('Test Bug', 'raw_text', 'Test input', 'pending');` and verify it returns `id = 1`.
> 4. Query it back with `SELECT * FROM analyses WHERE id = 1;` and confirm all fields are populated.
> 5. Clean up with `DELETE FROM analyses WHERE id = 1;`.
> 
> Print the test results to the console."

---

### Prompt 3: Shared Zod Contracts & Type Definitions (`@workspace/api-zod`)
> "Act as a Principal API Engineer. Build the `@workspace/api-zod` package in `lib/api-zod/src/index.ts` defining strict request/response validation schemas for the application.
> 
> Schemas to export:
> 1. `CreateAnalysisBody`:
>    - `title`: string, minimum 1 character.
>    - `inputType`: enum (`raw_text`, `stack_trace`, `github_url`).
>    - `rawInput`: string (required for `raw_text` and `stack_trace`).
>    - `githubUrl`: string (url format, required if `inputType === 'github_url'`).
>    - `codeContext`: optional string.
>    - `tags`: optional string.
> 
> 2. `GetAnalysisParams`:
>    - `id`: coerced integer, positive.
> 
> 3. `LLMConfigSchema`:
>    - `provider`: enum (`groq`, `openai`, `ollama`, `custom`).
>    - `apiKey`: string.
>    - `baseURL`: string.
>    - `model`: string.
>    - `useEnvConfig`: boolean.
> 
> 4. `HealthCheckResponse`:
>    - `status`: literal (`ok`).
> 
> Export both Zod schemas and infer TypeScript types (`z.infer<typeof ...>`) for clean front-to-back type safety."

---

### Prompt 4: Provider-Agnostic LLM Engine & `.env` Persistence (`llmConfig.ts`)
> "Act as a Senior AI Infrastructure Engineer. Implement the core LLM configuration manager in `artifacts/api-server/src/lib/llmConfig.ts`.
> 
> Functional Requirements:
> 1. Provider Presets:
>    - `groq`: `https://api.groq.com/openai/v1`, default model `llama-3.3-70b-versatile`.
>    - `openai`: `https://api.openai.com/v1`, default model `gpt-4o-mini`.
>    - `ollama`: `http://localhost:11434/v1`, default model `llama3.2`.
>    - `custom`: customizable endpoint URL and model name.
> 
> 2. Configuration Cascade:
>    - Check for local file `.llm-config.json` in the root workspace.
>    - Fall back to `.env` file variables (`GROQ_API_KEY`, `LLM_PROVIDER`, `GROQ_MODEL`).
>    - Ensure `.env` is parsed automatically using `dotenv` or direct file reading.
> 
> 3. Client Singleton & Connection Testing:
>    - Implement `getLLMClient()` returning an initialized `OpenAI` SDK client configured with the active provider's `baseURL` and `apiKey`.
>    - Implement `getLLMConfigPublic()` returning public settings with masked API key (`gsk_...y2TQ`) for UI security.
>    - Implement `testLLMConnection()` executing a minimal completion ping (`"ping"`) against the active provider model, calculating latency in milliseconds (`latencyMs`), and returning `{ ok: true, latencyMs, model }` or `{ ok: false, error }`.
> 
> Write the complete typescript file and test initialization."

---

### Prompt 4.1: 🐛 DEBUG — `.env` File Not Being Loaded, API Key Shows `undefined`
> "I configured my Groq API key in the `.env` file but when I hit `GET /api/settings/llm`, the response shows:
> ```json
> { "provider": undefined, "model": undefined, "apiKeySet": false }
> ```
> The `.env` file exists at the root but the values aren't being loaded.
> 
> Debug this by:
> 1. Checking if `dotenv` is installed and `dotenv.config()` is being called before `llmConfig.ts` reads `process.env`.
> 2. Verifying the `.env` file path resolution — is it looking in the API server directory or the monorepo root? The `.env` file is in the monorepo root, not in `artifacts/api-server/`.
> 3. If using `dotenv`, ensure the path is set to `path.resolve(process.cwd(), '.env')` so it resolves from wherever the server process is started from.
> 4. Add debug logging: `console.log('[LLM Config] Loaded provider:', process.env.LLM_PROVIDER, 'Key present:', !!process.env.GROQ_API_KEY);`
> 
> After fixing, re-test `GET /api/settings/llm` and verify it shows `provider: 'groq'` and `apiKeySet: true`."

---

### Prompt 4.2: 🧪 TEST — Verify Groq API Key Connection & Latency
> "Now that the `.env` is loading, run an end-to-end connection test:
> 1. Hit `POST /api/settings/llm/test` and confirm it returns `{ ok: true, latencyMs: <number>, model: 'llama-3.3-70b-versatile' }`.
> 2. If latency is above 5000ms, check if there's a network proxy or firewall blocking `api.groq.com`.
> 3. If it returns `{ ok: false, error: '401 Unauthorized' }`, the API key is invalid — double check the key string in `.env` for accidental whitespace or newline characters.
> 4. Log the successful test output to console."

---

### Prompt 5: Agent 1 — Entity Extraction Agent (`entityExtractor.ts`)
> "Act as an AI Systems Pipeline Developer. Implement Agent 1 (Entity Extractor) in `artifacts/api-server/src/lib/agents/entityExtractor.ts`.
> 
> Objective:
> Parse unstructured bug reports, raw user text, stack traces, or GitHub issues into structured technical JSON.
> 
> Output Schema (`ExtractedEntities`):
> - `component`: Primary affected software component, component file path, or architectural module.
> - `triggerAction`: User action, API invocation, or event sequence triggering the bug.
> - `expectedBehavior`: Stated or inferred correct system behavior.
> - `actualBehavior`: Observed failure symptom, crash behavior, or unexpected state.
> - `environment`: Object containing `os`, `browser`, `runtime`, `version`, and `other`.
> - `errorMessages`: Array of extracted error message strings, exception names, or stack frame lines.
> - `frequency`: Enum (`always` | `intermittent` | `rare` | `unknown`).
> - `additionalContext`: Any supplementary notes or reproduction hints.
> 
> Implementation Directives:
> - Construct a prompt for Groq AI (`llama-3.3-70b-versatile`) demanding raw JSON output without conversational markdown wrappers.
> - Parse the LLM output with `JSON.parse` and fallback defaults if optional fields are omitted.
> - Return duration in milliseconds (`durationMs`) and log audit trail steps."

---

### Prompt 5.1: 🐛 DEBUG — LLM Returns Markdown-Wrapped JSON Instead of Raw JSON
> "Agent 1 (Entity Extractor) is failing with a `JSON.parse` error:
> ```
> SyntaxError: Unexpected token '`' at position 0
> ```
> The problem is that the LLM is wrapping its JSON response in markdown code fences like:
> ```
> ```json
> { "component": "...", ... }
> ```
> ```
> Instead of returning raw JSON directly.
> 
> Fix this by:
> 1. Adding a post-processing step that strips markdown code fence wrappers (` ```json ... ``` `) from the LLM output before `JSON.parse`.
> 2. Use a regex like `/^```(?:json)?\n?([\s\S]*?)\n?```$/` to extract the inner JSON content.
> 3. Also handle the case where the LLM prefixes its response with conversational text like `"Here is the extracted JSON:"` — strip everything before the first `{` character.
> 4. Add a fallback: if `JSON.parse` still fails after stripping, log the raw LLM output for debugging and return a default empty entities object instead of crashing the entire pipeline."

---

### Prompt 6: Agent 2 — Deterministic Confidence Scorer (`confidenceScorer.ts`)
> "Act as a Quality Assurance & Scoring Algorithm Engineer. Implement Agent 2 (Confidence Scorer) in `artifacts/api-server/src/lib/agents/confidenceScorer.ts`.
> 
> Requirement:
> Do NOT rely on LLM hallucination for feasibility scoring. Instead, compute an objective, deterministic 0–100 confidence score based strictly on verifiable input signals present in the raw input and extracted entities.
> 
> Point Allocation Rubric (Total: 100 points):
> 1. Stack Trace / Error Trace Present: +25 points (Check for stack frame patterns, line numbers, exception trace signatures).
> 2. Reproduction Steps Provided: +25 points (Check for explicit step indicators, numbered sequences, or action verbs).
> 3. Error Message / Exception Code Identified: +20 points (Check for explicit error strings like TypeError, NullPointerException, HTTP status codes).
> 4. Environment Specs Specified: +15 points (Check for browser, OS, React/Node version references).
> 5. Failure Frequency Specified: +15 points (Check if frequency is 'always', 'intermittent', or 'rare').
> 6. Similar Historical Bug Match: Bonus points up to 100.
> 
> Output Schema:
> - `score`: Normalized score between 0.0 and 1.0 (e.g., 0.82 for 82%).
> - `confidenceBreakdown`: JSON object detailing awarded points per rubric criteria.
> - `missing`: Array of missing debugging signals (e.g. 'Environment specs missing').
> - `evidence`: Array of verifiable positive evidence quotes extracted from input.
> 
> Implement the function cleanly and write unit checks."

---

### Prompt 7: Agent 3 — Root-Cause Hypothesis Generator (`hypothesisGenerator.ts`)
> "Act as a Senior Systems Debugging Specialist. Implement Agent 3 (Root-Cause Hypothesis Generator) in `artifacts/api-server/src/lib/agents/hypothesisGenerator.ts`.
> 
> Instructions:
> 1. Take raw input and extracted entities from Agent 1.
> 2. Formulate 3–5 distinct root-cause hypotheses explaining *why* the bug manifests.
> 3. For each hypothesis, generate:
>    - `id`: Unique string (`h1`, `h2`, `h3`, etc.).
>    - `title`: Short descriptive title of the underlying issue.
>    - `mechanism`: In-depth technical explanation of the failure mechanism (e.g. stale state closure, unhandled null reference, race condition, non-atomic database read-modify-write).
>    - `likelihood`: Enum (`high` | `medium` | `low`).
>    - `confirmingEvidence`: Array of signals supporting this hypothesis.
>    - `refutingEvidence`: Array of signals contradicting this hypothesis.
>    - `status`: Enum (`retained` | `eliminated`).
>    - `statusReason`: Rationale explaining why the hypothesis was retained or eliminated.
> 
> Sort hypotheses by likelihood rating (`high` first) and return structured JSON."

---

### Prompt 8: Agent 4 — Step Validator & Prerequisites Engine (`stepValidator.ts`)
> "Act as a Senior Test Lead. Implement Agent 4 (Step Validator) in `artifacts/api-server/src/lib/agents/stepValidator.ts`.
> 
> Requirements:
> 1. Take the highest-likelihood retained hypothesis from Agent 3.
> 2. Synthesize clear, sequential reproduction steps designed to reproduce the failure deterministically.
> 3. Output Schema:
>    - `prerequisites`: Array of required environment setups, mock states, or user credentials.
>    - `steps`: Array of objects `{ number: number, action: string, expectedOutcome: string }`.
>    - `expectedResult`: Description of correct system behavior when bug is absent.
>    - `actualResult`: Description of failure manifestation when bug is present.
>    - `environmentConfig`: Required configuration flags or environment variable overrides.
>    - `validationNotes`: Instructions on how to rule out alternative hypotheses.
>    - `confidenceRating`: Integer rating (1–10) assessing reproduction reliability."

---

### Prompt 9: Agent 5 — Executable Test Writer (`testWriter.ts`)
> "Act as an Automated Testing Architect. Implement Agent 5 (Executable Test Writer) in `artifacts/api-server/src/lib/agents/testWriter.ts`.
> 
> Instructions:
> 1. Detect target testing framework context (Jest, React Testing Library, Vitest, Cypress).
> 2. Synthesize ready-to-execute, fully typed TypeScript test code.
> 3. The generated test file MUST contain three distinct test blocks:
>    - **Main Reproduction Case:** Assertion specifically designed to FAIL when the bug is present and PASS when the root cause is fixed.
>    - **Edge Case Coverage:** Test handling null/undefined inputs, empty states, or network timeouts.
>    - **Regression Guard:** Test verifying baseline non-buggy functionality remains intact.
> 4. Requirements:
>    - Include imports (`@testing-library/react`, `@testing-library/user-event`, `jest`).
>    - Provide clean mock objects and component declarations if source code is absent.
>    - Return code formatted inside fenced TypeScript markdown blocks."

---

### Prompt 9.1: 🐛 DEBUG — SSE Stream Terminates Prematurely After Agent 3
> "The AI pipeline SSE stream stops sending events after Agent 3 (Hypothesis Generator) completes. Agents 4, 5, and 6 never execute. The browser EventSource shows `readyState: 2 (CLOSED)` and the server logs show:
> ```
> Error: write after end
>     at ServerResponse.end (node:_http_outgoing:1024:13)
> ```
> 
> Debug this by:
> 1. Checking if `res.end()` is being called prematurely inside the Agent 3 completion handler instead of only after Agent 6.
> 2. Verify that the `try-catch` block wrapping the pipeline execution doesn't have an early `return` statement that short-circuits after the hypothesis step.
> 3. Ensure each agent's `await` call is properly chained — look for missing `await` keywords that could cause unhandled promise rejections silently killing the stream.
> 4. Add granular logging between each agent call: `logger.info({ agent: 'Agent 4' }, 'Starting step validator...')` to trace exactly where execution stops.
> 5. After fixing, test by submitting a new bug report and confirming all 6 `agent_complete` SSE events are received by the frontend."

---

### Prompt 9.2: 🧪 TEST — Full Pipeline End-to-End Smoke Test
> "Run a complete end-to-end smoke test of the 6-agent AI pipeline:
> 1. Create a new analysis via `POST /api/analyses` with body `{ title: 'Smoke Test: React useState stale closure', inputType: 'raw_text', rawInput: 'When I click the increment button, the counter stays at 0. I am using useState inside a callback...' }`.
> 2. Trigger the pipeline via `POST /api/analyses/:id/run` and collect all SSE events.
> 3. Verify the following SSE events are received in order:
>    - `agent_start` for Entity Extractor → `agent_complete` with extracted entities JSON
>    - `agent_start` for Confidence Scorer → `agent_complete` with score and breakdown
>    - `agent_start` for Hypothesis Generator → `agent_complete` with 3+ hypotheses
>    - `agent_start` for Step Validator → `agent_complete` with reproduction steps
>    - `agent_start` for Test Writer → `agent_complete` with TypeScript test code
>    - `agent_start` for Fix Suggester → `agent_complete` with fix suggestions and Mermaid flowchart
>    - `pipeline_complete` final event
> 4. Verify the database record is updated with `status: 'completed'` and all agent output fields are non-null.
> 5. Clean up the test record."

---

### Prompt 10: Agent 6 — Fix Suggester & Mermaid Diagram Generator (`fixSuggester.ts`)
> "Act as a Solutions Architect. Implement Agent 6 (Fix Suggester & Flow Diagrammer) in `artifacts/api-server/src/lib/agents/fixSuggester.ts`.
> 
> Functional Requirements:
> 1. **Fix Suggestions:**
>    - Generate 3–5 prioritized code remediation strategies.
>    - Include `rank` (1..N), `title`, `description`, `codeLocation` (e.g. `src/components/Counter.tsx:42`), `effort` (`low` | `medium` | `high`), and `confidence` (`high` | `medium` | `low`).
> 
> 2. **Mermaid Flowchart Generator:**
>    - Synthesize valid Mermaid.js graph markup (`flowchart TD`) visualizing:
>      - Start node (`▶ Start`)
>      - Execution step nodes (`Normal Execution`)
>      - Trigger action node
>      - Failure decision node (`💥 Failure Point` with `:::failure` CSS class)
>      - Error propagation node (`Error State`)
>      - Eliminated path node (`:::eliminated` CSS class)
>    - CRITICAL: Wrap all node text labels containing special characters, parentheses, or quotes in double quotes (`N1["Label (Details)"]`) to prevent client-side chart parsing crashes.
> 
> Return structured JSON containing both `fixSuggestions` array and `flowDiagram` string."

---

### Prompt 11: Real-Time SSE Stream Controller (`POST /api/analyses/:id/run`)
> "Act as a Senior Backend Stream Engineer. Implement the Server-Sent Events (SSE) analysis pipeline controller in `artifacts/api-server/src/routes/analyses.ts`.
> 
> Endpoint Specifications:
> - Route: `POST /api/analyses/:id/run`
> - Headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`.
> 
> Execution Workflow:
> 1. Set analysis status to `running` in database.
> 2. Execute Agent 1 (Entity Extractor) -> Push chunk `data: {"type":"agent_start","agent":"Entity Extraction Agent"}` -> Push chunk `data: {"type":"agent_complete","agent":"Entity Extraction Agent","data":...}`.
> 3. Execute Agent 2 (Confidence Scorer) -> Push chunk with updated score.
> 4. Execute Agent 3 (Hypothesis Generator) -> Push hypotheses payload.
> 5. Execute Agent 4 (Step Validator) -> Push reproduction steps payload.
> 6. Execute Agent 5 (Test Writer) -> Push test code payload.
> 7. Execute Agent 6 (Fix Suggester & Diagrammer) -> Push fix suggestions and Mermaid flowchart payload.
> 8. Update database record status to `completed`, set `confidenceScore`, write `auditTrail` JSON, and close connection with `data: {"type":"pipeline_complete"}`.
> 9. Handle errors gracefully: if any agent fails, update status to `failed` and stream error event before closing."

---

### Prompt 12: REST API Routes Controller (`analyses.ts`, `projects.ts`, `settings.ts`)
> "Act as a REST API Developer. Build all secondary backend routes in `artifacts/api-server/src/routes/`:
> 
> Routes to implement:
> 1. `GET /api/analyses`: Fetch all bug analyses sorted by `createdAt` descending.
> 2. `GET /api/analyses/:id`: Fetch single analysis record by ID. Return 404 if missing.
> 3. `POST /api/analyses`: Create new bug analysis record in status `pending`.
> 4. `DELETE /api/analyses/:id`: Delete analysis record. Return 204.
> 5. `GET /api/analyses/stats/summary`: Aggregate counts (total, completed, running, failed, pending) and average confidence score.
> 6. `GET /api/analyses/trends?days=30`: Group analyses by date (`DATE(created_at)`) for trend charts.
> 7. `GET /api/projects`: Return list of registered repository workspaces.
> 8. `GET /api/healthz`: Health check returning `{ status: "ok" }`.
> 
> Validate all inputs with Zod schemas from `@workspace/api-zod`."

---

### Prompt 13: Frontend Setup & Tailwind Slate Dark-Mode Theme
> "Act as a Lead UI/UX Designer. Set up the frontend web application in `artifacts/bug-engine`.
> 
> Specifications:
> - Framework: React 18, Vite, TypeScript, Tailwind CSS.
> - Icon Set: Lucide React (`lucide-react`).
> - UI Components: Radix UI primitives / Shadcn components (Dialog, Tabs, Accordion, Progress, Tooltip, Select).
> - Theme Tokens:
>   - Background: Dark slate (`#090d16` / `bg-slate-950`).
>   - Cards: Subtle glassmorphism (`bg-slate-900/60 border border-slate-800 backdrop-blur-md`).
>   - Accent Primary: Indigo/Emerald (`emerald-500` for high confidence, `amber-500` for medium, `rose-500` for critical/failed).
>   - Typography: Clean sans-serif font stack (Inter / System UI).
> 
> Configure `tailwind.config.js` and `src/index.css` with these tokens."

---

### Prompt 13.1: 🐛 DEBUG — Vite Dev Server Proxy Returns 504 Gateway Timeout
> "The frontend Vite dev server on port 5000 is returning `504 Gateway Timeout` for all `/api/*` requests. The backend API server IS running on port 8080 and responds correctly when I hit `http://localhost:8080/api/healthz` directly.
> 
> Debug this by:
> 1. Checking the Vite proxy configuration in `vite.config.ts` — is it targeting `http://127.0.0.1:8080` or `http://localhost:8080`? On some systems `localhost` resolves to IPv6 `::1` while Express binds to IPv4 `0.0.0.0`. Try switching to `http://127.0.0.1:8080` explicitly.
> 2. Verify the proxy `changeOrigin: true` option is set.
> 3. Check if there's a CORS middleware on the backend that's blocking proxied requests — since the proxy rewrites the origin, CORS shouldn't be needed but verify.
> 4. Add Vite proxy debug logging by setting environment variable `DEBUG=vite:proxy` before starting the dev server.
> 5. After fixing, verify `http://localhost:5000/api/healthz` returns `{ status: 'ok' }` through the proxy."

---

### Prompt 13.2: 🐛 DEBUG — Tailwind CSS Classes Not Being Applied, UI Shows Unstyled HTML
> "All the Tailwind utility classes are being ignored. The UI shows raw unstyled HTML with default browser fonts and white background instead of our dark slate theme. The browser dev tools show none of the `bg-slate-950`, `text-white`, or `border-slate-800` classes are generating any CSS rules.
> 
> Fix this by:
> 1. Checking `tailwind.config.js` — is the `content` array correctly pointing to `'./src/**/*.{js,ts,jsx,tsx}'`? If the glob pattern is wrong, Tailwind's JIT compiler won't scan any files and will generate an empty CSS bundle.
> 2. Verify that `@tailwind base; @tailwind components; @tailwind utilities;` directives are present in `src/index.css`.
> 3. Check if PostCSS is configured with the Tailwind plugin in `postcss.config.js`.
> 4. Clear the Vite cache: delete `node_modules/.vite` and restart the dev server.
> 5. After fixing, verify the Home page renders with the dark slate background and emerald accent colors."

---

### Prompt 14: App Navigation Sidebar Layout (`app-layout.tsx`)
> "Act as a Frontend Layout Architect. Build the master layout container `artifacts/bug-engine/src/components/layout/app-layout.tsx`.
> 
> Requirements:
> 1. Left Sidebar Navigation (Fixed width `w-64`, full height `h-screen`, `bg-slate-900/80 border-r border-slate-800`):
>    - Brand Header: Logo icon with title *"Bug Engine AI"*.
>    - Navigation Items (with Lucide icons and active route highlight):
>      - 🏠 Home (`/`): `Sparkles` icon.
>      - 📜 History (`/history`): `History` icon.
>      - 📊 Dashboard (`/dashboard`): `BarChart3` icon.
>      - 🧪 NL to Test (`/nl2test`): `FlaskConical` icon.
>      - ⚡ Flaky Detector (`/flaky-detector`): `Zap` icon.
>      - 🌐 Env Diff (`/env-diff`): `GitCompare` icon.
>      - 📂 Projects (`/projects`): `FolderGit2` icon.
>      - 📄 Export (`/export`): `Download` icon.
>    - Footer: LLM Connection Status Pill showing active provider (`Groq AI Llama 3.3`).
> 
> 2. Main Content Area (`flex-1 overflow-y-auto p-8`): Render dynamic router outlet."

---

### Prompt 15: Home Page Layout & Dual-Mode Input Form (`home.tsx`)
> "Act as a Frontend Developer. Build the Home page (`artifacts/bug-engine/src/pages/home.tsx`).
> 
> Features:
> 1. Hero Banner: Title *"AI Multi-Agent Bug Reproduction Engine"* with subtext *"Transform raw bug reports and stack traces into verified Jest unit tests and flowcharts"*.
> 2. Dual-Mode Input Tabs:
>    - **Tab 1 — Raw Text / Stack Trace:** Textarea for pasting raw error output or user bug descriptions.
>    - **Tab 2 — GitHub Issue URL:** Input for pasting GitHub issue URLs (e.g. `https://github.com/vercel/next.js/issues/12345`) with auto-fetch simulation button.
> 3. Form Controls:
>    - Title input field.
>    - Optional Code Context textarea.
>    - Tags input.
>    - Primary Submit Button: *"Run Multi-Agent Pipeline"* with loading spinner state.
> 
> Wire form submission to `POST /api/analyses` and trigger SSE stream navigation."

---

### Prompt 16: Live SSE Agent Progress Tracker UI (`home.tsx`)
> "Act as a Real-Time Web Engineer. Implement the live SSE progress tracker component on the Home page (`home.tsx`).
> 
> Requirements:
> 1. When pipeline starts, establish `EventSource` listening to `POST /api/analyses/:id/run`.
> 2. Render 6 agent step cards:
>    - Card 1: Entity Extractor
>    - Card 2: Confidence Scorer
>    - Card 3: Hypothesis Generator
>    - Card 4: Step Validator
>    - Card 5: Executable Test Writer
>    - Card 6: Fix Suggester & Diagrammer
> 3. Card States:
>    - `pending`: Gray border, dimmed text, idle clock icon.
>    - `running`: Animated blue pulsing border, spinning Loader2 icon, duration timer.
>    - `completed`: Green border, CheckCircle icon, summary snippet badge.
>    - `failed`: Red border, AlertTriangle icon, error message.
> 4. Upon completion, show a high-visibility button: *"View Complete Diagnostic Analysis ➔"* linking to `/detail/:id`."

---

### Prompt 16.1: 🐛 DEBUG — EventSource Connection Drops After 30 Seconds with No Data
> "The SSE EventSource connection on the Home page drops after approximately 30 seconds and the browser console shows:
> ```
> EventSource connection timeout - no data received
> GET http://localhost:5000/api/analyses/15/run net::ERR_INCOMPLETE_CHUNKED_ENCODING
> ```
> The pipeline agents are still running on the backend but the connection dies before they complete.
> 
> Debug this by:
> 1. Checking if there's a proxy timeout configuration — Vite's default proxy timeout might be too short for long-running LLM API calls. Add `timeout: 120000` (2 minutes) to the Vite proxy options.
> 2. On the backend SSE handler, add keep-alive heartbeat pings: send `data: {"type":"heartbeat"}\n\n` every 15 seconds to prevent the connection from being considered idle.
> 3. Verify that `res.flushHeaders()` is called immediately after setting SSE response headers so the connection is established before the first agent starts.
> 4. Check if Groq API calls for individual agents are timing out — add a `timeout: 60000` option to each OpenAI SDK completion call.
> 5. After fixing, test with a complex bug report and verify all 6 agents complete without connection drops."

---

### Prompt 17: History Table Component & Column Specs (`history.tsx`)
> "Act as a Frontend Data Tables Lead. Implement the History page (`artifacts/bug-engine/src/pages/history.tsx`).
> 
> Table Columns:
> 1. `ID`: Numeric badge (`#1`, `#2`).
> 2. `Title`: Bold analysis title with input type icon badge (`Raw Text` / `Stack Trace` / `GitHub`).
> 3. `Severity`: Badge with color tokens (`Critical`: rose, `High`: orange, `Medium`: amber, `Low`: slate).
> 4. `Confidence Score`: Progress bar + percentage string (e.g. `82%`).
> 5. `Status`: Status badge (`Completed`: green, `Running`: blue, `Failed`: red).
> 6. `Created Date`: Safely formatted date string using `formatDateSafe(analysis.createdAt, "MMM d, yyyy")`.
> 7. `Actions`: Button *"Inspect"* linking to `/detail/:id`.
> 
> Handle empty database states with a clean placeholder graphic."

---

### Prompt 17.1: 🐛 DEBUG — History Page Crashes with `RangeError: Invalid time value`
> "When I navigate to `/history`, the entire page crashes with a React error overlay showing:
> ```
> RangeError: Invalid time value
>     at format (date-fns/format.mjs:42:15)
>     at HistoryPage (history.tsx:156:22)
> ```
> The crash happens on this line: `format(new Date(analysis.createdAt), "MMM d, yyyy")`.
> 
> The issue is that some analysis records have `null` or `undefined` for `createdAt`, and `new Date(null)` produces an invalid date object that `date-fns/format` can't handle.
> 
> Fix this by:
> 1. Creating a safe date formatting wrapper `formatDateSafe` that validates the date before calling `format()`.
> 2. Handle all edge cases: `null`, `undefined`, empty string `""`, and invalid ISO strings.
> 3. If the date is invalid, return a fallback string like `"N/A"` instead of crashing.
> 4. Apply this fix not just to `history.tsx` but to ALL pages that format dates — check `dashboard.tsx`, `detail.tsx`, `export.tsx`, `projects.tsx`, `env-diff.tsx`, and others.
> 5. After fixing, verify `/history` loads without crashing even when some records have missing timestamps."

---

### Prompt 18: History Multi-Filter & Search Engine (`history.tsx`)
> "Act as an Interactive UI Engineer. Add search and multi-filtering controls to `/history`:
> 
> Features:
> 1. Search Bar: Live text input filtering titles, raw input, and taxonomy tags.
> 2. Status Filter: Select dropdown (`All Statuses`, `Completed`, `Running`, `Failed`).
> 3. Severity Filter: Select dropdown (`All Severities`, `Critical`, `High`, `Medium`, `Low`).
> 4. Sort Control: Dropdown for sorting by `Newest First`, `Oldest First`, `Highest Confidence`, `Lowest Confidence`.
> 5. Filter Reset Button: Clears all active filters when clicked.
> 
> Ensure filter states update URL query params or React local state instantaneously."

---

### Prompt 19: Analysis Detail Header & Radial Confidence Gauge (`detail.tsx`)
> "Act as a Data Visualization UI Engineer. Build the top header for the Analysis Detail page (`artifacts/bug-engine/src/pages/detail.tsx`).
> 
> Header Components:
> 1. Back Button: `<- Back to History` link.
> 2. Title & ID: Large heading with analysis ID badge.
> 3. Status & Severity Badges: Color-coded status and severity indicators.
> 4. Radial Confidence Gauge: SVG circular progress ring displaying score (e.g. `82/100`) with color transition (Emerald for >=80, Amber for 50-79, Rose for <50).
> 5. Action Buttons: *"Re-run Pipeline"*, *"Export Report"*, *"Delete Record"*.
> 
> Connect route parameter `useParams<{ id: string }>()` to fetch data from `GET /api/analyses/:id`."

---

### Prompt 20: Detail Page Tab 1 (Entities) & Tab 2 (Hypotheses Accordion)
> "Act as a Component Developer. Implement Tab 1 and Tab 2 in `detail.tsx`:
> 
> 1. **Tab 1 — Extracted Entities:**
>    - Render grid of cards for `Component`, `Trigger Action`, `Expected Behavior`, `Actual Behavior`, `Environment Specs`, and `Error Messages`.
>    - Display error messages inside a styled dark terminal code block with line wrapping.
> 
> 2. **Tab 2 — Root-Cause Hypotheses:**
>    - Render list of hypotheses as interactive Shadcn Accordion items.
>    - Accordion Header: Hypothesis title, likelihood badge (`HIGH` / `MEDIUM` / `LOW`), and status badge (`✓ RETAINED` green / `✗ ELIMINATED` dark).
>    - Accordion Content: Technical mechanism explanation, list of confirming evidence points, list of refuting evidence points, and status rationale."

---

### Prompt 20.1: 🐛 DEBUG — Hypotheses Tab Shows `[object Object]` Instead of Data
> "On the Detail page, Tab 2 (Hypotheses) is rendering `[object Object]` text strings instead of the actual hypothesis content. The raw data from the API looks like this:
> ```json
> { "hypotheses": "{\"items\":[{\"id\":\"h1\",\"title\":\"Stale closure...\"}]}" }
> ```
> The `hypotheses` field is a JSON string, not a parsed object.
> 
> Fix this by:
> 1. Adding a `JSON.parse()` call when reading the `hypotheses` field from the API response, since the backend stores it as a stringified JSON text column.
> 2. Wrap in a try-catch: if parsing fails (malformed JSON), display a fallback message instead of crashing.
> 3. Apply the same pattern to ALL JSON text fields: `extractedEntities`, `reproductionSteps`, `clarifyingQuestions`, `confidenceBreakdown`, `auditTrail`, and `fixSuggestions`.
> 4. Consider creating a reusable utility `safeJsonParse(str: string, fallback: any = null)` to DRY up the parsing logic across all components."

---

### Prompt 21: Detail Page Tab 3 (Steps) & Tab 4 (Jest Test Viewer)
> "Act as a Frontend Engineer. Implement Tab 3 and Tab 4 in `detail.tsx`:
> 
> 1. **Tab 3 — Reproduction Steps:**
>    - Prerequisites Callout Box: Yellow warning alert listing required mock states and credentials.
>    - Numbered Step Timeline: Vertical step indicator showing step number, action description, and expected outcome.
>    - Validation Notes Box: Instructions for ruling out alternative failure theories.
> 
> 2. **Tab 4 — Executable Test Code:**
>    - Syntax-highlighted code block displaying generated TypeScript Jest / React Testing Library code.
>    - Top Toolbar: Framework detection badge (`Jest / RTL`), language badge (`TypeScript`), and one-click *"Copy Code"* button with copied checkmark feedback."

---

### Prompt 22: Detail Page Tab 5 — Dynamic Mermaid Chart Renderer (`detail.tsx`)
> "Act as a Graph Visualization Specialist. Implement Tab 5 (Flowchart) in `detail.tsx`.
> 
> Requirements:
> 1. Import `mermaid` library dynamically.
> 2. Initialize Mermaid with dark theme settings (`theme: 'dark'`, `themeVariables: { primaryColor: '#1e293b', lineColor: '#64748b' }`).
> 3. Render the `flowDiagram` string returned by Agent 6 into an SVG graph container.
> 4. Error Handling:
>    - If Mermaid throws a parsing syntax exception, catch it safely and display a clean fallback code viewer showing the raw chart markup instead of crashing the React application."

---

### Prompt 22.1: 🐛 DEBUG — Mermaid Chart Crashes on Special Characters in Node Labels
> "The Mermaid.js flowchart renderer on Tab 5 throws a parsing error for some analysis records:
> ```
> Parse error on line 4:
> ...N3[Failure Point (setState callback)]--
> ----------------------^
> Expecting 'SEMI', 'NEWLINE', 'EOF', got 'OPEN_IN_LINK'
> ```
> The issue is that Agent 6 generates Mermaid node labels containing parentheses `()` and special characters that Mermaid interprets as syntax.
> 
> Fix this by:
> 1. Going back to Agent 6's prompt in `fixSuggester.ts` and adding explicit instructions to wrap ALL node labels in double quotes: `N3["Failure Point (setState callback)"]` instead of `N3[Failure Point (setState callback)]`.
> 2. As a client-side safety net, add a pre-processing step in `detail.tsx` that scans the `flowDiagram` string and auto-quotes any unquoted node labels containing `(`, `)`, `[`, `]`, `{`, `}`, or `&` characters before passing to `mermaid.render()`.
> 3. If Mermaid still throws after pre-processing, catch the error and show the raw Mermaid code in a syntax-highlighted code block as a fallback.
> 4. Test with at least 5 different analysis records to verify charts render without errors."

---

### Prompt 23: Detail Page Tab 6 — Remediation Fix Suggestions (`detail.tsx`)
> "Act as a Component Developer. Implement Tab 6 (Fix Suggestions) in `detail.tsx`.
> 
> Layout & Components:
> 1. Ranked Fix Cards: Display 1..N remediation items ordered by rank.
> 2. Card Header: Rank number badge, Fix Title, Effort Level badge (`Low Effort` green / `Medium` yellow / `High` red), and Confidence rating.
> 3. Code Location Badge: Display target file and function signature (e.g. `ProfilePageRenderer.render() in src/components/ProfilePageRenderer.js`) with code icon.
> 4. Description Body: Detailed technical explanation of the code modification required."

---

### Prompt 24: Analytics Dashboard Metrics & Summary Cards (`dashboard.tsx`)
> "Act as a Dashboard UI Developer. Build the top metrics section of the Analytics Dashboard (`artifacts/bug-engine/src/pages/dashboard.tsx`).
> 
> Summary Metric Cards Grid (5 Cards):
> 1. **Total Analyses:** Total count with historical trend icon.
> 2. **Completed Runs:** Count of successful analyses with green checkmark.
> 3. **Active/Running:** Count of in-flight analyses with spinning indicator.
> 4. **Failed Analyses:** Count of failed runs with alert icon.
> 5. **Avg Confidence Score:** Overall mean confidence percentage across all completed analyses.
> 
> Fetch metrics from backend endpoint `GET /api/analyses/stats/summary`."

---

### Prompt 25: Dashboard Recharts Data Visualizations (`dashboard.tsx`)
> "Act as a Data Visualization Lead. Implement chart visualizations on `/dashboard` using Recharts:
> 
> Charts to build:
> 1. **30-Day Execution Trends (AreaChart):**
>    - X-Axis: Date (`MMM d`).
>    - Y-Axis: Analysis count.
>    - Smooth gradient area fill (`emerald-500`).
>    - Custom tooltip showing completed vs failed breakdown per day.
> 2. **Severity Distribution (PieChart / DonutChart):**
>    - Slices: Critical (rose), High (orange), Medium (amber), Low (slate).
>    - Legend with percentage labels.
> 3. **Input Type Breakdown (BarChart):**
>    - Bars for `Raw Text`, `Stack Trace`, and `GitHub Issue URL`."

---

### Prompt 25.1: 🐛 DEBUG — Recharts `ResponsiveContainer` Renders with 0 Height
> "The Recharts charts on the Dashboard page render as invisible elements — the SVG is present in the DOM but has 0px height. This happens because `ResponsiveContainer` requires its parent to have an explicit height, but our flex-based layout doesn't provide one.
> 
> Fix this by:
> 1. Wrapping each `ResponsiveContainer` in a `div` with explicit height: `<div style={{ width: '100%', height: 300 }}>` or `className="h-[300px] w-full"`.
> 2. Verify that the parent card container isn't using `overflow: hidden` which can clip the chart.
> 3. If charts still don't render, check if Recharts has a race condition with React 18's StrictMode — try removing StrictMode temporarily to test.
> 4. After fixing, verify all 3 charts (AreaChart, PieChart, BarChart) render at the correct dimensions with data."

---

### Prompt 25.2: 🧪 TEST — Dashboard Data Accuracy Verification
> "Verify that the Dashboard metrics and charts display accurate data by cross-referencing with direct API responses:
> 1. Hit `GET /api/analyses/stats/summary` and note the values for `total`, `completed`, `failed`, `running`, and `avgConfidence`.
> 2. Open the Dashboard page (`/dashboard`) and verify each metric card matches the API response exactly.
> 3. Hit `GET /api/analyses/trends?days=30` and verify the trend chart data points match the API response array length.
> 4. Count the number of analyses per severity level from `GET /api/analyses` and verify the PieChart slices match.
> 5. Verify the AreaChart x-axis date labels are formatted correctly as `MMM d` and not showing raw ISO strings."

---

### Prompt 26: NL-to-Test Generator Page (`nl2test.tsx`)
> "Act as a Tooling Engineer. Build the Natural Language to Test Generator page (`artifacts/bug-engine/src/pages/nl2test.tsx`).
> 
> Specifications:
> 1. Textarea: Input for typing natural language bug descriptions (e.g. *"Clicking the checkout button with an expired coupon code shows a 500 error instead of a validation toast"*).
> 2. Framework Selector: Dropdown (`Jest / React Testing Library`, `Vitest`, `Cypress`, `Playwright`).
> 3. Action Button: *"Compile to Test Code"* with AI generation state.
> 4. Output View: Dual-pane interface showing generated test structure, mock definitions, and copyable TypeScript test code."

---

### Prompt 27: Flaky Test Analyzer Page (`flaky-detector.tsx`)
> "Act as a Reliability Tooling Engineer. Build the Flaky Test Detector page (`artifacts/bug-engine/src/pages/flaky-detector.tsx`).
> 
> Features:
> 1. Test Log Input: Textarea for pasting non-deterministic test run logs or test execution histories.
> 2. Flakiness Calculator: Computes a Flakiness Probability Index (0% to 100%) and categorizes failure patterns (Timing/Race Condition, Async Unhandled Promise, Shared State Contamination, Network Flakiness).
> 3. Recommendations Card: Suggested stabilization fixes (e.g. replacing hardcoded `setTimeout` with `waitFor`, resetting global mocks in `beforeEach`)."

---

### Prompt 28: Environment Matrix Diff Page (`env-diff.tsx`)
> "Act as an Infrastructure Tooling Developer. Build the Environment Diff Matrix page (`artifacts/bug-engine/src/pages/env-diff.tsx`).
> 
> Interface Specifications:
> 1. Dual Environment Columns: Side-by-side comparison cards for **Environment A (Working Baseline)** vs **Environment B (Failing Target)**.
> 2. Parameters Compared: OS, OS Version, Node Runtime, Browser Version, Database Engine, Dependencies, Feature Flags.
> 3. Diff Highlighting: Automatically highlight mismatched parameter rows in red/amber with conflict warning icons."

---

### Prompt 29: Project Hub (`projects.tsx`) & Diagnostic Export Suite (`export.tsx`)
> "Act as a Feature Engineer. Implement the Projects Manager and Export pages:
> 
> 1. **`/projects` Page:**
>    - Repository project registry card list.
>    - Project creation modal (Project Name, Repository URL, Branch, Associated Analysis Count).
> 
> 2. **`/export` Page:**
>    - Select analysis dropdown.
>    - Export Format Selector (`Markdown (.md)`, `PDF Document (.pdf)`, `JSON Spec (.json)`).
>    - Options checkboxes (Include Flowchart, Include Unit Tests, Include Audit Log).
>    - Primary Button: *"Generate & Download Diagnostic Package"*."

---

### Prompt 29.1: 🧪 TEST — Cross-Page Navigation & Route Guard Verification
> "Run a comprehensive navigation test across all 9 application pages to verify routing integrity:
> 1. Start at Home (`/`) and verify the pipeline input form renders.
> 2. Navigate to History (`/history`) and verify the data table loads with records.
> 3. Click on any analysis row in the History table and verify it navigates to the correct `/detail/:id` page with matching data.
> 4. Navigate to Dashboard (`/dashboard`) and verify charts render.
> 5. Navigate to NL-to-Test (`/nl2test`), Flaky Detector (`/flaky-detector`), Env Diff (`/env-diff`), Projects (`/projects`), and Export (`/export`) — verify each page renders without crashes.
> 6. Test the browser back/forward buttons to verify React Router history works correctly.
> 7. Test navigating directly to a deep URL like `http://localhost:5000/detail/1` — verify it loads correctly without a blank page.
> 8. Test navigating to a non-existent route like `/does-not-exist` — verify it shows a 404 or redirects gracefully.
> 
> Report any pages that crash, show blank content, or have broken navigation links."

---

### Prompt 30: Cross-Platform Date Safety Guard (`formatDateSafe`)
> "Act as a Frontend Stability Lead. Fix client-side crash occurring on `/history` and `/detail` when rendering missing or malformed ISO date strings (`RangeError: Invalid time value`).
> 
> Instructions:
> 1. Create utility `formatDateSafe(val: string | number | Date | null | undefined, formatStr: string = "MMM d, yyyy"): string` in `artifacts/bug-engine/src/lib/utils.ts`.
> 2. Check for null, undefined, or empty values. Check `isNaN(date.getTime())`. Wrap `date-fns/format` inside `try...catch`. Return `"N/A"` on any parsing failure.
> 3. Replace all raw date formatting calls across all 9 page components."

---

### Prompt 31: PGlite Drizzle Array Row-Mode Adapter Fix
> "Act as a Database Systems Specialist. Fix issue where Drizzle `db.select()` queries over `@electric-sql/pglite` return empty `{}` objects.
> 
> Solution:
> Update `pool.query` adapter wrapper in `lib/db/src/index.ts` to forward `{ rowMode: queryText.rowMode }` to `pgliteInstance.query()`. This ensures PGlite returns array tuples `[val1, val2]` which Drizzle maps back to object keys correctly."

---

### Prompt 31.1: 🐛 DEBUG — `GET /api/analyses` Returns Empty Array Despite Database Having Records
> "After fixing the rowMode issue, `GET /api/analyses` returns an empty array `[]` even though the database has 55 records. I verified the records exist by running a raw SQL query `SELECT COUNT(*) FROM analyses;` which returns `55`.
> 
> Debug this by:
> 1. Adding debug logging inside the `GET /api/analyses` route handler to log the Drizzle query result: `logger.info({ count: result.length }, 'Analyses query result');`.
> 2. Check if the route handler is using `db.select().from(analysesTable)` correctly — is it missing an `await`?
> 3. Verify the Drizzle `db` instance is the same one connected to the PGlite instance with data. If the server was restarted after importing data but the PGlite is creating a fresh in-memory instance, the data would be gone.
> 4. Check if PGlite is configured with `dataDir: '.data/pgdata'` (persistent) vs no `dataDir` (in-memory only).
> 5. Restart the API server and re-test. If data persists across restarts, the fix works. If not, the dataDir configuration is wrong."

---

### Prompt 32: Top-Level Await Elimination for CJS Compatibility
> "Act as a Build & Bundling Engineer. Fix bundling crash where `esbuild` throws `Top-level await is currently not supported with the 'cjs' output format`.
> 
> Instructions:
> Refactor `lib/db/src/index.ts` to remove top-level `await` calls. Use an asynchronous initialization queue (`initPromise`) that lazily initializes the PGlite instance and creates tables on the first incoming query."

---

### Prompt 32.1: 🐛 DEBUG — `esbuild` Build Fails with `__dirname is not defined in ES module scope`
> "After fixing the top-level await issue, the API server build now fails with a different error:
> ```
> ReferenceError: __dirname is not defined in ES module scope
>     at file:///D:/AI-BugReproducer/artifacts/api-server/dist/index.mjs:1842:25
> ```
> This is because the project uses `"type": "module"` in `package.json` which makes all `.js` files treated as ES modules, but `__dirname` is only available in CommonJS.
> 
> Fix this by:
> 1. Replacing all `__dirname` references with `path.dirname(fileURLToPath(import.meta.url))` using the `url` module.
> 2. Or alternatively, use `process.cwd()` for resolving relative paths like `.env` and `.llm-config.json` since those are relative to the workspace root, not the source file location.
> 3. Search the entire `artifacts/api-server/src/` directory for any `__dirname` or `__filename` usages and replace them all.
> 4. Rebuild with `pnpm --filter @workspace/api-server run build` and verify the build succeeds without errors.
> 5. Start the server and verify it boots without `ReferenceError` crashes."

---

### Prompt 32.2: 🧪 TEST — Full Backend Build & Boot Verification
> "Run a complete build-and-boot verification cycle:
> 1. Clean the dist directory: `rm -rf artifacts/api-server/dist/`.
> 2. Build the API server: `pnpm --filter @workspace/api-server run build`.
> 3. Verify build completes without errors and outputs `dist/index.mjs`.
> 4. Start the server: `PORT=8080 node ./artifacts/api-server/dist/index.mjs`.
> 5. Verify server boots with log message `[API] Server listening on port 8080`.
> 6. Hit `GET /api/healthz` and verify `{ status: 'ok' }`.
> 7. Hit `GET /api/settings/llm` and verify Groq provider is configured.
> 8. Hit `POST /api/settings/llm/test` and verify live Groq connection with latency.
> 
> Report build time, bundle size, and any warnings."

---

### Prompt 33: Bulk Benchmark CSV Dataset Importer (`import-csv-data.ts`)
> "Act as a Data Infrastructure Engineer. Write a CLI dataset importer script in `scripts/src/import-csv-data.ts`.
> 
> Functional Requirements:
> 1. Read `analyses.csv` (55 benchmark analysis runs) from the root workspace directory.
> 2. Parse CSV rows robustly, handling multiline JSON fields, internal quotes, and newlines.
> 3. Truncate table `analysesTable` in the WASM Postgres database.
> 4. Insert all 55 records using parameterized raw SQL queries via `pool.query()`.
> 5. Update PostgreSQL sequence: `SELECT setval('analyses_id_seq', (SELECT MAX(id) FROM analyses));`.
> 6. Print parsed row count and exit cleanly."

---

### Prompt 33.1: 🐛 DEBUG — CSV Importer Fails on Multiline JSON Fields with Internal Quotes
> "The CSV importer script crashes on row 12 with:
> ```
> SyntaxError: Unexpected token ',' at position 342
> Error parsing JSON for field 'hypotheses' in row 12
> ```
> The problem is that the `hypotheses` column contains a JSON string with internal double quotes that conflict with the CSV field quoting. The raw CSV looks like:
> ```csv
> 12,"React useEffect cleanup","raw_text","...","{""items"":[{""id"":""h1"",""title"":""Missing cleanup""}]}"
> ```
> 
> Fix this by:
> 1. Using a proper CSV parser that handles RFC 4180 escaped quotes (doubled `""` → `"`) instead of naive `split(',')` parsing.
> 2. Handle multiline fields — some JSON payloads in the CSV span multiple lines because they contain `\n` newline characters inside the JSON strings.
> 3. After parsing, validate each JSON field with `try { JSON.parse(field) } catch { ... }` and log a warning (don't crash) for any malformed entries.
> 4. Re-run the importer and verify all 55 records are imported successfully without any parsing errors."

---

### Prompt 34: Point-to-Point Automated Verification Suite (`verify-deployment.ts`)
> "Act as a QA Automation & DevOps Lead. Create an automated point-to-point verification script in `scripts/src/verify-deployment.ts`.
> 
> Automated Test Suite (11 Checks):
> 1. `GET /api/healthz`: Health check status.
> 2. `GET /api/settings/llm`: LLM config and API key presence.
> 3. `POST /api/settings/llm/test`: Live Groq AI API ping and latency measurement.
> 4. `GET /api/analyses`: Verify dataset return count (>= 50).
> 5. `GET /api/analyses/:id`: Verify single detail record retrieval.
> 6. `GET /api/analyses/stats/summary`: Verify aggregate metrics computation.
> 7. `GET /api/analyses/trends`: Verify trend chart data points.
> 8. `GET /api/projects`: Verify project registry endpoint.
> 9. `POST /api/analyses`: Create test analysis record.
> 10. `DELETE /api/analyses/:id`: Clean up test record.
> 11. `GET http://localhost:5000/api/analyses`: Verify Vite proxy forwarding.
> 
> Output clean ASCII table and exit with code 0 on 100% pass rate."

---

### Prompt 35: Repository Cleanup & GitHub README Creation
> "Act as a Developer Relations Engineer. Prepare the codebase for GitHub release.
> 
> Tasks:
> 1. Update `.gitignore` to exclude local secrets (`.env`, `.llm-config.json`), embedded databases (`.data/`), datasets (`analyses.csv`, `*.csv`, `*.xlsx`), attached assets, temporary reports (`*_REPORT.md`), and build outputs (`dist/`).
> 2. Remove temporary scratch scripts from `scripts/src/` keeping clean utilities (`seed-analyses.ts`, `import-csv-data.ts`, `verify-deployment.ts`).
> 3. Create a state-of-the-art `README.md` containing multi-agent architecture Mermaid diagrams, tech stack specs, step-by-step installation guides, running instructions, API references, and troubleshooting."
