import http from "http";

interface TestResult {
  name: string;
  endpoint: string;
  status: "PASS" | "FAIL";
  statusCode?: number;
  details?: string;
}

const results: TestResult[] = [];

async function request(method: string, url: string, body?: any): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          let parsed = raw;
          try {
            parsed = JSON.parse(raw);
          } catch (e) {}
          resolve({ status: res.statusCode || 0, data: parsed });
        });
      }
    );

    req.on("error", (err) => reject(err));
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runVerification() {
  console.log("=== STARTING COMPREHENSIVE POINT-TO-POINT VERIFICATION ===\n");

  // 1. Health check
  try {
    const res = await request("GET", "http://localhost:8080/api/healthz");
    const pass = res.status === 200 && res.data.status === "ok";
    results.push({
      name: "API Health Check Endpoint",
      endpoint: "GET /api/healthz",
      status: pass ? "PASS" : "FAIL",
      statusCode: res.status,
      details: JSON.stringify(res.data),
    });
  } catch (e: any) {
    results.push({ name: "API Health Check Endpoint", endpoint: "GET /api/healthz", status: "FAIL", details: e.message });
  }

  // 2. LLM Config Check
  try {
    const res = await request("GET", "http://localhost:8080/api/settings/llm");
    const pass = res.status === 200 && res.data.apiKeySet === true;
    results.push({
      name: "LLM Configuration & Groq Key Presence",
      endpoint: "GET /api/settings/llm",
      status: pass ? "PASS" : "FAIL",
      statusCode: res.status,
      details: `Provider: ${res.data.provider}, Model: ${res.data.model}, Groq Key Active: ${res.data.apiKeySet} (${res.data.apiKeyPreview})`,
    });
  } catch (e: any) {
    results.push({ name: "LLM Configuration", endpoint: "GET /api/settings/llm", status: "FAIL", details: e.message });
  }

  // 3. LLM Connection Test (Groq API Key working test)
  try {
    const res = await request("POST", "http://localhost:8080/api/settings/llm/test");
    const pass = res.status === 200 && res.data.ok === true;
    results.push({
      name: "Live Groq AI API Key Connection Test",
      endpoint: "POST /api/settings/llm/test",
      status: pass ? "PASS" : "FAIL",
      statusCode: res.status,
      details: pass ? `Latency: ${res.data.latencyMs}ms, Model: ${res.data.model}` : `Error: ${res.data.error}`,
    });
  } catch (e: any) {
    results.push({ name: "Live Groq AI API Key Connection Test", endpoint: "POST /api/settings/llm/test", status: "FAIL", details: e.message });
  }

  // 4. Fetch Analyses List
  let firstAnalysisId = 1;
  try {
    const res = await request("GET", "http://localhost:8080/api/analyses");
    const count = Array.isArray(res.data) ? res.data.length : 0;
    if (count > 0 && res.data[0].id) {
      firstAnalysisId = res.data[0].id;
    }
    results.push({
      name: "Fetch Analyses History List",
      endpoint: "GET /api/analyses",
      status: res.status === 200 && count >= 50 ? "PASS" : "FAIL",
      statusCode: res.status,
      details: `Total records returned: ${count}`,
    });
  } catch (e: any) {
    results.push({ name: "Fetch Analyses History List", endpoint: "GET /api/analyses", status: "FAIL", details: e.message });
  }

  // 5. Fetch Single Analysis Detail
  try {
    const res = await request("GET", `http://localhost:8080/api/analyses/${firstAnalysisId}`);
    const pass = res.status === 200 && res.data.id === firstAnalysisId;
    results.push({
      name: "Fetch Analysis Detail Record",
      endpoint: `GET /api/analyses/${firstAnalysisId}`,
      status: pass ? "PASS" : "FAIL",
      statusCode: res.status,
      details: pass ? `Title: "${res.data.title}", Status: ${res.data.status}` : `Error: ${JSON.stringify(res.data)}`,
    });
  } catch (e: any) {
    results.push({ name: "Fetch Analysis Detail Record", endpoint: `/api/analyses/:id`, status: "FAIL", details: e.message });
  }

  // 6. Stats Summary Endpoint
  try {
    const res = await request("GET", "http://localhost:8080/api/analyses/stats/summary");
    const pass = res.status === 200 && typeof res.data.total === "number";
    results.push({
      name: "Dashboard Stats Summary Endpoint",
      endpoint: "GET /api/analyses/stats/summary",
      status: pass ? "PASS" : "FAIL",
      statusCode: res.status,
      details: pass ? `Total: ${res.data.total}, Completed: ${res.data.completed}, AvgConfidence: ${res.data.avgConfidence}` : "Invalid response",
    });
  } catch (e: any) {
    results.push({ name: "Dashboard Stats Summary Endpoint", endpoint: "GET /api/analyses/stats/summary", status: "FAIL", details: e.message });
  }

  // 7. Trends Analytics Endpoint
  try {
    const res = await request("GET", "http://localhost:8080/api/analyses/trends?days=30");
    const pass = res.status === 200 && Array.isArray(res.data);
    results.push({
      name: "Analytics Trends Endpoint",
      endpoint: "GET /api/analyses/trends",
      status: pass ? "PASS" : "FAIL",
      statusCode: res.status,
      details: pass ? `Data points: ${res.data.length}` : "Invalid response",
    });
  } catch (e: any) {
    results.push({ name: "Analytics Trends Endpoint", endpoint: "GET /api/analyses/trends", status: "FAIL", details: e.message });
  }

  // 8. Projects Endpoint
  try {
    const res = await request("GET", "http://localhost:8080/api/projects");
    const pass = res.status === 200 && Array.isArray(res.data);
    results.push({
      name: "Projects Management Endpoint",
      endpoint: "GET /api/projects",
      status: pass ? "PASS" : "FAIL",
      statusCode: res.status,
      details: pass ? `Projects count: ${res.data.length}` : "Invalid response",
    });
  } catch (e: any) {
    results.push({ name: "Projects Management Endpoint", endpoint: "GET /api/projects", status: "FAIL", details: e.message });
  }

  // 9. Create New Bug Analysis (POST /api/analyses)
  let createdId: number | null = null;
  try {
    const res = await request("POST", "http://localhost:8080/api/analyses", {
      title: "Deployment Verification Test Bug",
      inputType: "raw_text",
      rawInput: "Verification check for automated deployment workflow.",
    });
    const pass = res.status === 201 && res.data.id;
    if (pass) createdId = res.data.id;
    results.push({
      name: "Create Bug Analysis Endpoint",
      endpoint: "POST /api/analyses",
      status: pass ? "PASS" : "FAIL",
      statusCode: res.status,
      details: pass ? `Created analysis ID: ${createdId}` : `Failed: ${JSON.stringify(res.data)}`,
    });
  } catch (e: any) {
    results.push({ name: "Create Bug Analysis Endpoint", endpoint: "POST /api/analyses", status: "FAIL", details: e.message });
  }

  // 10. Delete Test Bug Analysis (DELETE /api/analyses/:id)
  if (createdId) {
    try {
      const res = await request("DELETE", `http://localhost:8080/api/analyses/${createdId}`);
      const pass = res.status === 204 || res.status === 200;
      results.push({
        name: "Delete Analysis Endpoint",
        endpoint: `DELETE /api/analyses/${createdId}`,
        status: pass ? "PASS" : "FAIL",
        statusCode: res.status,
        details: pass ? `Successfully cleaned up test record ${createdId}` : `Status: ${res.status}`,
      });
    } catch (e: any) {
      results.push({ name: "Delete Analysis Endpoint", endpoint: "DELETE /api/analyses/:id", status: "FAIL", details: e.message });
    }
  }

  // 11. Frontend Proxy Verification (Port 5000)
  try {
    const res = await request("GET", "http://localhost:5000/api/analyses");
    const pass = res.status === 200 && Array.isArray(res.data);
    results.push({
      name: "Frontend Vite Server API Proxy (Port 5000)",
      endpoint: "GET http://localhost:5000/api/analyses",
      status: pass ? "PASS" : "FAIL",
      statusCode: res.status,
      details: pass ? `Proxied ${res.data.length} records correctly` : "Proxy check failed",
    });
  } catch (e: any) {
    results.push({ name: "Frontend Vite Server API Proxy", endpoint: "GET http://localhost:5000/api/analyses", status: "FAIL", details: e.message });
  }

  console.log("=== VERIFICATION SUMMARY RESULTS ===");
  console.table(results);

  const failedCount = results.filter((r) => r.status === "FAIL").length;
  if (failedCount > 0) {
    console.error(`\n❌ ${failedCount} verification check(s) failed.`);
    process.exit(1);
  } else {
    console.log(`\n✅ ALL ${results.length} POINT-TO-POINT VERIFICATION CHECKS PASSED PERFECTLY!`);
    process.exit(0);
  }
}

runVerification().catch((e) => {
  console.error("Verification error:", e);
  process.exit(1);
});
