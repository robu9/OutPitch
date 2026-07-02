import { readFileSync } from "fs";
import { Composio } from "@composio/core";

const env = readFileSync("../../.env", "utf8");
const apiKey = env.match(/^COMPOSIO_API_KEY=(.+)$/m)?.[1]?.replace(/^["']|["']$/g, "").trim();
const composio = new Composio({ apiKey });

const res = await fetch("https://backend.composio.dev/api/v3/connected_accounts?limit=10", {
  headers: { "x-api-key": apiKey },
});
const data = await res.json();
console.log(JSON.stringify(data, null, 2));
