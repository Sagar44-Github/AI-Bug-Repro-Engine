import fs from "node:fs";
import path from "node:path";

const src = path.resolve("artifacts/bug-engine/dist/public");
const dest = path.resolve("public");

console.log(`Copying build from ${src} to ${dest}...`);

if (!fs.existsSync(src)) {
  console.error(`ERROR: Source directory ${src} does not exist!`);
  process.exit(1);
}

fs.mkdirSync(dest, { recursive: true });
fs.cpSync(src, dest, { recursive: true });

console.log("Successfully copied build artifacts to root public directory.");
