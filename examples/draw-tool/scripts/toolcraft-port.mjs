import net from "node:net";

export const DEFAULT_TOOLCRAFT_PORT = 3002;
const LOOPBACK_HOSTS = ["127.0.0.1", "::1"];

export function readPreferredPort(names, fallback = DEFAULT_TOOLCRAFT_PORT, env = process.env) {
  for (const name of names) {
    const value = env[name];

    if (value == null || value === "") {
      continue;
    }

    const port = Number(value);

    if (Number.isInteger(port) && port > 0 && port <= 65_535) {
      return port;
    }
  }

  return fallback;
}

export function isPortAvailable(port, host) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.unref();
    server.once("error", () => {
      resolve(false);
    });
    server.listen({ host, port }, () => {
      server.close(() => {
        resolve(true);
      });
    });
  });
}

export async function isPortAvailableOnLoopback(port) {
  const results = await Promise.all(LOOPBACK_HOSTS.map((host) => isPortAvailable(port, host)));

  return results.every(Boolean);
}

export async function findAvailablePort(startPort = DEFAULT_TOOLCRAFT_PORT) {
  for (let port = startPort; port <= 65_535; port += 1) {
    if (await isPortAvailableOnLoopback(port)) {
      return port;
    }
  }

  throw new Error(`No free port found at or above ${startPort}.`);
}
