// Own the server lifecycle directly so Windows does not leave npm shell children
// running after Playwright exits. This serves the existing production build.
import next from "next";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const app = next({ dev: false, hostname: "127.0.0.1", port: 3000 });
let server;
let exitCode = 1;
try {
  await app.prepare();
  server = createServer(app.getRequestHandler());
  server.listen(3000, "127.0.0.1");
  await once(server, "listening");
  const child = spawn(
    process.execPath,
    [require.resolve("@playwright/test/cli"), "test", ...process.argv.slice(2)],
    { stdio: "inherit", env: process.env },
  );
  const [code] = await once(child, "exit");
  exitCode = code ?? 1;
} catch (error) {
  console.error(error);
} finally {
  server?.closeAllConnections();
  if (server?.listening) await new Promise((resolve) => server.close(resolve));
  await app.close();
}
process.exit(exitCode);
