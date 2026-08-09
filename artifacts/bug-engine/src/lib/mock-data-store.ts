// Embedded mock dataset for static web application deployments (Vercel)

export interface MockAnalysis {
  id: number;
  title: string;
  inputType: string;
  rawInput: string;
  githubUrl?: string | null;
  codeContext?: string | null;
  tags?: string | null;
  status: "pending" | "running" | "completed" | "failed";
  severity?: "critical" | "high" | "medium" | "low" | null;
  severityReason?: string | null;
  confidenceScore?: number | null;
  confidenceBreakdown?: string | null;
  extractedEntities?: string | null;
  hypotheses?: string | null;
  reproductionSteps?: string | null;
  testCode?: string | null;
  testSyntaxStatus?: string | null;
  mermaidDiagram?: string | null;
  clarifyingQuestions?: string | null;
  fixSuggestions?: string | null;
  auditTrail?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MockProject {
  id: number;
  name: string;
  description: string | null;
  defaultFramework: string | null;
  slackWebhookUrl: string | null;
  discordWebhookUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

export const INITIAL_MOCK_ANALYSES: MockAnalysis[] = [
  {
    id: 1,
    title: "JWT refresh token collision on concurrent API requests",
    inputType: "raw_text",
    rawInput: "Authentication service fails intermittently when multiple API calls are made simultaneously. JWT access token expires during a burst of requests, all of which simultaneously attempt to refresh it. Each refresh call generates a new token pair, invalidating the previous one. Client ends up with stale tokens and 401 errors on subsequent calls.",
    tags: "authentication,jwt,token,refresh,concurrent,session",
    status: "completed",
    severity: "critical",
    severityReason: "Silent token invalidation causes cascading 401 errors across all authenticated API calls.",
    confidenceScore: 0.88,
    confidenceBreakdown: JSON.stringify({
      score: 88,
      rubric: { stack_trace: 0, code_context: 15, reproduction_steps: 25, error_message: 20, environment: 10, frequency: 8, similar_bug: 10 },
      missing: ["stack_trace"],
      evidence: ["JWT refresh race condition documented in auth service logs", "401 errors correlated with concurrent request bursts"],
      assumptions: ["Token refresh lock not implemented"]
    }),
    extractedEntities: JSON.stringify({
      component: "AuthenticationService",
      triggerAction: "Concurrent JWT refresh on token expiry",
      expectedBehavior: "Single token refresh, all requests succeed with new token",
      actualBehavior: "Multiple refresh calls issued simultaneously, tokens overwrite each other causing 401 on stale tokens",
      environment: { runtime: "Node.js 20", version: "auth-service v3.2.1" },
      errorMessages: ["401 Unauthorized: token_revoked", "JWT signature verification failed: key rotation conflict"],
      frequency: "intermittent",
      additionalContext: "Observed under load when >5 concurrent requests hit an expired token simultaneously."
    }),
    hypotheses: JSON.stringify([
      {
        id: "h1",
        title: "Missing refresh token mutex",
        mechanism: "Without a distributed lock, concurrent token refresh requests each spawn independent refresh flows, creating a race condition where the last writer wins and invalidates all prior refresh attempts.",
        likelihood: "high",
        confirmingEvidence: ["Multiple 401s logged within same 50ms window", "Auth service log shows concurrent refresh_token calls"],
        refutingEvidence: [],
        status: "retained",
        statusReason: "Direct match with missing mutex in AuthService.refreshToken()"
      }
    ]),
    reproductionSteps: JSON.stringify({
      prerequisites: ["Active user session with JWT access token", "Token within 60s of expiry"],
      steps: [
        { number: 1, action: "Issue 5+ concurrent API requests from same session", expectedOutcome: "All requests trigger simultaneous token refresh" },
        { number: 2, action: "Observe auth service logs for concurrent refresh_token calls" },
        { number: 3, action: "Check responses — later responses return 401 with token_revoked" }
      ],
      expectedResult: "Single refresh completes, all requests succeed",
      actualResult: "Multiple refreshes race; subsequent calls fail with stale tokens",
      environmentConfig: ["Active user session with JWT access token"],
      validationNotes: ["Verify with Redis lock implementation as fix"],
      confidenceRating: 8
    }),
    testCode: `// Bug Reproduction Test — JWT refresh race condition\nimport { createAuthClient } from '../src/auth';\n\ndescribe('JWT refresh concurrency', () => {\n  it('should not issue multiple concurrent refresh calls', async () => {\n    const client = createAuthClient({ tokenTtl: 1 });\n    await client.login('user@example.com', 'password');\n    await new Promise(r => setTimeout(r, 1100));\n    const results = await Promise.allSettled(\n      Array.from({ length: 5 }, () => client.get('/api/profile'))\n    );\n    const failures = results.filter(r => r.status === 'rejected');\n    expect(failures).toHaveLength(0);\n  });\n});`,
    testSyntaxStatus: "verified",
    mermaidDiagram: "graph TD\n  Req1[Request 1] -->|Token Expired| Refresh1[Refresh Token A]\n  Req2[Request 2] -->|Token Expired| Refresh2[Refresh Token B]\n  Refresh1 -->|Invalidates A| DB[(Auth Store)]\n  Refresh2 -->|Overwrites A with B| DB\n  Req1 -->|Uses Token A| Error[401 Unauthorized]",
    fixSuggestions: JSON.stringify([
      { title: "Implement Mutex Lock around Token Refresh", description: "Wrap refreshToken() logic in a single-flight mutex so concurrent requests await the active refresh promise.", file: "src/auth/service.ts", effort: "low", impact: "high" }
    ]),
    createdAt: daysAgo(45),
    updatedAt: daysAgo(45)
  },
  {
    id: 2,
    title: "Session not invalidated across devices after password change",
    inputType: "raw_text",
    rawInput: "After a user changes their password, existing sessions on other devices remain active indefinitely. The password change endpoint updates the credential hash but does not revoke session tokens or refresh tokens issued before the change.",
    tags: "authentication,session,password,security,logout",
    status: "completed",
    severity: "critical",
    severityReason: "Active sessions persist after credential rotation — compromised accounts cannot be secured.",
    confidenceScore: 0.91,
    extractedEntities: JSON.stringify({
      component: "SessionManagementService",
      triggerAction: "Password change via account settings",
      expectedBehavior: "All existing sessions invalidated after password rotation",
      actualBehavior: "Sessions on other devices remain authenticated with old credential hash",
      environment: { runtime: "Node.js 18", version: "user-service v2.8.0" },
      errorMessages: ["Session validation bypass: credential hash mismatch ignored"],
      frequency: "always"
    }),
    createdAt: daysAgo(38),
    updatedAt: daysAgo(38)
  },
  {
    id: 3,
    title: "OAuth PKCE code verifier mismatch on mobile redirect",
    inputType: "raw_text",
    rawInput: "OAuth 2.0 PKCE flow fails on iOS Safari when the app is backgrounded during the authorization redirect. The code verifier stored in sessionStorage is lost when the app returns to foreground.",
    tags: "oauth,pkce,authentication,session,mobile",
    status: "completed",
    severity: "high",
    severityReason: "Login fails completely on iOS for users whose app is backgrounded during OAuth flow.",
    confidenceScore: 0.82,
    createdAt: daysAgo(29),
    updatedAt: daysAgo(29)
  },
  {
    id: 4,
    title: "Cart total incorrect after rapid concurrent item additions",
    inputType: "raw_text",
    rawInput: "Shopping cart shows incorrect total when a user rapidly adds multiple items in quick succession. The cart total update is a read-modify-write operation without any locking.",
    tags: "race-condition,concurrency,cart,database",
    status: "completed",
    severity: "high",
    severityReason: "Incorrect cart totals lead to pricing errors at checkout.",
    confidenceScore: 0.85,
    createdAt: daysAgo(22),
    updatedAt: daysAgo(22)
  },
  {
    id: 5,
    title: "Deadlock on simultaneous order submission and inventory decrement",
    inputType: "stack_trace",
    rawInput: "ERROR: deadlock detected DETAIL: Process 1234 waits for ShareLock on transaction 5678. Two concurrent order submissions each acquire a row lock on inventory items in conflicting order.",
    tags: "deadlock,concurrency,database,postgresql",
    status: "completed",
    severity: "high",
    severityReason: "Deadlocks during checkout cause order failures and 500 errors.",
    confidenceScore: 0.87,
    createdAt: daysAgo(15),
    updatedAt: daysAgo(15)
  },
  {
    id: 6,
    title: "WebSocket message ordering broken under concurrent broadcast",
    inputType: "log_file",
    rawInput: "Real-time notification feed shows messages out of order when multiple events are broadcast simultaneously. The WebSocket server emits events as async queries finish.",
    tags: "websocket,concurrency,async,ordering",
    status: "completed",
    severity: "medium",
    severityReason: "Out-of-order notifications confuse users.",
    confidenceScore: 0.75,
    createdAt: daysAgo(10),
    updatedAt: daysAgo(10)
  },
  {
    id: 7,
    title: "Memory leak in Server-Sent Events SSE connection pool",
    inputType: "sentry_event",
    rawInput: "Node process memory grows monotonically until OOM crash. Disconnected SSE clients leave listeners attached to global EventEmitter.",
    tags: "memory-leak,sse,events,performance",
    status: "completed",
    severity: "critical",
    severityReason: "OOM crashes force node process restarts under high user load.",
    confidenceScore: 0.94,
    createdAt: daysAgo(5),
    updatedAt: daysAgo(5)
  },
  {
    id: 8,
    title: "Stale data returned from Redis cache after DB transaction rollback",
    inputType: "raw_text",
    rawInput: "Redis cache is populated before database transaction commits. When DB transaction rolls back due to constraint failure, Redis retains invalid cached state.",
    tags: "redis,cache,transaction,rollback",
    status: "completed",
    severity: "high",
    severityReason: "Users view phantom data that was rolled back from DB.",
    confidenceScore: 0.89,
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2)
  }
];

export const INITIAL_MOCK_PROJECTS: MockProject[] = [
  {
    id: 1,
    name: "Core Auth & Security",
    description: "Authentication services, session control, OAuth, and security auditing",
    defaultFramework: "jest-ts",
    slackWebhookUrl: null,
    discordWebhookUrl: null,
    createdAt: daysAgo(60),
    updatedAt: daysAgo(5)
  },
  {
    id: 2,
    name: "E-Commerce Checkout Pipeline",
    description: "Cart calculations, payment gateway integrations, and order processing",
    defaultFramework: "vitest",
    slackWebhookUrl: null,
    discordWebhookUrl: null,
    createdAt: daysAgo(40),
    updatedAt: daysAgo(2)
  }
];
