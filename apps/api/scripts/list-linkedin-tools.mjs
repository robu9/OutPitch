import { readFileSync } from "fs";
import { Composio } from "@composio/core";

const env = readFileSync("../../.env", "utf8");
const match = env.match(/^COMPOSIO_API_KEY=(.+)$/m);
const apiKey = match?.[1]?.replace(/^["']|["']$/g, "").trim();

if (!apiKey) {
  console.error("No COMPOSIO_API_KEY");
  process.exit(1);
}

const composio = new Composio({ apiKey });
const result = await composio.tools.list({ toolkit: "linkedin", limit: 100 });
const items = result.items ?? result;

for (const t of items) {
  console.log(`${t.slug ?? t.name}: ${(t.description ?? "").slice(0, 150)}`);
}
