use serde::{Deserialize, Serialize};

/// A verified AIGP-Σ certificate record.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Certificate {
    pub credential_id:  String,
    pub agent_name:     String,
    pub tenant_id:      String,
    pub issued_by:      String,
    pub issued_at:      String,
    pub expires_at:     String,
    pub scope:          Vec<String>,
    /// `"active"` | `"revoked"` | `"expired"`
    pub status:         String,
    pub registry_url:   String,
    pub badge_url:      String,
    pub model_hash:     Option<String>,
    pub sdk_hash:       Option<String>,
}

impl Certificate {
    /// Returns `true` only if status is `"active"`.
    pub fn is_active(&self) -> bool {
        self.status == "active"
    }
}

/// A single payment action block recorded for a certified agent.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentAction {
    pub id:                    String,
    pub credential_id:         String,
    pub action_type:           String,
    pub amount:                String,
    pub currency:              String,
    pub recipient:             String,
    pub protocol:              String,
    pub scope_check:           String,
    pub verifiable_intent_ref: Option<String>,
    /// SHA3-512 hash of the action — links into the audit chain.
    pub action_hash:           String,
    pub created_at:            String,
    pub registry_url:          String,
}

/// Registry health response.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegistryHealth {
    pub service:         String,
    pub version:         String,
    pub status:          String,
    pub certificates:    i64,
    pub payment_actions: i64,
    pub whitepapers:     Vec<String>,
}

/// A Bitcoin OP_RETURN anchor record (WP-01 §13).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnchorRecord {
    pub merkle_root:  String,
    pub bitcoin_txid: String,
    pub anchored_at:  String,
    pub cert_count:   i64,
    pub fee_sats:     i64,
    pub verify_url:   String,
}

/// Error type for the SDK.
#[derive(Debug, thiserror::Error)]
pub enum SdkError {
    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),

    #[error("Certificate not found: {0}")]
    NotFound(String),

    #[error("Registry error: {0}")]
    Registry(String),
}
