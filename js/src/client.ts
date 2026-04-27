import type { AnchorRecord, Certificate, PaymentAction, RegistryHealth } from './types.js'

const DEFAULT_REGISTRY = 'https://api.aigpsigma.com'
const SDK_VERSION      = '0.1.0'

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

  constructor(registryUrl?: string, options?: AigpSigmaOptions) {
    const url = (registryUrl ?? DEFAULT_REGISTRY).replace(/\/$/, '')
    validateUrl(url)
    this.baseUrl   = url
    this.timeoutMs = options?.timeoutMs ?? 10_000
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

  /** Check registry health. */
  async ping(): Promise<RegistryHealth> {
    return this.request<RegistryHealth>('/health')
  }
}
