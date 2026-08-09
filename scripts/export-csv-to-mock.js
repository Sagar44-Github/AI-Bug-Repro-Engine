import fs from "fs";
import path from "path";

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (c === '"') {
        if (next === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else if (c === "\r") {
        if (next === "\n") i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else {
        field += c;
      }
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

const csvPath = path.resolve(process.cwd(), "analyses.csv");
if (!fs.existsSync(csvPath)) {
  console.error("analyses.csv not found!");
  process.exit(1);
}

const fileContent = fs.readFileSync(csvPath, "utf-8");
const rawRows = parseCSV(fileContent);

const headers = rawRows[0].map(h => h.trim().replace(/^"|"$/g, ""));
const headerMap = {};
headers.forEach((h, idx) => { headerMap[h] = idx; });

const dataRows = rawRows.slice(1).filter(r => r.length >= 3 && r.some(cell => cell.trim().length > 0));

console.log(`Exporting ${dataRows.length} rows from analyses.csv to mock-data-store.ts...`);

const parsedAnalyses = dataRows.map((row, idx) => {
  const getVal = (col) => {
    const i = headerMap[col];
    if (i === undefined || i >= row.length) return null;
    const v = row[i];
    if (!v || v.trim() === "" || v === "null") return null;
    return v;
  };

  const rawId = getVal("id");
  const id = rawId ? parseInt(rawId, 10) : idx + 1;
  const title = getVal("title") || "Untitled Bug Analysis";
  const inputType = getVal("input_type") || "raw_text";
  const rawInput = getVal("raw_input") || "";
  const githubUrl = getVal("github_url");
  const codeContext = getVal("code_context");
  const status = getVal("status") || "completed";
  const rawConf = getVal("confidence_score");
  const confidenceScore = rawConf ? parseFloat(rawConf) : 0.85;
  const extractedEntities = getVal("extracted_entities");
  const hypotheses = getVal("hypotheses");
  const reproductionSteps = getVal("reproduction_steps");
  const testCode = getVal("test_code");
  const flowDiagram = getVal("flow_diagram");
  const clarifyingQuestions = getVal("clarifying_questions");
  const tags = getVal("tags");
  const confidenceBreakdown = getVal("confidence_breakdown");
  const severity = getVal("severity") || "high";
  const severityReason = getVal("severity_reason");
  const auditTrail = getVal("audit_trail");
  const testSyntaxStatus = getVal("test_syntax_status") || "verified";
  const fixSuggestions = getVal("fix_suggestions");
  const createdAt = getVal("created_at") || new Date().toISOString();
  const updatedAt = getVal("updated_at") || new Date().toISOString();

  return {
    id,
    title,
    inputType,
    rawInput,
    githubUrl,
    codeContext,
    tags,
    status,
    severity,
    severityReason,
    confidenceScore,
    confidenceBreakdown,
    extractedEntities,
    hypotheses,
    reproductionSteps,
    testCode,
    testSyntaxStatus,
    mermaidDiagram: flowDiagram,
    clarifyingQuestions,
    fixSuggestions,
    auditTrail,
    createdAt,
    updatedAt
  };
});

const mockProjects = [
  {
    id: 1,
    name: "Core Auth & Security",
    description: "Authentication services, session control, OAuth, and security auditing",
    defaultFramework: "jest-ts",
    slackWebhookUrl: null,
    discordWebhookUrl: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 2,
    name: "E-Commerce Checkout Pipeline",
    description: "Cart calculations, payment gateway integrations, and order processing",
    defaultFramework: "vitest",
    slackWebhookUrl: null,
    discordWebhookUrl: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const fileOutput = `// Generated from analyses.csv (${parsedAnalyses.length} entries)

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

export const INITIAL_MOCK_ANALYSES: MockAnalysis[] = ${JSON.stringify(parsedAnalyses, null, 2)};

export const INITIAL_MOCK_PROJECTS: MockProject[] = ${JSON.stringify(mockProjects, null, 2)};
`;

const outputPath = path.resolve(process.cwd(), "artifacts/bug-engine/src/lib/mock-data-store.ts");
fs.writeFileSync(outputPath, fileOutput, "utf-8");
console.log(`Successfully generated ${outputPath} with ${parsedAnalyses.length} entries!`);
