import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateConcepts, API_ENDPOINT, MODEL } from "../scripts/generate_nanobanana_concepts.mjs";

const FAKE_API_KEY = "AIzaTESTSECRETVALUE1234567890";

function pngBytes() {
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89,
  ]);
}

function jpegBytes() {
  return Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
}

function makeFetch({ status = 200, bytes = pngBytes(), mimeType = "image/png", errorPayload = null }) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    if (status >= 400) {
      const payload = errorPayload ?? {
        error: {
          code: 400,
          status: "INVALID_ARGUMENT",
          message: `bad request for ${FAKE_API_KEY} and AIzaLEAKEDVALUE`,
        },
      };
      return new Response(JSON.stringify(payload), {
        status,
        headers: { "content-type": "application/json" },
      });
    }
    const payload = {
      candidates: [{ content: { parts: [{ inlineData: { data: bytes.toString("base64"), mimeType } }] } }],
    };
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  return { fetchImpl, calls };
}

test("generateConcepts rejects a missing API key without calling fetch", async () => {
  const outputDir = await mkdtemp(join(tmpdir(), "quail-favicon-"));
  const { fetchImpl, calls } = makeFetch({});
  await assert.rejects(
    () => generateConcepts({ apiKey: "", count: 1, outputDir, fetchImpl, responseCapturePath: null }),
    /GEMINI_API_KEY is missing/,
  );
  assert.equal(calls.length, 0);
});

test("generateConcepts rejects invalid concept counts", async () => {
  const outputDir = await mkdtemp(join(tmpdir(), "quail-favicon-"));
  const { fetchImpl } = makeFetch({});
  await assert.rejects(
    () => generateConcepts({ apiKey: FAKE_API_KEY, count: 0, outputDir, fetchImpl, responseCapturePath: null }),
    /Concept count must be 1 or 2/,
  );
  await assert.rejects(
    () => generateConcepts({ apiKey: FAKE_API_KEY, count: 3, outputDir, fetchImpl, responseCapturePath: null }),
    /Concept count must be 1 or 2/,
  );
});

test("generateConcepts refuses to overwrite existing concept outputs", async () => {
  const outputDir = await mkdtemp(join(tmpdir(), "quail-favicon-"));
  await writeFile(join(outputDir, "concept-01.png"), Buffer.from("existing"));
  const { fetchImpl, calls } = makeFetch({});
  await assert.rejects(
    () => generateConcepts({ apiKey: FAKE_API_KEY, count: 1, outputDir, fetchImpl, responseCapturePath: null }),
    /Concept output already exists/,
  );
  assert.equal(calls.length, 0);
});

test("generateConcepts calls the fixed Gemini endpoint with the expected model and redirect protection", async () => {
  const outputDir = await mkdtemp(join(tmpdir(), "quail-favicon-"));
  const { fetchImpl, calls } = makeFetch({});
  await generateConcepts({ apiKey: FAKE_API_KEY, count: 1, outputDir, fetchImpl, responseCapturePath: null });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, API_ENDPOINT);
  assert.equal(calls[0].url.includes(MODEL), true);
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.redirect, "error");
  assert.equal(calls[0].init.headers["x-goog-api-key"], FAKE_API_KEY);
  assert.equal(calls[0].init.headers["content-type"], "application/json");
});

test("generateConcepts preserves PNG bytes and writes metadata without secrets", async () => {
  const outputDir = await mkdtemp(join(tmpdir(), "quail-favicon-"));
  const bytes = pngBytes();
  const { fetchImpl } = makeFetch({ bytes, mimeType: "image/png" });
  const saved = await generateConcepts({ apiKey: FAKE_API_KEY, count: 1, outputDir, fetchImpl, responseCapturePath: null });

  assert.equal(saved.length, 1);
  const savedBytes = await readFile(saved[0]);
  assert.deepEqual(savedBytes, bytes);

  const metadata = JSON.parse(await readFile(join(outputDir, "concept-01.metadata.json"), "utf8"));
  assert.equal(metadata.model, MODEL);
  assert.equal(metadata.detectedMimeType, "image/png");
  assert.equal(typeof metadata.sourceSha256, "string");
  const serializedMetadata = JSON.stringify(metadata);
  assert.equal(serializedMetadata.includes(FAKE_API_KEY), false);
  assert.equal(serializedMetadata.includes("AIza"), false);
});

test("generateConcepts preserves JPEG bytes", async () => {
  const outputDir = await mkdtemp(join(tmpdir(), "quail-favicon-"));
  const bytes = jpegBytes();
  const { fetchImpl } = makeFetch({ bytes, mimeType: "image/jpeg" });
  const saved = await generateConcepts({ apiKey: FAKE_API_KEY, count: 1, outputDir, fetchImpl, responseCapturePath: null });

  assert.equal(saved.length, 1);
  assert.match(saved[0], /concept-01\.jpg$/);
  assert.deepEqual(await readFile(saved[0]), bytes);
});

test("generateConcepts redacts API keys and AIza values from HTTP errors", async () => {
  const outputDir = await mkdtemp(join(tmpdir(), "quail-favicon-"));
  const { fetchImpl } = makeFetch({ status: 400 });
  await assert.rejects(
    () => generateConcepts({ apiKey: FAKE_API_KEY, count: 1, outputDir, fetchImpl, responseCapturePath: null }),
    (error) => {
      assert.match(error.message, /HTTP 400/);
      assert.match(error.message, /\[REDACTED_API_KEY\]/);
      assert.equal(error.message.includes(FAKE_API_KEY), false);
      assert.equal(/AIza[0-9A-Za-z_-]{10,}/.test(error.message), false);
      return true;
    },
  );
});

test("generateConcepts reports network failures without leaking details", async () => {
  const outputDir = await mkdtemp(join(tmpdir(), "quail-favicon-"));
  const fetchImpl = async () => {
    throw new Error("socket hang up");
  };
  await assert.rejects(
    () => generateConcepts({ apiKey: FAKE_API_KEY, count: 1, outputDir, fetchImpl, responseCapturePath: null }),
    /Google Gemini API request failed; network details were suppressed\./,
  );
});

test("generateConcepts writes response capture only to the injected temporary path", async () => {
  const outputDir = await mkdtemp(join(tmpdir(), "quail-favicon-"));
  const captureDir = await mkdtemp(join(tmpdir(), "quail-capture-"));
  const capturePath = join(captureDir, "response.json");
  const { fetchImpl } = makeFetch({});
  await generateConcepts({
    apiKey: FAKE_API_KEY,
    count: 1,
    outputDir,
    fetchImpl,
    responseCapturePath: capturePath,
  });

  const captured = await readFile(capturePath, "utf8");
  assert.equal(captured.includes(FAKE_API_KEY), false);
  assert.equal(captured.includes("AIza"), false);
});