import { readFileSync } from "fs";
import { Composio } from "@composio/core";

const env = readFileSync("../../.env", "utf8");
const apiKey = env.match(/^COMPOSIO_API_KEY=(.+)$/m)?.[1]?.replace(/^["']|["']$/g, "").trim();
const clerkId = process.argv[2] ?? "user_3FrgFdGgRZLPDy1m2wNg7ZHvd0f";

const composio = new Composio({ apiKey });

const accounts = await composio.connectedAccounts.list({ userIds: [clerkId] });
console.log("ACCOUNTS:", JSON.stringify(accounts, null, 2));

const configs = await composio.authConfigs.list({ toolkit: "linkedin" });
console.log("AUTH CONFIGS:", JSON.stringify(configs, null, 2));

try {
  const myInfo = await composio.tools.execute("LINKEDIN_GET_MY_INFO", {
    userId: clerkId,
    arguments: {},
    dangerouslySkipVersionCheck: true,
  });
  console.log("GET_MY_INFO:", JSON.stringify(myInfo, null, 2));

  const data = myInfo.data ?? {};
  const personId =
    data.id ?? data.sub ?? (typeof data.urn === "string" ? data.urn.replace(/^urn:li:person:/, "") : null);

  if (personId) {
    const person = await composio.tools.execute("LINKEDIN_GET_PERSON", {
      userId: clerkId,
      arguments: { person_id: String(personId) },
      dangerouslySkipVersionCheck: true,
    });
    console.log("GET_PERSON:", JSON.stringify(person, null, 2));
  }
} catch (e) {
  console.error("TOOL ERROR:", e);
}
