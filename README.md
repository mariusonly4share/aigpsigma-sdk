# AIGP-Σ SDK

Official Rust SDK for the [AIGP-Σ AI Certification Registry](https://aigpsigma.ai).

AIGP-Σ is a cryptographic certification system for AI agents, based on the AIGP-Sigma Whitepaper (WP-03, WP-04). Each certificate proves an AI agent has been reviewed and authorized — verifiable by anyone, no API key required.

> **To issue a certificate for your AI agent, purchase a plan at [aigpsigma.ai](https://aigpsigma.ai).**  
> This SDK is the base layer your application needs to verify certificates and embed trust badges.

---

## Installation

Add to your `Cargo.toml`:

```toml
[dependencies]
aigpsigma-sdk = "0.1"
tokio = { version = "1", features = ["full"] }
```

Or install the CLI:

```bash
cargo install aigpsigma-sdk
```

---

## Library Usage

```rust
use aigpsigma_sdk::AigpSigma;

#[tokio::main]
async fn main() {
    let sdk = AigpSigma::new(None); // uses https://api.aigpsigma.com

    // Verify a certificate
    let cert = sdk.verify("aigp-cert-xxxxxxxx-xxx").await.unwrap();
    println!("{} is {}", cert.agent_name, cert.status); // e.g. "MyAgent is active"

    // Check if active before allowing agent to act
    if !cert.is_active() {
        panic!("Agent is not certified — halting execution");
    }

    // Embed trust badge in your frontend
    let badge = sdk.badge_url("aigp-cert-xxxxxxxx-xxx");
    // → "https://api.aigpsigma.ai/v1/badge/aigp-cert-xxxxxxxx-xxx.svg"

    // Audit trail: list recorded payment actions
    let actions = sdk.list_actions("aigp-cert-xxxxxxxx-xxx").await.unwrap();
    for action in actions {
        println!("{} {} {}", action.action_type, action.amount, action.currency);
    }

    // Health check
    let health = sdk.ping().await.unwrap();
    println!("Registry: {} v{}", health.service, health.version);
}
```

---

## CLI Usage

```bash
# Verify a certificate
aigpsigma verify aigp-cert-xxxxxxxx-xxx

# Output:
# ✓ AIGP-Σ Certificate
#   ID:        aigp-cert-xxxxxxxx-xxx
#   Agent:     MyAgent-v2
#   Status:    ACTIVE
#   Scope:     read_data, generate_report
#   Issued:    2026-03-24T...
#   Expires:   2026-06-22T...
#   Registry:  https://api.aigpsigma.ai/v1/registry/aigp-cert-xxxxxxxx-xxx
#   Badge:     https://api.aigpsigma.ai/v1/badge/aigp-cert-xxxxxxxx-xxx.svg

# Get badge URL only
aigpsigma badge aigp-cert-xxxxxxxx-xxx

# List payment actions
aigpsigma actions aigp-cert-xxxxxxxx-xxx

# Check registry health
aigpsigma ping
```

Use a custom registry (self-hosted):

```bash
aigpsigma --registry http://localhost:8002 ping
# or
AIGPSIGMA_REGISTRY=http://localhost:8002 aigpsigma ping
```

---

## Embedding a Trust Badge

```html
<!-- Static badge image — auto-updates to reflect current status -->
<img
  src="https://api.aigpsigma.ai/v1/badge/aigp-cert-xxxxxxxx-xxx.svg"
  alt="AIGP-Σ Certified AI Agent"
  height="20"
/>
```

The badge SVG is served with `Cache-Control: max-age=300` and reflects live status:

| Status | Badge |
|--------|-------|
| active | 🟢 AIGP-Σ \| AI Certified \| ✓ |
| revoked | 🔴 AIGP-Σ \| REVOKED \| ✗ |
| expired | 🟡 AIGP-Σ \| EXPIRED |

---

## API Reference

### `AigpSigma::new(registry_url: Option<&str>) -> AigpSigma`

Creates a new SDK client. Pass `None` to use the production registry (`https://api.aigpsigma.com`).

### `async verify(credential_id: &str) -> Result<Certificate, SdkError>`

Fetches a certificate from the public registry. Returns the full record including status, scope, expiry.

### `badge_url(credential_id: &str) -> String`

Returns the embeddable SVG badge URL. No network call — URL is constructed locally.

### `async list_actions(credential_id: &str) -> Result<Vec<PaymentAction>, SdkError>`

Returns the list of payment action blocks recorded for the certificate. Each action contains a `SHA3-512` hash linking it into an immutable audit chain.

### `async ping() -> Result<RegistryHealth, SdkError>`

Checks registry availability and returns version + certificate counts.

---

## Certificate Structure

```rust
pub struct Certificate {
    pub credential_id: String,   // "aigp-cert-xxxxxxxx-xxx"
    pub agent_name:    String,   // "MyAgent-v2"
    pub tenant_id:     String,   // your account ID
    pub issued_by:     String,   // "AIGodfather"
    pub issued_at:     String,   // RFC3339
    pub expires_at:    String,   // RFC3339
    pub scope:         Vec<String>, // ["read_data", "generate_report"]
    pub status:        String,   // "active" | "revoked" | "expired"
    pub registry_url:  String,
    pub badge_url:     String,
    pub model_hash:    Option<String>, // SHA3-512 of model weights (optional)
    pub sdk_hash:      Option<String>, // SHA3-512 of SDK version (optional)
}
```

---

## Agent-to-Agent Trust

AI agents can verify each other before collaborating — no API key required.
Each agent can only look up a **specific certificate by ID** — there is no endpoint to list or enumerate the full registry.

```rust
use aigpsigma_sdk::AigpSigma;

// Agent A checks Agent B is certified before accepting a task
async fn trust_check(other_cert_id: &str) -> bool {
    let sdk = AigpSigma::new(None);
    sdk.is_valid(other_cert_id).await  // true only if status == "active"
}

// Or inspect scope + expiry in detail
async fn scope_check(cert_id: &str) {
    let sdk = AigpSigma::new(None);
    let cert = sdk.verify(cert_id).await.unwrap();
    assert!(cert.is_active());
    assert!(cert.scope.contains(&"write".to_string()));
}
```

---

## Security

- All public endpoints use **HTTPS** (TLS 1.3)
- Certificates are backed by **ML-DSA** (post-quantum signatures)
- HALT commands are protected by **RISC0 ZK proofs** (AIGP-Sigma WP §4.3)
- Payment action blocks form a **SHA3-512 hash chain** (immutable audit trail)

See [AIGP-Sigma Whitepaper](https://aigpsigma.ai/whitepaper) for full protocol specification.

---

## License

MIT © [aigpsigma.ai](https://aigpsigma.ai)
