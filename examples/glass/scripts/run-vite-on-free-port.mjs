#!/usr/bin/env node

import { spawn } from "node:child_process";

import { findAvailablePort, readPreferredPort } from "./toolcraft-port.mjs";

const viteCommand = process.argv[2] ?? "dev";
const passthroughArgs = process.argv.slice(3).filter((arg) => arg !== "--");
const preferredPort = readPreferredPort([
  "TOOLCRAFT_DEV_PORT",
  "TOOLCRAFT_PORT",
  "PORT",
]);
const port = await findAvailablePort(preferredPort);

if (port !== preferredPort) {
  console.log(`[toolcraft] Port ${preferredPort} is busy; using ${port} instead.`);
}

const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const child = spawn(pnpmCommand, ["exec", "vite", viteCommand, "--port", String(port), ...passthroughArgs], {
  env: {
    ...process.env,
    TOOLCRAFT_ACTIVE_PORT: String(port),
    PORT: String(port),
  },
  stdio: "inherit",
});

const signalExitCodes = {
  SIGINT: 130,
  SIGTERM: 143,
};

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    child.kill(signal);
  });
}

child.on("exit", (code, signal) => {
  if (signal) {
    process.exit(signalExitCodes[signal] ?? 1);
    return;
  }

  process.exit(code ?? 0);
});
