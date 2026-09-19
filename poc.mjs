import { mkdir, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";

const token = process.env.ASTONISH_GITHUB_TOKEN;
if (!token) {
  console.error(JSON.stringify({event:"ASTONISH_POC",ok:false,step:"token",code:"TOKEN_MISSING"}));
  process.exit(1);
}

const repos = [
  "astonish-subscription-renewal",
  "trello-subscription-renewal",
  "astonish-vip"
];

async function repoRoot(repo) {
  const r = await fetch(`https://api.github.com/repos/mgdxx/${repo}/contents`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "astonish-blitz-bootstrap"
    },
    signal: AbortSignal.timeout(15000)
  });
  return {repo, ok:r.ok, status:r.status};
}

function run(cmd, args, cwd, timeoutMs = 180000) {
  return new Promise((resolve) => {
    console.log(JSON.stringify({event:"ASTONISH_POC_STEP_START",cmd,args}));
    const child = spawn(cmd, args, {
      cwd,
      env: {
        ...process.env,
        ASTONISH_LIVE_SEND:"false",
        ASTONISH_OPERATOR_LIVE:"false",
        ASTONISH_CONTROL_REPLIES_LIVE:"false",
        ASTONISH_CONTROL_STATUS_LIVE:"false",
        ASTONISH_CONTROL_SCHEDULED_STATUS_LIVE:"false",
        ASTONISH_LIVE_TRELLO:"false",
        ASTONISH_ALLOW_TRELLO_READS:"false",
        ASTONISH_SUMMARY_PROVIDER:"none"
      },
      stdio:["ignore","pipe","pipe"]
    });
    let out = "";
    let err = "";
    child.stdout.on("data", d => { out = (out + d).slice(-4000); });
    child.stderr.on("data", d => { err = (err + d).slice(-4000); });
    const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
    child.on("close", code => {
      clearTimeout(timer);
      resolve({ok:code===0, code, out, err});
    });
  });
}

const checks = await Promise.all(repos.map(repoRoot));
console.log(JSON.stringify({event:"PRIVATE_REPO_ACCESS",checks}));

if (!checks.find(x => x.repo==="astonish-subscription-renewal")?.ok) {
  console.error(JSON.stringify({event:"ASTONISH_POC",ok:false,step:"repo-access"}));
  process.exit(1);
}

const root = "/tmp/astonish-poc";
const archive = "/tmp/astonish.tgz";
await rm(root,{recursive:true,force:true});
await rm(archive,{force:true});
await mkdir(root,{recursive:true});

const tarball = await fetch("https://api.github.com/repos/mgdxx/astonish-subscription-renewal/tarball/main", {
  headers: {
    Authorization: `Bearer ${token}`,
    Accept:"application/vnd.github+json",
    "X-GitHub-Api-Version":"2022-11-28",
    "User-Agent":"astonish-blitz-bootstrap"
  },
  redirect:"follow",
  signal:AbortSignal.timeout(30000)
});
if (!tarball.ok) {
  console.error(JSON.stringify({event:"ASTONISH_POC",ok:false,step:"download",status:tarball.status}));
  process.exit(1);
}
await writeFile(archive, Buffer.from(await tarball.arrayBuffer()));

for (const step of [
  ["extract","tar",["-xzf",archive,"-C",root,"--strip-components=1"],60000],
  ["npm-ci-prod","npm",["ci","--omit=dev","--no-audit","--no-fund"],180000],
  ["tsx-runtime","npm",["install","--no-save","--package-lock=false","--omit=dev","tsx@4.20.5"],180000],
  ["baileys-patch","npm",["run","check:baileys-patch"],120000],
  ["tsx-smoke","./node_modules/.bin/tsx",["--version"],30000]
]) {
  const [name, cmd, args, timeout] = step;
  const result = await run(cmd,args,root,timeout);
  console.log(JSON.stringify({
    event:"ASTONISH_POC_STEP",
    step:name,
    ok:result.ok,
    code:result.code,
    ...(result.ok ? {} : {stderr:result.err.slice(-1200)})
  }));
  if (!result.ok) process.exit(1);
}

console.log(JSON.stringify({
  event:"ASTONISH_POC_READY",
  ok:true,
  note:"No WhatsApp session, Trello mutation, customer data, or live action was used."
}));

setInterval(() => {}, 60_000);
