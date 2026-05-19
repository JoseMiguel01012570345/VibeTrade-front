import path from "node:path";
import { fileURLToPath } from "node:url";

const e2eRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const e2eAuthDir = path.join(e2eRoot, ".auth");
export const e2eSessionFile = path.join(e2eAuthDir, "session.json");
export const e2eSellerSessionFile = path.join(e2eAuthDir, "session-seller.json");
export const e2eScenarioFile = path.join(e2eAuthDir, "scenario.json");
