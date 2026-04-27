// src/client.ts
var DEFAULT_REGISTRY = "https://api.aigpsigma.com";
var SDK_VERSION = "0.1.0";
var INVALID_ID_RE = /[/\\.?#%@:\s\x00]/;
function validateId(id) {
  if (!id || id.length > 128) {
    throw new Error("credential_id length invalid (1\u2013128 chars)");
  }
  if (INVALID_ID_RE.test(id)) {
    throw new Error(`credential_id contains invalid characters: "${id}"`);
  }
}
function validateUrl(url) {
  if (!url.startsWith("https://") && !url.startsWith("http://")) {
    throw new Error(
      `registry_url must use http:// or https:// scheme, got: "${url}"`
    );
  }
}
var AigpSigma = class {
  constructor(registryUrlOrOptions, options) {
    let url;
    let opts;
    if (typeof registryUrlOrOptions === "object") {
      opts = registryUrlOrOptions;
      url = (opts.registryUrl ?? DEFAULT_REGISTRY).replace(/\/$/, "");
    } else {
      opts = options;
      url = (registryUrlOrOptions ?? DEFAULT_REGISTRY).replace(/\/$/, "");
    }
    validateUrl(url);
    this.baseUrl = url;
    this.timeoutMs = opts?.timeoutMs ?? 1e4;
    this.agentName = opts?.agentName;
  }
  async request(path) {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        signal: ctrl.signal,
        headers: { "X-Sdk": `aigpsigma-js/${SDK_VERSION}` }
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}${body ? ": " + body : ""}`);
      }
      return res.json();
    } finally {
      clearTimeout(tid);
    }
  }
  /**
   * Verify a certificate by ID.
   * Throws if the certificate is not found or the registry is unreachable.
   */
  async verify(credentialId) {
    validateId(credentialId);
    try {
      return await this.request(`/v1/registry/${credentialId}`);
    } catch (e) {
      if (String(e?.message).includes("HTTP 404")) {
        throw new Error(`Certificate not found: ${credentialId}`);
      }
      throw e;
    }
  }
  /**
   * Return the embeddable SVG badge URL — no network call made.
   *
   * @example
   * ```html
   * <img src={sdk.badgeUrl('aigp-cert-xxx')} alt="AIGP-Σ Certified" />
   * ```
   */
  badgeUrl(credentialId) {
    validateId(credentialId);
    return `${this.baseUrl}/v1/badge/${credentialId}.svg`;
  }
  /** List all payment action blocks recorded for a certificate (WP-04). */
  async listActions(credentialId) {
    validateId(credentialId);
    const data = await this.request(
      `/v1/registry/${credentialId}/actions`
    );
    return data.actions ?? [];
  }
  /**
   * Returns `true` only if the certificate exists and is active.
   * Returns `false` on network errors — never throws.
   */
  async isValid(credentialId) {
    try {
      validateId(credentialId);
      const cert = await this.verify(credentialId);
      return cert.status === "active";
    } catch {
      return false;
    }
  }
  /** List all Bitcoin OP_RETURN anchor records (WP-01 §13). */
  async anchors() {
    const data = await this.request("/v1/anchors");
    return data.anchors ?? [];
  }
  /**
   * Generate a deterministic SHA-256 fingerprint for the agent.
   *
   * Use this hash as `model_hash` when issuing a certificate — it
   * cryptographically binds the certificate to this specific agent.
   *
   * @example
   * ```ts
   * const sigma = new AigpSigma({ agentName: 'My Agent' })
   * const fingerprint = await sigma.getFingerprint()
   * // paste fingerprint in the AIGP-Σ dashboard → issue cert
   * ```
   */
  async getFingerprint() {
    if (!this.agentName) {
      throw new Error('agentName is required to generate a fingerprint \u2014 pass it in the constructor: new AigpSigma({ agentName: "..." })');
    }
    const data = new TextEncoder().encode(`aigpsigma:v1:${this.agentName}`);
    const buffer = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  /** Check registry health. */
  async ping() {
    return this.request("/health");
  }
};
export {
  AigpSigma
};
