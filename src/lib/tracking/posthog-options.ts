import type { PostHogConfig } from "posthog-js";
import { analyticsAllowedNow } from "@/lib/consent";
import { POSTHOG_UI_HOST } from "./destination";
import { describesAnswerRegion, RECORDING_BLOCK_SELECTORS, UNCAPTURED_SELECTORS } from "./field-privacy";
import { maskNetworkRequest, scrubCapture } from "./scrub";

// Personal-data query keys PostHog should mask in its own copy of the URL;
// scrubbing already drops everything that is not a utm_* parameter.
const PERSONAL_DATA_PARAMS = ["email", "phone", "name", "first_name", "last_name"];

/**
 * Every top-level posthog-js config key we do not set, grouped, with the reason
 * the library default is acceptable. posthog-options.test.ts reads the
 * installed types and fails for any key that is neither set below nor listed
 * here, so an upgrade that adds a key forces a decision.
 */
export const REVIEWED_DEFAULTS: Record<string, Record<string, string>> = {
  "set at init or by the host app": {
    token: "passed to posthog.init as the first argument",
    loaded: "init callback, unused: nothing may run before the first request is decided here",
    __extensionClasses: "internal tree-shaking hook, not a feature",
    name: "instance name, we run a single instance",
  },
  "deprecated aliases of keys that are pinned": {
    disable_cookie: "alias of disable_persistence, which is pinned",
    enable_heatmaps: "alias of capture_heatmaps, which is pinned",
    advanced_disable_decide: "alias of advanced_disable_flags, which is pinned",
    property_blacklist: "alias of property_denylist, and before_send scrubs instead",
    cookie_name: "alias of persistence_name, and no cookie store is used",
    xhr_headers: "alias of request_headers, which we do not set",
    on_xhr_error: "alias of on_request_error, which we do not set",
    sanitize_properties: "deprecated in favour of before_send, which is pinned",
    api_method: "deprecated transport selector, api_transport is the default",
    __preview_disable_beacon: "alias of disable_beacon, which is pinned",
  },
  "cookie store, unused because persistence is localStorage or memory": {
    cross_subdomain_cookie: "only applies to the cookie store",
    persistence_name: "only names the store, nothing reads it",
    cookie_persisted_properties: "only applies to the cookie store",
    cookie_expiration: "only applies to the cookie store",
    secure_cookie: "only applies to the cookie store",
    split_storage: "only applies to localStorage-backed stores; the default layout is kept",
    persistence_save_debounce_ms: "write coalescing, no data effect",
    opt_out_capturing_cookie_prefix: "prefixes the consent storage key in whichever store is used; the default prefix is fine",
    consent_persistence_name: "names the opt-out store, nothing reads it",
    opt_out_persistence_by_default: "consent is gated by this site before init, not by PostHog defaults",
    opt_out_capturing_by_default: "consent is gated by this site before init, not by PostHog defaults",
    __preview_cookie_wins_on_conflict: "preview flag for the cookie store",
  },
  "transport and request plumbing": {
    flags_api_host: "no /flags requests are made (advanced_disable_feature_flags)",
    api_transport: "library default transport, requests are same-origin /ingest",
    request_headers: "no custom headers needed",
    on_request_error: "no handler needed",
    request_batching: "batching is the default and lowers request volume",
    request_queue_config: "batching interval, no data effect",
    fetch_options: "no custom fetch options",
    properties_string_max_length: "library default cap on property length",
    rate_limiting: "library default client rate limit",
    get_device_id: "default device id derivation",
    get_current_url: "only used for client-side URL targeting, which we do not use",
    _onCapture: "internal capture hook",
    debug: "off by default, a dev aid only",
    verbose: "off by default, a dev aid only",
    ip: "IP is used for coarse geolocation by the project, a project-side privacy setting",
    inapp_protocol: "surveys and tours only, which are disabled",
    inapp_link_new_window: "surveys and tours only, which are disabled",
  },
  "feature flags and experiments, none evaluated because /flags is off": {
    evaluation_contexts: "no flags are evaluated",
    evaluation_environments: "no flags are evaluated",
    flag_keys: "no flags are evaluated",
    advanced_only_evaluate_survey_feature_flags: "no flags are evaluated",
    advanced_enable_surveys: "surveys are disabled",
    feature_flag_request_timeout_ms: "no flag requests",
    feature_flag_cache_ttl_ms: "no flag requests",
    advanced_feature_flags_dedup_per_session: "no flag requests",
    surveys_request_timeout_ms: "surveys are disabled",
    surveys: "surveys are disabled",
    bootstrap: "no bootstrapped flags or ids",
    __preview_flags_v2: "preview flag, flags are off",
    identity_distinct_id: "conversations are disabled and nothing identifies visitors",
    identity_hash: "conversations are disabled and nothing identifies visitors",
  },
  "capture behaviour whose default is the intended one": {
    save_referrer: "referrer is stored, and scrubbed by before_send",
    save_campaign_params: "utm_* are the only kept parameters, click ids are masked",
    store_google: "gclid is masked by mask_personal_data_properties",
    custom_campaign_params: "no extra campaign parameters",
    custom_blocked_useragents: "no extra bot filtering",
    respect_dnt: "consent is handled by the site's own banner",
    opt_out_useragent_filter: "default bot filter",
    property_denylist: "before_send scrubs instead of dropping properties",
    upgrade: "legacy migration flag",
    detect_google_search_app: "default behaviour",
    session_idle_timeout_seconds: "default session idle timeout",
    mask_all_element_attributes: "page text is public marketing copy; forms, fields, answer controls and data-mega-private regions are never described (UNCAPTURED_SELECTORS)",
    mask_all_text: "page text is public marketing copy; forms, fields, answer controls and data-mega-private regions are never described (UNCAPTURED_SELECTORS)",
    scroll_root_selector: "default scroll root",
    process_person: "person_profiles is pinned",
    cookieless_mode: "cookieless mode needs a spike first (spec part 2)",
    internal_or_test_user_hostname: "no test hostname filtering",
    override_display_language: "surveys only, which are disabled",
    tracing_headers: "no outgoing request header injection",
    addTracingHeaders: "no outgoing request header injection",
    __add_tracing_headers: "no outgoing request header injection",
    segment: "no Segment integration",
    integrations: "no third-party integrations",
    __preview_capture_bot_pageviews: "preview flag, default off",
  },
  "script loading and previews": {
    strict_script_versioning: "scripts load from the /ingest/static proxy",
    asset_host: "scripts load from the /ingest/static proxy",
    prepare_external_dependency_script: "no script transform",
    prepare_external_dependency_stylesheet: "no stylesheet transform",
    external_scripts_inject_target: "default injection target",
    __preview_external_dependency_versioned_paths: "preview flag, default off",
    __preview_deferred_init_extensions: "preview flag, default off",
    __preview_eager_load_replay: "no-op option",
    __preview_lazy_load_replay: "preview flag, default off",
    __preview_disable_xhr_credentials: "preview flag, default off",
  },
};

export type PersistenceKind = "localStorage" | "memory";

/**
 * posthog-js silently falls back to a cookie when localStorage is unusable, and
 * the cookie carries the landing URL. Probe first, and fall to memory instead.
 */
export function probePersistence(
  getStorage: () => Pick<Storage, "setItem" | "getItem" | "removeItem">,
): PersistenceKind {
  try {
    const storage = getStorage();
    const key = "__mega_ph_probe";
    storage.setItem(key, "1");
    // Read back like posthog's own support check: a store that accepts writes
    // but keeps nothing would make posthog fall back to its cookie store.
    const kept = storage.getItem(key) === "1";
    storage.removeItem(key);
    return kept ? "localStorage" : "memory";
  } catch {
    return "memory";
  }
}

const EPOCH = "Thu, 01 Jan 1970 00:00:00 GMT";

/**
 * Set-Cookie strings that expire the old ph_<token>_posthog cookie, for
 * returning visitors from the cookie-based setup: host-only, then every parent
 * domain with and without the leading dot (the old cookie was cross-subdomain).
 */
export function expiredPostHogCookies(token: string, hostname: string): string[] {
  const base = `ph_${token}_posthog=; expires=${EPOCH}; path=/`;
  const cookies = [base];
  const labels = hostname.split(".");
  const isNamedHost = labels.length > 1 && !/^[\d.]+$/.test(hostname) && !hostname.includes(":");
  if (!isNamedHost) return cookies;
  for (let i = 0; i <= labels.length - 2; i++) {
    const domain = labels.slice(i).join(".");
    cookies.push(`${base}; domain=${domain}`, `${base}; domain=.${domain}`);
  }
  return cookies;
}

/**
 * Writes each expiry through `write`, skipping any that throw: the cookie
 * setter throws SecurityError in opaque-origin documents, and a throw here
 * would abort init for the rest of the page. Returns how many were written.
 */
export function expireStaleCookies(write: (cookie: string) => void, token: string, hostname: string): number {
  let written = 0;
  for (const cookie of expiredPostHogCookies(token, hostname)) {
    try {
      write(cookie);
      written++;
    } catch {
      // Nothing to expire where cookies cannot be written.
    }
  }
  return written;
}

/**
 * Every posthog-js feature is pinned client-side: the ones we use on, with our
 * options, the ones we do not use off. What is captured and how it is masked
 * never depends on a remote-config default. Recording VOLUME (the sample rate
 * and event triggers) is project-controlled by design and is the one thing the
 * shared project's settings may change.
 */
/**
 * consentAllowsNow is read on every event, so posthog-js never sends anything
 * our consent store (memory first) does not allow at that moment. posthog-js's
 * own opt-out flag is only a second line: it persists to localStorage, and when
 * every write throws it is silently lost and its capture keeps running.
 */
/**
 * posthog-js replaces its default ignore lists with a custom one, so the
 * defaults are kept explicitly.
 */
const AUTOCAPTURE_DEFAULT_IGNORES = [".ph-no-autocapture", "[data-ph-no-autocapture]"];
const DEAD_CLICK_DEFAULT_IGNORES = [".ph-no-deadclick", ".ph-no-capture"];

/**
 * The last line for events that describe an element: whatever an ignore list
 * missed (dead clicks, a selector a browser could not match), an event whose
 * element sits in a form, a field or a private region is dropped.
 */
function withoutAnswerRegions<T extends { properties?: Record<string, unknown> }>(capture: T | null): T | null {
  if (!capture?.properties) return capture;
  return describesAnswerRegion(capture.properties) ? null : capture;
}

export function buildPostHogOptions(
  persistence: PersistenceKind = "localStorage",
  consentAllowsNow: () => boolean = analyticsAllowedNow,
): Partial<PostHogConfig> {
  return {
    // Same-origin reverse proxy (rewrites in next.config.ts) so requests are
    // not blocked by ad blockers.
    api_host: "/ingest",
    ui_host: POSTHOG_UI_HOST,
    defaults: "2025-05-24",
    person_profiles: "identified_only",

    // Storage. localStorage only: the ph_* cookie carried the raw landing URL
    // on every same-origin request and to every subdomain.
    persistence,
    disable_persistence: false,
    // posthog-js offers only localStorage or a cookie here, no memory. Keep
    // localStorage even when the probe fails: a cookie would ride every
    // same-origin request, and before_send already refuses on our own store.
    opt_out_capturing_persistence_type: "localStorage",

    // Capture we use.
    // Clicks and changes inside forms, fields, answer controls and private
    // regions are never autocaptured: their name, id and label text can be
    // the visitor's answer. The site's own form events cover the funnel.
    autocapture: { css_selector_ignorelist: [...AUTOCAPTURE_DEFAULT_IGNORES, ...UNCAPTURED_SELECTORS] },
    rageclick: true,
    capture_pageview: "history_change",
    capture_pageleave: "if_capture_pageview",
    capture_heatmaps: true,
    capture_dead_clicks: { css_selector_ignorelist: [...DEAD_CLICK_DEFAULT_IGNORES, ...UNCAPTURED_SELECTORS] },
    capture_exceptions: true,
    error_tracking: { captureExtensionExceptions: false },
    disableDeviceModel: true, // skips an experimental client-hints call
    capture_performance: { web_vitals: true, network_timing: false, web_vitals_attribution: false },
    disable_scroll_properties: false,
    disable_beacon: false, // abandons leave by sendBeacon
    disable_compression: false,
    disable_capture_url_hashes: true,
    mask_personal_data_properties: true,
    custom_personal_data_properties: PERSONAL_DATA_PARAMS,
    // Every event, $snapshot recordings included, passes through here (posthog-js
    // capture() drops a null). Consent is checked before anything is scrubbed.
    before_send: (capture) => (consentAllowsNow() ? scrubCapture(withoutAnswerRegions(capture)) : null),

    // Recording. What is recorded is pinned here. The sample rate and triggers
    // decide how much, and are project-controlled by design.
    disable_session_recording: false,
    enable_recording_console_log: false,
    session_recording: {
      // maskAllInputs masks typed values but not a checkbox's or radio's
      // checked state, a custom control's aria-checked, or option text, so
      // every choice control and the text naming it is blocked. Text fields
      // and layout stay visible to show form friction.
      maskAllInputs: true,
      blockSelector: RECORDING_BLOCK_SELECTORS.join(", "),
      // Headers and bodies can hold tokens and typed form data; never record them.
      recordHeaders: false,
      recordBody: false,
      streamNetworkBody: false,
      recordCrossOriginIframes: false,
      captureCanvas: { recordCanvas: false },
      maskCapturedNetworkRequestFn: maskNetworkRequest,
    },

    // Feature flags: none evaluated. advanced_disable_feature_flags stops
    // every /flags request (first load, refresh, identify) because they would
    // carry the first landing URL and referrer. Remote config still loads.
    advanced_disable_flags: false,
    advanced_disable_feature_flags: true,
    advanced_disable_feature_flags_on_first_load: true,
    remote_config_refresh_interval_ms: 0,

    // Products we do not use.
    disable_surveys: true,
    disable_surveys_automatic_display: true,
    disable_product_tours: true,
    disable_conversations: true,
    disable_web_experiments: true,
    opt_in_site_apps: false,
    advanced_disable_toolbar_metrics: true,
    logs: { captureConsoleLogs: false, beforeSend: () => null },

    // The recorder and exception bundles load from /ingest/static.
    disable_external_dependency_loading: false,
  };
}
