/** Preview mode is set only in the MegaClaw service environment (Phase 8 site-editor-preview.env, passed with --env). */
export const MEGA_PREVIEW_ENV = "MEGA_PREVIEW_MODE";
export const MEGA_PREVIEW_SINK_HEADER = "x-mega-preview-sink";
export const MEGA_PREVIEW_IDENTITY_FILE = ".mega-preview-identity.json";
export const MEGA_PREVIEW_IDENTITY_PATH = "/api/mega-preview/identity";

export function isMegaPreviewMode(env = process.env) {
  return env[MEGA_PREVIEW_ENV] === "1";
}
