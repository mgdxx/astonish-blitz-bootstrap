import http from "node:http";
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const port = Number(process.env.PORT || 8080);
const dataDir = "/data";
const counterPath = `${dataDir}/boot-count.txt`;

await mkdir(dataDir, { recursive: true });
let bootCount = 0;
try {
  bootCount = Number((await readFile(counterPath, "utf8")).trim()) || 0;
} catch {}
bootCount += 1;
await writeFile(counterPath, String(bootCount) + "\n", "utf8");

let pocState = "starting";
let pocExit = null;

const poc = spawn(process.execPath, ["/app/poc.mjs"], {
  env: process.env,
  stdio: ["ignore", "pipe", "pipe"]
});
poc.stdout.on("data", d => process.stdout.write(d));
poc.stderr.on("data", d => process.stderr.write(d));
poc.on("close", code => {
  pocExit = code;
  pocState = code === 0 ? "passed" : "failed";
  console.log(JSON.stringify({ event: "ASTONISH_POC_EXIT", code, state: pocState }));
});

const server = http.createServer((req, res) => {
  const body = JSON.stringify({
    ok: true,
    service: "astonish-blitz-bootstrap",
    bootCount,
    uptimeSeconds: Math.floor(process.uptime()),
    rssMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
    node: process.version,
    arch: process.arch,
    pocState,
    pocExit
  });
  res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
  res.end(body);
});

server.listen(port, "0.0.0.0");

const shutdown = () => {
  try { poc.kill("SIGTERM"); } catch {}
  server.close(() => process.exit(0));
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
