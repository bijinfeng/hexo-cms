import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const serverStartTimeout = 60_000;
const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function isServerReady(url: string) {
  try {
    const response = await fetch(url, { redirect: "manual" });
    return response.status < 500;
  } catch {
    return false;
  }
}

async function waitForServer(
  url: string,
  timeout: number,
  getStartupError: () => Error | undefined,
  getExitCode: () => number | null,
) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeout) {
    const startupError = getStartupError();

    if (startupError) {
      throw startupError;
    }

    const exitCode = getExitCode();

    if (exitCode !== null) {
      throw new Error(`Dev server exited before becoming ready with code ${exitCode}.`);
    }

    if (await isServerReady(url)) {
      return;
    }

    await delay(250);
  }

  throw new Error(`Timed out waiting for dev server at ${url}.`);
}

async function stopServer(server: ChildProcess) {
  if (server.killed || server.exitCode !== null) {
    return;
  }

  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      if (server.exitCode === null) {
        server.kill("SIGKILL");
      }

      resolve();
    }, 5_000);

    server.once("close", () => {
      clearTimeout(timeout);
      resolve();
    });

    server.kill("SIGTERM");
  });
}

export default async function setup() {
  if (await isServerReady(baseURL)) {
    return;
  }

  let startupError: Error | undefined;
  let exitCode: number | null = null;
  let recentLogs = "";
  const server = spawn("pnpm", ["dev"], {
    cwd: webRoot,
    env: { ...process.env, E2E_BASE_URL: baseURL },
    stdio: ["ignore", "pipe", "pipe"],
  });

  const collectLogs = (chunk: Buffer) => {
    recentLogs = `${recentLogs}${chunk.toString()}`.slice(-4_000);
  };

  server.stdout.on("data", collectLogs);
  server.stderr.on("data", collectLogs);
  server.once("error", (error) => {
    startupError = error;
  });
  server.once("exit", (code) => {
    exitCode = code;
  });

  try {
    await waitForServer(baseURL, serverStartTimeout, () => startupError, () => exitCode);
  } catch (error) {
    await stopServer(server);
    const message = error instanceof Error ? error.message : String(error);

    throw new Error(`${message}\n\nRecent dev server logs:\n${recentLogs}`, { cause: error });
  }

  return () => stopServer(server);
}
