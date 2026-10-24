import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const MODEL = "gemini-3.1-flash-image";
export const API_ENDPOINT = `https://generativelanguage.googleapis.com/v1/models/${MODEL}:generateContent`;

const PROMPTS = [
  "Create one polished 1:1 square favicon image at 1K resolution. The entire canvas is a perfectly flat, uniform #4392F1 blue tile, edge to edge. Center one original pure-white quail silhouette in right-facing side profile: a compact distinctly round body, a much smaller round head, a short pointed beak, and a tiny crest feather. Include only one very small blue negative-space eye cutout. Use clean bold smooth vector-like contours, broad balanced padding on all sides, and shapes that remain recognizable at 16x16 pixels. It must read as a quail, not a duck, chick, rooster, or generic bird. White is the only mark color. No letters, words, border, gradient, shadow, texture, 3D, detailed wings, feet, claws, or extra objects.",
  "Create one polished 1:1 square favicon image at 1K resolution. The entire canvas is a perfectly flat, uniform #4392F1 blue tile, edge to edge. Center one original pure-white quail silhouette in a slight three-quarter view facing right: a broad compact round body, small distinct head, short beak, and one tiny upright crest tuft. Keep a single very small blue negative-space eye cutout and no other interior details. Use clean bold smooth vector-like contours, balanced wide padding, and a simple compact shape recognizable at 16x16 pixels. It must read as a quail, not a duck, chick, rooster, or generic bird. White is the only mark color. No letters, words, border, gradient, shadow, texture, 3D, detailed wings, feet, claws, or extra objects.",
];

function imageInfo(bytes) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (bytes.length >= 24 && bytes.subarray(0, 8).equals(signature) && bytes.toString("ascii", 12, 16) === "IHDR") {
    return { extension: "png", mimeType: "image/png", width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { extension: "jpg", mimeType: "image/jpeg", width: null, height: null };
  }
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") {
    return { extension: "webp", mimeType: "image/webp", width: null, height: null };
  }
  throw new Error("The API response contained an unsupported image format; raw response was preserved.");
}

function safeApiErrorSummary(payload, apiKey) {
  const error = payload?.error;
  if (!error || typeof error !== "object") return "response body suppressed";
  const safe = [error.code, error.status, error.message]
    .filter((value) => typeof value === "string" || typeof value === "number")
    .join(" ")
    .replaceAll(apiKey, "[REDACTED_API_KEY]")
    .replace(/AIza[0-9A-Za-z_-]{10,}/g, "[REDACTED_API_KEY]")
    .replace(/https?:\/\/\S+/g, "[URL]")
    .replace(/(?:api[_-]?key|key)\s*[:=]\s*\S+/gi, "key=[REDACTED]")
    .replace(/\s+/g, " ")
    .slice(0, 500);
  return safe || "response body suppressed";
}

function responseShapeSummary(payload) {
  const candidates = Array.isArray(payload?.candidates) ? payload.candidates : [];
  const parts = candidates.flatMap((candidate) => Array.isArray(candidate?.content?.parts) ? candidate.content.parts : []);
  const partSummary = parts.map((part) => {
    const image = part?.inlineData ?? part?.inline_data;
    return {
      fields: Object.keys(part ?? {}).filter((key) => key !== "thoughtSignature" && key !== "thought_signature"),
      mimeType: image?.mimeType ?? image?.mime_type ?? null,
    };
  });
  return {
    topLevelKeys: Object.keys(payload ?? {}),
    candidateCount: candidates.length,
    finishReasons: candidates.map((candidate) => candidate?.finishReason ?? null),
    blockReason: payload?.promptFeedback?.blockReason ?? null,
    parts: partSummary,
  };
}

function imageFromResponse(payload) {
  const candidates = Array.isArray(payload?.candidates) ? payload.candidates : [];
  const parts = candidates.flatMap((candidate) => Array.isArray(candidate?.content?.parts) ? candidate.content.parts : []);
  const image = parts.map((part) => part?.inlineData ?? part?.inline_data).find((item) => typeof item?.data === "string");
  if (!image) throw new Error(`Google returned no image part. Safe response shape: ${JSON.stringify(responseShapeSummary(payload))}`);
  const bytes = Buffer.from(image.data, "base64");
  return { bytes, ...imageInfo(bytes), responseMimeType: image.mimeType ?? image.mime_type ?? null };
}

export async function generateConcepts({
  apiKey,
  count = 2,
  outputDir,
  fetchImpl = fetch,
  now = () => new Date(),
  responseCapturePath = "/private/tmp/quail-favicon-response.json",
}) {
  if (typeof apiKey !== "string" || apiKey.length === 0) throw new Error("GEMINI_API_KEY is missing.");
  if (!Number.isInteger(count) || count < 1 || count > 2) throw new Error("Concept count must be 1 or 2.");

  const destination = resolve(outputDir ?? resolve(dirname(fileURLToPath(import.meta.url)), "../assets/nanobanana2"));
  const concepts = Array.from({ length: count }, (_, i) => `concept-${String(i + 1).padStart(2, "0")}`);
  for (const concept of concepts) {
    if (["png", "jpg", "webp"].some((extension) => existsSync(resolve(destination, `${concept}.${extension}`)))
      || existsSync(resolve(destination, `${concept}.metadata.json`))) {
      throw new Error("Concept output already exists; refusing to overwrite saved originals.");
    }
  }
  await mkdir(destination, { recursive: true });

  const saved = [];
  for (let index = 0; index < count; index += 1) {
    const capture = responseCapturePath
      ? count === 1
        ? responseCapturePath
        : responseCapturePath.replace(/\.json$/, `-${String(index + 1).padStart(2, "0")}.json`)
      : null;
    if (capture) await mkdir(dirname(capture), { recursive: true });
    let response;
    try {
      response = await fetchImpl(API_ENDPOINT, {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(180_000),
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: PROMPTS[index] }] }],
          generationConfig: {
            responseModalities: ["IMAGE"],
            imageConfig: { aspectRatio: "1:1", imageSize: "1K" },
          },
        }),
      });
    } catch {
      throw new Error("Google Gemini API request failed; network details were suppressed.");
    }

    let interaction;
    try {
      interaction = await response.json();
    } catch {
      if (!response.ok) throw new Error(`Google Gemini API request failed: HTTP ${response.status}; response body suppressed.`);
      throw new Error("Google Gemini API returned an unreadable response; body was suppressed.");
    }
    if (capture) await writeFile(capture, `${JSON.stringify(interaction)}\n`, { flag: "w", mode: 0o600 });
    if (!response.ok) {
      throw new Error(`Google Gemini API request failed: HTTP ${response.status}; ${safeApiErrorSummary(interaction, apiKey)}`);
    }
    const image = imageFromResponse(interaction);
    const target = resolve(destination, `${concepts[index]}.${image.extension}`);
    const metadataPath = resolve(destination, `${concepts[index]}.metadata.json`);
    const generatedAt = now().toISOString();
    const metadata = {
      model: MODEL,
      prompt: PROMPTS[index],
      generatedAt,
      aspectRatio: "1:1",
      imageSize: "1K",
      responseMimeType: image.responseMimeType,
      detectedMimeType: image.mimeType,
      sourceSha256: createHash("sha256").update(image.bytes).digest("hex"),
      width: image.width,
      height: image.height,
    };
    await writeFile(target, image.bytes, { flag: "wx", mode: 0o644 });
    await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, { flag: "wx", mode: 0o644 });
    saved.push(target);
  }
  return saved;
}

async function main() {
  const args = process.argv.slice(2);
  const countArg = args.find((arg) => arg.startsWith("--count="));
  const outputDirArg = args.find((arg) => arg.startsWith("--output-dir="));
  const allowedArgs = args.filter((arg) => arg.startsWith("--count=") || arg.startsWith("--output-dir="));
  if (
    args.length !== allowedArgs.length
    || args.filter((arg) => arg.startsWith("--count=")).length > 1
    || args.filter((arg) => arg.startsWith("--output-dir=")).length > 1
  ) {
    throw new Error("Usage: node generate_nanobanana_concepts.mjs [--count=1|2] [--output-dir=PATH]");
  }
  const count = countArg ? Number(countArg.slice("--count=".length)) : 2;
  const outputDir = outputDirArg ? resolve(outputDirArg.slice("--output-dir=".length)) : undefined;
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) throw new Error("Workspace .env file is missing.");
  process.loadEnvFile(envPath);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is missing from workspace .env.");

  const saved = await generateConcepts({ apiKey, count, outputDir });
  for (const path of saved) console.log(`Saved original image: ${path}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    const safeMessage = error instanceof Error ? error.message : "Image generation failed.";
    console.error(safeMessage);
    process.exitCode = 1;
  });
}
