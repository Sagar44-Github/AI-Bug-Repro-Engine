import fs from "fs";
import path from "path";
import { pool } from "@workspace/db";

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
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
        if (next === "\n") {
          i++;
        }
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

async function importCSV() {
  const possiblePaths = [
    path.resolve(process.cwd(), "analyses.csv"),
    path.resolve(process.cwd(), "../analyses.csv"),
    path.resolve(process.cwd(), "scripts/analyses.csv"),
  ];
  let csvPath = possiblePaths.find((p) => fs.existsSync(p));

  if (!csvPath) {
    console.error("analyses.csv file not found at any location:", possiblePaths);
    process.exit(1);
  }
  console.log("Using CSV file at:", csvPath);

  const fileContent = fs.readFileSync(csvPath, "utf-8");
  const rawRows = parseCSV(fileContent);

  if (rawRows.length < 2) {
    console.error("CSV file contains no data rows.");
    process.exit(1);
  }

  const headers = rawRows[0].map((h) => h.trim().replace(/^"|"$/g, ""));
  console.log("Found CSV headers:", headers);

  const headerIndexMap: Record<string, number> = {};
  headers.forEach((h, idx) => {
    headerIndexMap[h] = idx;
  });

  const dataRows = rawRows.slice(1).filter((r) => r.length >= 3 && r.some((cell) => cell.trim().length > 0));
  console.log(`Parsed ${dataRows.length} valid data rows from analyses.csv.`);

  console.log("Truncating analyses table in PGlite database...");
  await pool.query("DELETE FROM analyses;");

  let importedCount = 0;

  for (const row of dataRows) {
    const getVal = (colName: string): string | null => {
      const idx = headerIndexMap[colName];
      if (idx === undefined || idx >= row.length) return null;
      const v = row[idx];
      if (v === undefined || v === null || v.trim() === "" || v === "null") return null;
      return v;
    };

    const rawId = getVal("id");
    const id = rawId ? parseInt(rawId, 10) : undefined;
    const title = getVal("title") ?? "Untitled Analysis";
    const inputType = getVal("input_type") ?? "raw_text";
    const rawInput = getVal("raw_input") ?? "";
    const githubUrl = getVal("github_url");
    const codeContext = getVal("code_context");
    const status = getVal("status") ?? "completed";
    const rawConf = getVal("confidence_score");
    const confidenceScore = rawConf ? parseFloat(rawConf) : null;
    const extractedEntities = getVal("extracted_entities");
    const hypotheses = getVal("hypotheses");
    const reproductionSteps = getVal("reproduction_steps");
    const testCode = getVal("test_code");
    const flowDiagram = getVal("flow_diagram");
    const clarifyingQuestions = getVal("clarifying_questions");
    const tags = getVal("tags");
    const confidenceBreakdown = getVal("confidence_breakdown");
    const severity = getVal("severity");
    const severityReason = getVal("severity_reason");
    const auditTrail = getVal("audit_trail");
    const correlations = getVal("correlations");
    const testSyntaxStatus = getVal("test_syntax_status");
    const autoTags = getVal("auto_tags");
    const rawProjId = getVal("project_id");
    const projectId = rawProjId ? parseInt(rawProjId, 10) : null;
    const fixSuggestions = getVal("fix_suggestions");
    const resolutionStatus = getVal("resolution_status") ?? "open";
    const resolvedBy = getVal("resolved_by");
    const parseDateSafe = (dStr: string | null): string => {
      if (!dStr) return new Date().toISOString();
      const d = new Date(dStr);
      if (!isNaN(d.getTime())) return d.toISOString();
      return new Date().toISOString();
    };

    const rawResolvedAt = getVal("resolved_at");
    const resolvedAt = rawResolvedAt && !isNaN(new Date(rawResolvedAt).getTime()) ? new Date(rawResolvedAt).toISOString() : null;
    const fixDescription = getVal("fix_description");
    const createdAt = parseDateSafe(getVal("created_at"));
    const updatedAt = parseDateSafe(getVal("updated_at"));

    if (id !== undefined && !isNaN(id)) {
      await pool.query(
        `INSERT INTO analyses (
          id, title, input_type, raw_input, github_url, code_context, status, confidence_score,
          extracted_entities, hypotheses, reproduction_steps, test_code, flow_diagram, clarifying_questions,
          tags, confidence_breakdown, severity, severity_reason, audit_trail, correlations,
          test_syntax_status, auto_tags, project_id, fix_suggestions, resolution_status, resolved_by,
          resolved_at, fix_description, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26, $27, $28, $29, $30
        )`,
        [
          id,
          title,
          inputType,
          rawInput,
          githubUrl,
          codeContext,
          status,
          confidenceScore,
          extractedEntities,
          hypotheses,
          reproductionSteps,
          testCode,
          flowDiagram,
          clarifyingQuestions,
          tags,
          confidenceBreakdown,
          severity,
          severityReason,
          auditTrail,
          correlations,
          testSyntaxStatus,
          autoTags,
          projectId,
          fixSuggestions,
          resolutionStatus,
          resolvedBy,
          resolvedAt,
          fixDescription,
          createdAt,
          updatedAt,
        ]
      );
    } else {
      await pool.query(
        `INSERT INTO analyses (
          title, input_type, raw_input, github_url, code_context, status, confidence_score,
          extracted_entities, hypotheses, reproduction_steps, test_code, flow_diagram, clarifying_questions,
          tags, confidence_breakdown, severity, severity_reason, audit_trail, correlations,
          test_syntax_status, auto_tags, project_id, fix_suggestions, resolution_status, resolved_by,
          resolved_at, fix_description, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19,
          $20, $21, $22, $23, $24, $25, $26, $27, $28, $29
        )`,
        [
          title,
          inputType,
          rawInput,
          githubUrl,
          codeContext,
          status,
          confidenceScore,
          extractedEntities,
          hypotheses,
          reproductionSteps,
          testCode,
          flowDiagram,
          clarifyingQuestions,
          tags,
          confidenceBreakdown,
          severity,
          severityReason,
          auditTrail,
          correlations,
          testSyntaxStatus,
          autoTags,
          projectId,
          fixSuggestions,
          resolutionStatus,
          resolvedBy,
          resolvedAt,
          fixDescription,
          createdAt,
          updatedAt,
        ]
      );
    }

    importedCount++;
  }

  // Update sequence to max id
  await pool.query("SELECT setval('analyses_id_seq', COALESCE((SELECT MAX(id) FROM analyses), 1));");

  console.log(`Successfully imported ALL ${importedCount} records from analyses.csv!`);
  process.exit(0);
}

importCSV().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
