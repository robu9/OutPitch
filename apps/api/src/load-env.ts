import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const srcDir = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(srcDir, "..");
const monorepoRoot = path.resolve(apiRoot, "../..");

dotenv.config({ path: path.join(monorepoRoot, ".env") });
dotenv.config({ path: path.join(apiRoot, ".env") });
