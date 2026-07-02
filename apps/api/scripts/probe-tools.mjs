import { readFileSync } from "fs";
import { Composio } from "@composio/core";

const env = readFileSync("../../.env", "utf8");
const apiKey = env.match(/^COMPOSIO_API_KEY=(.+)$/m)?.[1]?.replace(/^["']|["']$/g, "").trim();
const composio = new Composio({ apiKey });

const accounts = await composio.connectedAccounts.list({ limit: 50 });
console.log("ALL ACCOUNTS:", JSON.stringify(accounts, null, 2));
