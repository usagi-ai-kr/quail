import { spawnSync } from "node:child_process";

const WORKER_NAME = process.env.CF_WORKER_NAME || "quail-solid-hello";
const REQUIRED_RUNTIME_SECRETS = ["PASSWORD", "PASETO_KEY"];

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function readSecretNames(stdout) {
  const start = stdout.indexOf("[");
  if (start < 0) throw new Error("Wrangler did not return a JSON array");
  const response = JSON.parse(stdout.slice(start));
  const entries = Array.isArray(response) ? response : response?.result;
  if (!Array.isArray(entries)) throw new Error("Wrangler response has no secret list");
  return entries.map((entry) => entry?.name).filter((name) => typeof name === "string");
}

function preflight() {
  const result = spawnSync("pnpm", ["exec", "wrangler", "secret", "list", "--name", WORKER_NAME, "--format=json"], {
    encoding: "utf8",
    env: process.env,
    maxBuffer: 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    fail(`Could not read Worker secret names for ${WORKER_NAME}; check Wrangler authentication and Workers Scripts read permission.`);
    return;
  }

  let names;
  try {
    names = readSecretNames(result.stdout);
  } catch {
    fail(`Could not parse Worker secret names for ${WORKER_NAME}; Wrangler output was suppressed.`);
    return;
  }

  const missingRuntimeSecrets = REQUIRED_RUNTIME_SECRETS.filter((name) => !names.includes(name));
  if (missingRuntimeSecrets.length > 0) {
    fail(`Missing Cloudflare runtime secret names on Worker ${WORKER_NAME}: ${missingRuntimeSecrets.join(", ")}`);
    console.error("Add these values directly in Cloudflare. Secret values are never read or printed by this check.");
    return;
  }

  console.log(`Cloudflare runtime secret names present on ${WORKER_NAME}: ${REQUIRED_RUNTIME_SECRETS.join(", ")}.`);
}

async function verifyHttp() {
  const configuredUrl = process.env.DEPLOY_URL || "https://quail.qus0in.dev";

  let origin;
  try {
    origin = new URL(configuredUrl).origin;
  } catch {
    return fail("DEPLOY_URL must be an absolute HTTP(S) URL.");
  }

  const checks = [
    ["/", 200],
    ["/assets/login.js", 200],
    ["/assets/login.css", 200],
    ["/api/content", 401],
  ];
  for (const [path, expectedStatus] of checks) {
    let response;
    try {
      response = await fetch(new URL(path, origin), { redirect: "error" });
    } catch {
      fail(`HTTP verification could not reach ${origin}${path}.`);
      return;
    }
    if (response.status !== expectedStatus) {
      fail(`HTTP verification expected ${expectedStatus} from ${path}, received ${response.status}.`);
      return;
    }
    if (path.startsWith("/api/") && !response.headers.get("Cache-Control")?.includes("no-store")) {
      fail(`${path} did not return Cache-Control: no-store.`);
      return;
    }
  }

  console.log(`Public UI assets return 200 and unauthenticated /api/content returns 401 at ${origin}.`);
}

const mode = process.argv.slice(2).find((argument) => argument !== "--");
if (mode === "preflight") {
  preflight();
} else if (mode === "http") {
  await verifyHttp();
} else {
  fail("Usage: node scripts/deploy-verify.mjs <preflight|http>");
}
