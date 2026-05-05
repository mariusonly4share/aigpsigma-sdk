import type { AnchorRecord, Certificate, PaymentAction, RegisterRequest, RegisterResponse, RegistryHealth, TokenVerification } from './types.js'

const DEFAULT_REGISTRY = 'https://api.aigpsigma.com'
const SDK_VERSION      = '0.2.0'

// Blocks path traversal, URL encoding bypass (%2F), and SSRF-helper chars
const INVALID_ID_RE = /[/\\.?#%@:\s\x00]/

function validateId(id: string): void {
  if (!id || id.length > 128) {
    throw new Error('credential_id length invalid (1–128 chars)')
  }
  if (INVALID_ID_RE.test(id)) {
    throw new Error(`credential_id contains invalid characters: "${id}"`)
  }
}

function validateUrl(url: string): void {
  if (!url.startsWith('https://') && !url.startsWith('http://')) {
    throw new Error(
      `registry_url must use http:// or https:// scheme, got: "${url}"`
    )
  }
}

export interface AigpSigmaOptions {
  /** Agent name — used to generate a deterministic fingerprint (model_hash) */
  agentName?: string
  /** Registry base URL (default: https://api.aigpsigma.com) */
  registryUrl?: string
  /** Request timeout in milliseconds (default: 10 000) */
  timeoutMs?: number
}

/**
 * AIGP-Σ Registry client.
 *
 * All methods call **public** endpoints — no API key required.
 *
 * @example
 * ```ts
 * import { AigpSigma } from 'aigpsigma-sdk'
 *
 * const sdk = new AigpSigma()
 * const cert = await sdk.verify('aigp-cert-xxxxxxxx-xxx')
 * console.log(cert.agent_name, cert.status)
 * ```
 */
export class AigpSigma {
  private readonly baseUrl: string
  private readonly timeoutMs: number
  private readonly agentName: string | undefined

  constructor(registryUrlOrOptions?: string | AigpSigmaOptions, options?: AigpSigmaOptions) {
    let url: string
    let opts: AigpSigmaOptions | undefined

    if (typeof registryUrlOrOptions === 'object') {
      opts = registryUrlOrOptions
      url  = (opts.registryUrl ?? DEFAULT_REGISTRY).replace(/\/$/, '')
    } else {
      opts = options
      url  = (registryUrlOrOptions ?? DEFAULT_REGISTRY).replace(/\/$/, '')
    }

    validateUrl(url)
    this.baseUrl   = url
    this.timeoutMs = opts?.timeoutMs ?? 10_000
    this.agentName = opts?.agentName
  }

  private async request<T>(path: string): Promise<T> {
    const ctrl = new AbortController()
    const tid  = setTimeout(() => ctrl.abort(), this.timeoutMs)
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        signal:  ctrl.signal,
        headers: { 'X-Sdk': `aigpsigma-js/${SDK_VERSION}` },
      })
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new Error(`HTTP ${res.status}${body ? ': ' + body : ''}`)
      }
      return res.json() as Promise<T>
    } finally {
      clearTimeout(tid)
    }
  }

  /**
   * Verify a certificate by ID.
   * Throws if the certificate is not found or the registry is unreachable.
   */
  async verify(credentialId: string): Promise<Certificate> {
    validateId(credentialId)
    try {
      return await this.request<Certificate>(`/v1/registry/${credentialId}`)
    } catch (e: any) {
      if (String(e?.message).includes('HTTP 404')) {
        throw new Error(`Certificate not found: ${credentialId}`)
      }
      throw e
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
  badgeUrl(credentialId: string): string {
    validateId(credentialId)
    return `${this.baseUrl}/v1/badge/${credentialId}.svg`
  }

  /** List all payment action blocks recorded for a certificate (WP-04). */
  async listActions(credentialId: string): Promise<PaymentAction[]> {
    validateId(credentialId)
    const data = await this.request<{ actions: PaymentAction[] }>(
      `/v1/registry/${credentialId}/actions`
    )
    return data.actions ?? []
  }

  /**
   * Returns `true` only if the certificate exists and is active.
   * Returns `false` on network errors — never throws.
   */
  async isValid(credentialId: string): Promise<boolean> {
    try {
      validateId(credentialId)
      const cert = await this.verify(credentialId)
      return cert.status === 'active'
    } catch {
      return false
    }
  }

  /** List all Bitcoin OP_RETURN anchor records (WP-01 §13). */
  async anchors(): Promise<AnchorRecord[]> {
    const data = await this.request<{ anchors: AnchorRecord[] }>('/v1/anchors')
    return data.anchors ?? []
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
  async getFingerprint(): Promise<string> {
    if (!this.agentName) {
      throw new Error('agentName is required to generate a fingerprint — pass it in the constructor: new AigpSigma({ agentName: "..." })')
    }
    const data   = new TextEncoder().encode(`aigpsigma:v1:${this.agentName}`)
    const buffer = await crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }

  /**
   * Send a heartbeat for a certificate — proves the agent is online.
   *
   * Call this on every agent startup (and optionally on a schedule).
   * Required within 24 hours of issuance to activate a free-tier cert.
   *
   * @returns `auto_renewed` — true if the cert was auto-renewed (expiry < 30 days)
   *
   * @example
   * ```ts
   * const sigma = new AigpSigma({ agentName: 'My Agent' })
   * await sigma.heartbeat('aigp-cert-xxxxxxxx-xxx')
   * ```
   */
  async heartbeat(credentialId: string): Promise<{ ok: boolean; auto_renewed: boolean }> {
    validateId(credentialId)
    return this.request<{ ok: boolean; auto_renewed: boolean }>(
      `/v1/registry/${credentialId}/heartbeat`
    )
  }

  /** Check registry health. */
  async ping(): Promise<RegistryHealth> {
    return this.request<RegistryHealth>('/health')
  }

  /**
   * Register a new certificate directly from the platform.
   *
   * Calls the **public** endpoint — no API key required.
   * The certificate is created with status `active` for free tier.
   *
   * Use `getFingerprint()` to generate the required `model_hash`.
   *
   * @example
   * ```ts
   * const sdk = new AigpSigma({ agentName: 'my-trading-bot' })
   * const fingerprint = await sdk.getFingerprint()
   *
   * const cert = await sdk.register({
   *   agent_name: 'my-trading-bot',
   *   scope: ['read', 'trade'],
   *   model_hash: fingerprint,
   *   org_name: 'Acme Corp',
   * })
   * console.log(cert.credential_id, cert.status)
   * ```
   */
  async register(req: RegisterRequest): Promise<RegisterResponse> {
    const ctrl = new AbortController()
    const tid  = setTimeout(() => ctrl.abort(), this.timeoutMs)
    try {
      const res = await fetch(`${this.baseUrl}/v1/certificates/register`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sdk':        `aigpsigma-js/${SDK_VERSION}`,
        },
        body:   JSON.stringify(req),
        signal: ctrl.signal,
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(
          `HTTP ${res.status}: ${
            body?.error ?? JSON.stringify(body) ?? res.statusText
          }`
        )
      }
      return body as RegisterResponse
    } finally {
      clearTimeout(tid)
    }
  }

  /**
   * WP-06: Verify an OTT or DAT token issued by the AIGP-Σ registry.
   *
   * - **OTT** (`ott-...`): consumed atomically on first call — returns `status: "USED"`.
   *   Any subsequent call returns `valid: false, error: "TOKEN_USED"`.
   * - **DAT** (`dat-...`): validated but not consumed. Pass `jti` for DPoP replay prevention.
   *
   * Platforms integrating with AIGP-Σ call this to verify agent tokens before
   * serving a request and attributing usage to `owner_id`.
   *
   * @example
   * ```ts
   * const result = await sdk.verifyToken('ott-abc123')
   * if (result.valid) {
   *   console.log('Owner:', result.owner_id, '| Action:', result.action)
   * }
   * ```
   */
  async verifyToken(tokenId: string, jti?: string): Promise<TokenVerification> {
    const qs = jti ? `?jti=${encodeURIComponent(jti)}` : ''
    try {
      return await this.request<TokenVerification>(`/v1/registry/token/${tokenId}${qs}`)
    } catch (e: any) {
      if (String(e?.message).includes('HTTP 401')) {
        const msg = String(e.message)
        return {
          valid:      false,
          token_id:   tokenId,
          token_type: '',
          owner_id:   '',
          agent_id:   '',
          status:     msg.includes('USED') ? 'USED' : msg.includes('EXPIRED') ? 'EXPIRED' : 'INVALID',
          expires_at: '',
        }
      }
      throw e
    }
  }
}
