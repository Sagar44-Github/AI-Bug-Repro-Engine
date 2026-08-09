// Global Fetch Interceptor for Static Deployments (Vercel)
// Intercepts window.fetch calls to /api/* when backend server is unavailable or returning HTML 404s.

import { INITIAL_MOCK_ANALYSES, INITIAL_MOCK_PROJECTS } from "./mock-data-store";

function getStoredAnalyses() {
  if (typeof localStorage === "undefined") return INITIAL_MOCK_ANALYSES;
  const stored = localStorage.getItem("bugrepro_mock_analyses");
  if (!stored) {
    localStorage.setItem("bugrepro_mock_analyses", JSON.stringify(INITIAL_MOCK_ANALYSES));
    return INITIAL_MOCK_ANALYSES;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return INITIAL_MOCK_ANALYSES;
  }
}

function getStoredProjects() {
  if (typeof localStorage === "undefined") return INITIAL_MOCK_PROJECTS;
  const stored = localStorage.getItem("bugrepro_mock_projects");
  if (!stored) {
    localStorage.setItem("bugrepro_mock_projects", JSON.stringify(INITIAL_MOCK_PROJECTS));
    return INITIAL_MOCK_PROJECTS;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return INITIAL_MOCK_PROJECTS;
  }
}

export function getMockDataForUrl(urlStr: string, method: string = "GET", body?: any): any {
  try {
    const url = new URL(urlStr, window.location.origin);
    const path = url.pathname;

    const analyses = getStoredAnalyses();
    const projects = getStoredProjects();

    // 1. Stats Summary
    if (path.includes("/api/analyses/stats/summary") || path.includes("/api/analyses/stats")) {
      const total = analyses.length;
      const completed = analyses.filter((a: any) => a.status === "completed").length;
      const failed = analyses.filter((a: any) => a.status === "failed").length;
      const avgConfidence = 0.86;
      const byInputType = [
        { inputType: "raw_text", count: analyses.filter((a: any) => a.inputType === "raw_text").length || 4 },
        { inputType: "stack_trace", count: analyses.filter((a: any) => a.inputType === "stack_trace").length || 1 },
        { inputType: "sentry_event", count: analyses.filter((a: any) => a.inputType === "sentry_event").length || 1 },
        { inputType: "log_file", count: analyses.filter((a: any) => a.inputType === "log_file").length || 1 },
        { inputType: "github_url", count: analyses.filter((a: any) => a.inputType === "github_url").length || 1 }
      ];
      return { total, completed, failed, avgConfidence, byInputType };
    }

    // 2. Trends
    if (path.includes("/api/analyses/trends")) {
      const days = Number(url.searchParams.get("days")) || 30;
      return Array.from({ length: Math.min(days, 30) }, (_, i) => {
        const d = new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000);
        return {
          date: d.toISOString().split("T")[0],
          total: Math.floor(Math.sin(i) * 3 + 5),
          completed: Math.floor(Math.sin(i) * 2 + 4),
          critical: i % 4 === 0 ? 1 : 0,
          high: i % 3 === 0 ? 2 : 1,
          medium: 2,
          low: 1,
          avgConfidence: 0.85
        };
      });
    }

    // 3. Analysis Detail
    const detailMatch = path.match(/\/api\/analyses\/(\d+)$/);
    if (detailMatch && method.toUpperCase() === "GET") {
      const id = Number(detailMatch[1]);
      const found = analyses.find((a: any) => a.id === id);
      return found || analyses[0];
    }

    // 4. Correlations
    if (path.includes("/correlations")) {
      return {
        similarAnalyses: [
          {
            id: analyses[1]?.id || 2,
            title: analyses[1]?.title || "Session fixation after account recovery",
            similarityScore: 0.89,
            commonFactors: ["authentication", "session", "token"],
            historicalRootCauseNote: "Missing session revocation call during credential update transaction."
          }
        ]
      };
    }

    // 5. Annotations
    if (path.includes("/annotations")) {
      return [
        {
          id: 1,
          authorName: "Security Audit Team",
          type: "verified",
          content: "Reproduced in staging environment. Redis lock resolves concurrent token refresh race.",
          createdAt: new Date(Date.now() - 3600000).toISOString()
        }
      ];
    }

    // 6. List Analyses
    if (path.endsWith("/api/analyses") && method.toUpperCase() === "GET") {
      const search = url.searchParams.get("search")?.toLowerCase();
      let result = analyses;
      if (search) {
        result = result.filter((a: any) => a.title.toLowerCase().includes(search));
      }
      return result;
    }

    // 7. Create Analysis
    if (path.endsWith("/api/analyses") && method.toUpperCase() === "POST") {
      const payload = typeof body === "string" ? JSON.parse(body) : body;
      const newEntry = {
        id: Date.now(),
        title: payload?.title || "New Bug Analysis",
        inputType: payload?.inputType || "raw_text",
        rawInput: payload?.rawInput || "Sample bug input description.",
        tags: payload?.tags || "user-created",
        status: "completed",
        severity: "high",
        confidenceScore: 0.85,
        extractedEntities: JSON.stringify({
          component: "API Service",
          triggerAction: payload?.title || "Bug Trigger Action",
          expectedBehavior: "Expected successful operation",
          actualBehavior: "Unexpected failure or unhandled exception",
          environment: { os: "Linux", version: "v1.0.0" },
          errorMessages: ["Unhandled Error: Request failed with status 500"],
          frequency: "intermittent"
        }),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      analyses.unshift(newEntry);
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("bugrepro_mock_analyses", JSON.stringify(analyses));
      }
      return newEntry;
    }

    // 8. Projects List
    if (path.includes("/api/projects") && method.toUpperCase() === "GET") {
      return projects;
    }

    // 9. Tools Mock Fallbacks
    if (path.includes("/api/tools/env-diff")) {
      return {
        verdict: "High Risk Configuration Discrepancy Detected",
        likelihoodScore: 88,
        differences: [
          { key: "JWT_REFRESH_MUTEX_ENABLED", val1: "false", val2: "true", classification: "critical", reasoning: "Mutex lock disabled in target environment causes concurrent refresh collisions." }
        ]
      };
    }

    if (path.includes("/api/tools/nl2test")) {
      return {
        testCode: `// Generated Test Code\ndescribe('Auto Generated Bug Test', () => {\n  it('verifies operation under stress', async () => {\n    expect(true).toBe(true);\n  });\n});`,
        explanation: "Automated test generated from English specification."
      };
    }

    if (path.includes("/api/tools/flaky-detector")) {
      return {
        overallRisk: "medium",
        flakyTests: [
          { testName: "JWT Concurrency Test", riskLevel: "high", reason: "Uses hardcoded setTimeout instead of async waitFor", suggestion: "Replace sleep with deterministic async wait" }
        ]
      };
    }

    if (path.includes("/api/tools/regression-guard")) {
      return {
        verdict: "Moderate Risk",
        regressionScore: 35,
        riskDimensions: [
          { dimension: "Breaking Changes", risk: "low", notes: "Backward compatible API parameters" }
        ]
      };
    }

    if (path.includes("/api/tools/bug-digest")) {
      return {
        summary: "Weekly Bug Reproduction Digest",
        topPatterns: ["Authentication Concurrency", "Session Revocation", "Database Deadlocks"]
      };
    }

    if (path.includes("/api/settings/llm")) {
      return { provider: "groq", model: "llama-3.3-70b-versatile", apiKey: "gsk_********************" };
    }
  } catch (err) {
    console.warn("Global Mock Interceptor Error:", err);
  }

  return undefined;
}

export function initGlobalFetchInterceptor() {
  if (typeof window === "undefined") return;

  const originalFetch = window.fetch;

  window.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const urlStr = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

    try {
      const response = await originalFetch(input, init);
      const contentType = response.headers.get("content-type") || "";

      // Intercept /api/ requests when Vercel returns HTML fallback (index.html) or 404
      if (urlStr.includes("/api/") && (!response.ok || contentType.includes("text/html"))) {
        const mockData = getMockDataForUrl(urlStr, init?.method || "GET", init?.body);
        if (mockData !== undefined) {
          return new Response(JSON.stringify(mockData), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }
      }

      return response;
    } catch (err) {
      if (urlStr.includes("/api/")) {
        const mockData = getMockDataForUrl(urlStr, init?.method || "GET", init?.body);
        if (mockData !== undefined) {
          return new Response(JSON.stringify(mockData), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
      throw err;
    }
  };
}
