/** A verified AIGP-Σ certificate record. */
export interface Certificate {
  credential_id:  string
  agent_name:     string
  tenant_id:      string
  issued_by:      string
  issued_at:      string
  expires_at:     string
  scope:          string[]
  /** `"active"` | `"revoked"` | `"expired"` */
  status:         'active' | 'revoked' | 'expired' | string
  registry_url:   string
  badge_url:      string
  model_hash?:    string
  sdk_hash?:      string
  chain_hash?:    string
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
  merkle_root:  string
  bitcoin_txid: string
  anchored_at:  string
  cert_count:   number
  fee_sats:     number
  /** Direct link to blockstream.info for independent verification */
  verify_url:   string
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
