import dotenv from "dotenv";
import path from "path";

// This package compiles to CommonJS (NodeNext + no "type":"module"), so __dirname
// is available at runtime under both tsx (dev) and the compiled build.
const srcDir = __dirname;
const apiRoot = path.resolve(srcDir, "..");
const monorepoRoot = path.resolve(apiRoot, "../..");

dotenv.config({ path: path.join(monorepoRoot, ".env") });
dotenv.config({ path: path.join(apiRoot, ".env") });
