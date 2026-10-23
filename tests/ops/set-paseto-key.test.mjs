import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { generateKeys } from "paseto-ts/v4";
import {
  SECRET_NAME,
  WORKER_NAME,
  WRANGLER_ARGS,
  generatePasetoKey,
  isValidPasetoLocalKey,
  provisionPasetoKey,
} from "../../scripts/set-paseto-key.mjs";

const VALID_KEY = `k4.local.${"A".repeat(43)}`;

function createFakeChild({ exitCode = 0, signal = null, stdoutChunks = [], stderrChunks = [] } = {}) {
  const child = new EventEmitter();
  const stdinChunks = [];
  const stdin = new EventEmitter();
  stdin.write = (chunk, callback) => {
    stdinChunks.push(chunk);
    if (callback) callback();
  };
  stdin.end = () => {
    stdin.ended = true;
  };
  stdin.ended = false;
  stdin.stdinChunks = stdinChunks;
  child.stdin = stdin;
  child.stdinChunks = stdinChunks;
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.stdinChunks = stdinChunks;

  process.nextTick(() => {
    for (const chunk of stdoutChunks) child.stdout.emit("data", Buffer.from(chunk));
    for (const chunk of stderrChunks) child.stderr.emit("data", Buffer.from(chunk));
    child.emit("close", exitCode, signal);
  });

  return child;
}

test("isValidPasetoLocalKey uses the app-compatible format", () => {
  assert.equal(isValidPasetoLocalKey(VALID_KEY), true);
  assert.equal(isValidPasetoLocalKey("k4.local.too-short"), false);
  assert.equal(isValidPasetoLocalKey("k4.public.A"), false);
});

test("generatePasetoKey validates real generated keys without printing them", async () => {
  const key = await generatePasetoKey();
  assert.match(key, /^k4\.local\.[A-Za-z0-9_-]{43}$/);
});

test("provision spawns wrangler with the explicit target, repo cwd, and shell disabled", async () => {
  const child = createFakeChild();
  const calls = [];

  await provisionPasetoKey({
    generateKey: async () => VALID_KEY,
    spawn: (command, args, options) => {
      calls.push({ command, args, options });
      return child;
    },
    stdout: { write() {} },
    stderr: { write() {} },
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].command, "pnpm");
  assert.deepEqual(calls[0].args, WRANGLER_ARGS);
  assert.equal(calls[0].options.shell, false);
  assert.match(calls[0].options.cwd, /quail$/);
  assert.equal(calls[0].args.includes("--name"), true);
  assert.equal(calls[0].args.at(-1), WORKER_NAME);
});

test("provision writes the generated key to stdin exactly once", async () => {
  const child = createFakeChild();

  await provisionPasetoKey({
    generateKey: async () => VALID_KEY,
    spawn: () => child,
    stdout: { write() {} },
    stderr: { write() {} },
  });

  assert.deepEqual(child.stdinChunks, [`${VALID_KEY}\n`]);
  assert.equal(child.stdin.ended, true);
});

test("provision forwards no Wrangler output, including split key chunks", async () => {
  const child = createFakeChild({
    stdoutChunks: [VALID_KEY.slice(0, 10), VALID_KEY.slice(10)],
    stderrChunks: ["diagnostic"],
  });
  const stdoutWrites = [];
  const stderrWrites = [];

  await provisionPasetoKey({
    generateKey: async () => VALID_KEY,
    spawn: () => child,
    stdout: { write(chunk) { stdoutWrites.push(String(chunk)); } },
    stderr: { write(chunk) { stderrWrites.push(String(chunk)); } },
  });

  assert.equal(stdoutWrites.join("").includes(VALID_KEY), false);
  assert.equal(stderrWrites.join("").includes(VALID_KEY), false);
  assert.equal(stdoutWrites.some((chunk) => chunk.includes(VALID_KEY.slice(0, 10))), false);
  assert.deepEqual(stdoutWrites, [`Configured ${SECRET_NAME} for ${WORKER_NAME}\n`]);
  assert.deepEqual(stderrWrites, []);
});

test("provision propagates wrangler failure exit codes without output", async () => {
  const child = createFakeChild({ exitCode: 1 });

  await assert.rejects(
    () => provisionPasetoKey({
      generateKey: async () => VALID_KEY,
      spawn: () => child,
      stdout: { write() {} },
      stderr: { write() {} },
    }),
    /exit code 1/,
  );
});

test("provision propagates termination signals", async () => {
  const child = createFakeChild({ exitCode: null, signal: "SIGTERM" });

  await assert.rejects(
    () => provisionPasetoKey({
      generateKey: async () => VALID_KEY,
      spawn: () => child,
      stdout: { write() {} },
      stderr: { write() {} },
    }),
    /terminated by signal SIGTERM/,
  );
});

test("provision propagates spawn errors without leaking the key", async () => {
  const child = new EventEmitter();
  const stdin = new EventEmitter();
  stdin.write = (chunk, callback) => {
    if (callback) callback();
  };
  stdin.end = () => {};
  child.stdin = stdin;
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();

  process.nextTick(() => {
    child.emit("error", Object.assign(new Error("spawn failed"), { code: "ENOENT" }));
    child.emit("close", null, null);
  });

  await assert.rejects(
    () => provisionPasetoKey({
      generateKey: async () => VALID_KEY,
      spawn: () => child,
      stdout: { write() {} },
      stderr: { write() {} },
    }),
    /failed to start wrangler: ENOENT/,
  );
});

test("provision rejects when stdin write fails", async () => {
  const child = createFakeChild();

  // Override stdin after creation to simulate EPIPE synchronously.
  const stdin = new EventEmitter();
  stdin.write = (chunk, callback) => {
    if (callback) callback(new Error("EPIPE"));
  };
  stdin.end = () => {};
  child.stdin = stdin;

  await assert.rejects(
    () => provisionPasetoKey({
      generateKey: async () => VALID_KEY,
      spawn: () => child,
      stdout: { write() {} },
      stderr: { write() {} },
    }),
    /EPIPE/,
  );
});

test("provision handles stdin error events without an unhandled error", async () => {
  const child = new EventEmitter();
  const stdin = new EventEmitter();
  stdin.write = () => {};
  stdin.end = () => {};
  child.stdin = stdin;
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();

  process.nextTick(() => {
    stdin.emit("error", Object.assign(new Error("broken pipe"), { code: "EPIPE" }));
    child.emit("close", 1, null);
  });

  await assert.rejects(
    () => provisionPasetoKey({
      generateKey: async () => VALID_KEY,
      spawn: () => child,
      stdout: { write() {} },
      stderr: { write() {} },
    }),
    /EPIPE/,
  );
});