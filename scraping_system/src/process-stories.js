import fs from "node:fs/promises";
import path from "node:path";

import { OUTPUT_DEFAULT_PATH } from "./config/sites.js";
import { processNewsPayload } from "./lib/story-processor.js";
import { writeJsonFile } from "./lib/utils.js";

function parseProcessorArgs(argv) {
  const args = {
    input: OUTPUT_DEFAULT_PATH,
    output: OUTPUT_DEFAULT_PATH
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if ((token === "--input" || token === "-i") && argv[index + 1]) {
      args.input = argv[index + 1];
      index += 1;
      continue;
    }

    if ((token === "--output" || token === "-o") && argv[index + 1]) {
      args.output = argv[index + 1];
      index += 1;
    }
  }

  return args;
}

async function main() {
  const args = parseProcessorArgs(process.argv.slice(2));
  const inputPath = path.resolve(args.input);
  const raw = await fs.readFile(inputPath, "utf8");
  const payload = JSON.parse(raw);
  const processed = processNewsPayload(payload);
  const outputPath = await writeJsonFile(args.output, processed);

  process.stdout.write(`${JSON.stringify(processed, null, 2)}\n`);
  process.stderr.write(`Processed stories saved to ${outputPath}\n`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
