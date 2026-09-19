import http from "node:http";
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

async function checkPrivateRepo(repo) {
  const token = process.env.ASTONISH_GITHUB_TOKEN;
  if (!token) return { repo, ok: false, status: "TOKEN_MISSING" };

  try {
    const response = await fetch(
      `https://api.github.com/repos/mgdxx/${repo}/contents/package.json`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "astonish-blitz-bootstrap"
        },
        signal: AbortSignal.timeout(10_000)
      }
    );
    return { repo, ok: response.ok, status: response.status };
  } catch {
    return { repo, ok: false, status: "NETWORK_ERROR" };
  }
}

const repoChecks = await Promise.all([
  checkPrivateRepo("astonish-subscription-renewal"),
  checkPrivateRepo("trello-subscription-renewal"),
  checkPrivateRepo("astonish-vip")
]);

console.log(JSON.stringify({
  event: "PRIVATE_REPO_ACCESS",
  checks: repoChecks
}));

const server = http.createServer((req, res) => {
  const body = JSON.stringify({
    ok: true,
    service: "astonish-blitz-bootstrap",
    bootCount,
    uptimeSeconds: Math.floor(process.uptime()),
    rssMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
    node: process.version,
    arch: process.arch,
    privateRepoAccess: repoChecks
  });
  res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
  res.end(body);
});

server.listen(port, "0.0.0.0");

const shutdown = () => server.close(() => process.exit(0));
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
