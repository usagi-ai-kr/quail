#!/usr/bin/env node
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { generateKeys } from "paseto-ts/v4";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const SECRET_NAME = "PASETO_KEY";
export const WORKER_NAME = "quail-solid-hello";
export const WRANGLER_ARGS = [
  "exec",
  "wrangler",
  "secret",
  "put",
  SECRET_NAME,
  "--name",
  WORKER_NAME,
];

const KEY_PATTERN = /^k4\.local\.[A-Za-z0-9_-]{43}$/;

export function isValidPasetoLocalKey(value) {
  return typeof value === "string" && KEY_PATTERN.test(value);
}

export async function generatePasetoKey(generateKey = () => generateKeys("local")) {
  const key = await generateKey();
  if (!isValidPasetoLocalKey(key)) {
    throw new Error("Generated PASETO key is not a valid k4.local PASERK");
  }
  return key;
}

export async function provisionPasetoKey(dependencies = {}) {
  const generateKey = dependencies.generateKey ?? (() => generateKeys("local"));
  const spawnProcess = dependencies.spawn ?? spawn;
  const stdout = dependencies.stdout ?? process.stdout;
  const stderr = dependencies.stderr ?? process.stderr;

  const key = await generatePasetoKey(generateKey);

  const child = spawnProcess("pnpm", WRANGLER_ARGS, {
    cwd: REPO_ROOT,
    stdio: ["pipe", "pipe", "pipe"],
    shell: false,
  });

  // Consume Wrangler output without forwarding it. This prevents a secret from
  // being split across chunks and leaked to the terminal.
  child.stdout.on("data", () => {});
  child.stderr.on("data", () => {});

  let stdinError = null;
  const recordStdinError = (error) => {
    if (error && !stdinError) stdinError = error;
  };
  child.stdin.on("error", recordStdinError);
  child.stdin.write(`${key}\n`, recordStdinError);
  child.stdin.end();

  let closeResult;
  try {
    closeResult = await new Promise((resolve, reject) => {
      child.on("error", reject);
      child.on("close", (code, signal) => resolve({ code, signal }));
    });
  } catch (error) {
    throw new Error(`failed to start wrangler: ${error.code ?? "unknown"}`);
  }

  if (stdinError) {
    throw new Error(`failed to write secret to wrangler: ${stdinError.code ?? "EPIPE"}`);
  }
  if (closeResult.signal) {
    throw new Error(`wrangler terminated by signal ${closeResult.signal}`);
  }
  if (closeResult.code !== 0) {
    throw new Error(`wrangler secret put failed with exit code ${closeResult.code}`);
  }

  stdout.write(`Configured ${SECRET_NAME} for ${WORKER_NAME}\n`);
  return { exitCode: 0 };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await provisionPasetoKey();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}