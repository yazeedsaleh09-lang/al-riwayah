/** Server bootstrap entry point (dev/start). Side-effectful: listens on a port. */
import { loadEnv } from "./env";
import { buildServer } from "./server";
import { createLogger } from "./redact-log";

async function main(): Promise<void> {
  const env = loadEnv();
  const log = createLogger();
  const { app, stopTimers } = await buildServer(env);

  await app.listen({ host: env.HOST, port: env.PORT });
  log.log("info", "server_listening", { host: env.HOST, port: env.PORT });

  const shutdown = async (signal: string): Promise<void> => {
    log.log("info", "shutdown", { signal });
    stopTimers();
    await app.close();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("Fatal server error:", err);
  process.exit(1);
});
