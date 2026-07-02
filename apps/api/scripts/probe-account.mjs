import { readFileSync } from "fs";
import { Composio } from "@composio/core";

const env = readFileSync("../../.env", "utf8");
const apiKey = env.match(/^COMPOSIO_API_KEY=(.+)$/m)?.[1]?.replace(/^["']|["']$/g, "").trim();
const composio = new Composio({ apiKey });

const account = await composio.connectedAccounts.get("ca_HpFazqYI-tsM");
console.log("ACCOUNT:", JSON.stringify(account, null, 2));

// Try execute with entity id from account if available
const userIds = [
  "user_3FrgFdGgRZLPDy1m2wNg7ZHvd0f",
  account.userId,
  account.entityId,
  account.wordId,
].filter(Boolean);

for (const userId of [...new Set(userIds)]) {
  try {
    const myInfo = await composio.tools.execute("LINKEDIN_GET_MY_INFO", {
      userId,
      arguments: {},
      dangerouslySkipVersionCheck: true,
    });
    console.log(`SUCCESS for userId=${userId}:`, JSON.stringify(myInfo, null, 2));
  } catch (e) {
    console.log(`FAIL for userId=${userId}:`, e.message?.slice(0, 200));
  }
}
