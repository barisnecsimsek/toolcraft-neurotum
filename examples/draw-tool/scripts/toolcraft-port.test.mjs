import assert from "node:assert/strict";
import net from "node:net";
import test from "node:test";

import { findAvailablePort } from "./toolcraft-port.mjs";

function listen(host) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once("error", reject);
    server.listen({ host, port: 0 }, () => {
      resolve(server);
    });
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

test("findAvailablePort skips ports occupied on IPv6 localhost", async (t) => {
  let server;

  try {
    server = await listen("::1");
  } catch (error) {
    if (error?.code === "EAFNOSUPPORT" || error?.code === "EADDRNOTAVAIL") {
      t.skip("IPv6 localhost is not available in this environment.");
      return;
    }

    throw error;
  }

  t.after(() => close(server));

  const address = server.address();
  assert.equal(typeof address, "object");

  const selectedPort = await findAvailablePort(address.port);

  assert.notEqual(
    selectedPort,
    address.port,
    "A port occupied on ::1 must be treated as unavailable for localhost URLs.",
  );
});

test("findAvailablePort skips ports occupied on IPv4 localhost", async (t) => {
  const server = await listen("127.0.0.1");
  t.after(() => close(server));

  const address = server.address();
  assert.equal(typeof address, "object");

  const selectedPort = await findAvailablePort(address.port);

  assert.notEqual(
    selectedPort,
    address.port,
    "A port occupied on 127.0.0.1 must be treated as unavailable for localhost URLs.",
  );
});
