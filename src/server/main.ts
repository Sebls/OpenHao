import http from "node:http";
import type { AddressInfo } from "node:net";
import { scan } from "./catalog.ts";
import { handleRequest } from "./handler.ts";
const port = Number(process.env.PORT || 4173);
scan();
const timer = setInterval(scan, 2000);
timer.unref();
const server = http.createServer(handleRequest);
server.on("close", () => clearInterval(timer));
server.on("error", (e) => {
  console.error(
    ("code" in e && e.code) === "EADDRINUSE"
      ? "That port is already in use. Open the existing library, or choose another PORT."
      : `The library could not start: ${e instanceof Error ? e.message : String(e)}`,
  );
  process.exitCode = 1;
});
server.listen(port, "127.0.0.1", () =>
  console.log(
    `Study library: http://localhost:${(server.address() as AddressInfo).port}\nKeep this window open. Press Ctrl+C to stop.`,
  ),
);
