/** A verified AIGP-Σ certificate record. */
interface Certificate {
    credential_id: string;
    agent_name: string;
    tenant_id: string;
    issued_by: string;
    issued_at: string;
    expires_at: string;
    scope: string[];
    /** `"active"` | `"revoked"` | `"expired"` */
    status: 'active' | 'revoked' | 'expired' | string;
    registry_url: string;
    badge_url: string;
    model_hash?: string;
    sdk_hash?: string;
    chain_hash?: string;
}
/** A single payment action block recorded for a certified agent (WP-04). */
interface PaymentAction {
    id: string;
    credential_id: string;
    action_type: string;
    amount: string;
    currency: string;
    recipient: string;
    protocol: string;
    scope_check: string;
    verifiable_intent_ref?: string;
    /** SHA3-512 hash — links into the audit chain */
    action_hash: string;
    created_at: string;
    registry_url: string;
}
/** A Bitcoin OP_RETURN anchor record (WP-01 §13). */
interface AnchorRecord {
    merkle_root: string;
    bitcoin_txid: string;
    anchored_at: string;
    cert_count: number;
    fee_sats: number;
    /** Direct link to blockstream.info for independent verification */
    verify_url: string;
}
/** Registry health response. */
interface RegistryHealth {
    service: string;
    version: string;
    status: string;
    certificates: number;
    payment_actions: number;
    whitepapers: string[];
}

interface AigpSigmaOptions {
    /** Agent name — used to generate a deterministic fingerprint (model_hash) */
    agentName?: string;
    /** Registry base URL (default: https://api.aigpsigma.com) */
    registryUrl?: string;
    /** Request timeout in milliseconds (default: 10 000) */
    timeoutMs?: number;
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
declare class AigpSigma {
    private readonly baseUrl;
    private readonly timeoutMs;
    private readonly agentName;
    constructor(registryUrlOrOptions?: string | AigpSigmaOptions, options?: AigpSigmaOptions);
    private request;
    /**
     * Verify a certificate by ID.
     * Throws if the certificate is not found or the registry is unreachable.
     */
    verify(credentialId: string): Promise<Certificate>;
    /**
     * Return the embeddable SVG badge URL — no network call made.
     *
     * @example
     * ```html
     * <img src={sdk.badgeUrl('aigp-cert-xxx')} alt="AIGP-Σ Certified" />
     * ```
     */
    badgeUrl(credentialId: string): string;
    /** List all payment action blocks recorded for a certificate (WP-04). */
    listActions(credentialId: string): Promise<PaymentAction[]>;
    /**
     * Returns `true` only if the certificate exists and is active.
     * Returns `false` on network errors — never throws.
     */
    isValid(credentialId: string): Promise<boolean>;
    /** List all Bitcoin OP_RETURN anchor records (WP-01 §13). */
    anchors(): Promise<AnchorRecord[]>;
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
    getFingerprint(): Promise<string>;
    /** Check registry health. */
    ping(): Promise<RegistryHealth>;
}

export { AigpSigma, type AigpSigmaOptions, type AnchorRecord, type Certificate, type PaymentAction, type RegistryHealth };
