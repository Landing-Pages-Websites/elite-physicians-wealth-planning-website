import { readFile } from "node:fs/promises";
import path from "node:path";

import { MEGA_PREVIEW_IDENTITY_FILE } from "./preview_mode.mjs";

const COMMIT_SHA = /^[0-9a-f]{40}$/u;

/**
 * The commit the saved worktree serves, as site-edit.sh last recorded it.
 * Anything missing or malformed reads null, which rendered checks treat as
 * INCONCLUSIVE, never as a match (P9-D31).
 */
export async function readMegaPreviewIdentity(root = process.cwd(), read = readFile) {
  try {
    const parsed = JSON.parse(await read(path.join(root, MEGA_PREVIEW_IDENTITY_FILE), "utf8"));
    const sha = parsed !== null && typeof parsed === "object" && !Array.isArray(parsed) ? parsed.commitSha : null;
    return typeof sha === "string" && COMMIT_SHA.test(sha) ? sha : null;
  } catch {
    return null;
  }
}
