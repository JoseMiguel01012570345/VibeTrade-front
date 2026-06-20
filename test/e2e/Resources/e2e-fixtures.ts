import path from "node:path";
import { fileURLToPath } from "node:url";

const FIXTURES_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures",
);

export const FIXTURE_PNG = path.join(FIXTURES_DIR, "pixel.png");
export const FIXTURE_PDF = path.join(FIXTURES_DIR, "tiny.pdf");
