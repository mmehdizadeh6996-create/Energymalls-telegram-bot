import dns from "node:dns";
import app from "./app";
import { logger } from "./lib/logger";
import { startTelegramBot } from "./telegram-bot";

// Prefer IPv4 when resolving hostnames. In some deployment networks IPv6 is
// advertised but not routable, so Node's dual-stack "happy eyeballs" hangs and
// outbound calls to api.telegram.org fail with ETIMEDOUT (AggregateError).
// Forcing IPv4-first makes the Telegram webhook/API calls connect reliably.
dns.setDefaultResultOrder("ipv4first");

startTelegramBot();

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
