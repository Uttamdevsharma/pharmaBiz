import { swaggerSpec } from "../src/docs/index";

const json = JSON.stringify(swaggerSpec);
const refRegex = /"\$ref":\s*"#\/components\/schemas\/([^"]+)"/g;
const refs: string[] = [];
let match;
while ((match = refRegex.exec(json)) !== null) {
  refs.push(match[1]);
}

const schemaKeys = new Set(Object.keys(swaggerSpec.components.schemas));
const missing = [...new Set(refs.filter((r) => !schemaKeys.has(r)))];

console.log("==========================================");
console.log("OpenAPI Title:", swaggerSpec.info.title);
console.log("OpenAPI Version:", swaggerSpec.openapi);
console.log("Total Paths:", Object.keys(swaggerSpec.paths).length);
console.log("Total Components Schemas:", schemaKeys.size);
console.log("Total Tags:", swaggerSpec.tags.length);
console.log("Total $ref occurrences:", refs.length);

if (missing.length > 0) {
  console.error("ERROR: Missing Schema References found:", missing);
  process.exit(1);
} else {
  console.log("SUCCESS: 100% of $ref schema definitions resolved correctly!");
}

let operationCount = 0;
for (const [path, methods] of Object.entries(swaggerSpec.paths)) {
  operationCount += Object.keys(methods).length;
}
console.log("Total Documented Endpoints/Operations:", operationCount);
console.log("==========================================");
