/** A verified AIGP-Σ certificate record. */
export interface Certificate {
  credential_id:     string
  agent_name:        string
  tenant_id:         string
  issued_by:         string
  issued_at:         string
  expires_at:        string
  scope:             string[]
  /** `"active"` | `"revoked"` | `"expired"` | `"suspended"` */
  status:            'active' | 'revoked' | 'expired' | 'suspended' | string
  registry_url:      string
  badge_url:         string
  tier?:             string
  org_name?:         string
  model_hash?:       string
  sdk_hash?:         string
  chain_hash?:       string
  anchor_frequency?: string
  last_heartbeat?:   string
}

/** Request body for registering a new certificate (public endpoint — no API key required). */
export interface RegisterRequest {
  /** Agent name: 1–64 chars, alphanumeric + _ - . */
  agent_name: string
  /** Declared capability scopes, e.g. `["read", "write"]` */
  scope:      string[]
  /**
   * SHA-256 or SHA-512 hex fingerprint of the agent model (64 or 128 chars).
   * Generate with `AigpSigma.getFingerprint()` or pass your own.
   */
  model_hash: string
  /** Optional organisation or team name. */
  org_name?:  string
}

/** Response from a successful certificate registration. */
export interface RegisterResponse {
  ok:            boolean
  credential_id: string
  agent_name:    string
  tenant_id:     string
  status:        string
  issued_at:     string
  expires_at:    string
  scope:         string[]
  registry_url:  string
  badge_url:     string
  tier:          string
}

/** WP-06: Result of verifying an OTT or DAT token. */
export interface TokenVerification {
  valid:      boolean
  token_id:   string
  token_type: 'AIGP-OTT-v1' | 'AIGP-DAT-v1' | string
  owner_id:   string
  agent_id:   string
  /** Set for OTT — the specific action this token authorises. */
  action?:    string
  /** Set for DAT — the scope this session token covers. */
  scope?:     string
  target?:    string
  /** `"USED"` for consumed OTT, `"PENDING"` for active DAT. */
  status:     'PENDING' | 'USED' | 'EXPIRED' | string
  expires_at: string
}

/** A single payment action block recorded for a certified agent (WP-04). */
export interface PaymentAction {
  id:                     string
  credential_id:          string
  action_type:            string
  amount:                 string
  currency:               string
  recipient:              string
  protocol:               string
  scope_check:            string
  verifiable_intent_ref?: string
  /** SHA3-512 hash — links into the audit chain */
  action_hash:            string
  created_at:             string
  registry_url:           string
}

/** A Bitcoin OP_RETURN anchor record (WP-01 §13). */
export interface AnchorRecord {
  merkle_root: string
  tx_hash:     string
  anchored_at: string
  cert_count:  number
  fee_sats:    number
  /** Direct link to blockstream.info for independent verification */
  verify_url:  string
}

/** Registry health response. */
export interface RegistryHealth {
  service:         string
  version:         string
  status:          string
  certificates:    number
  payment_actions: number
  whitepapers:     string[]
}
