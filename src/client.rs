use crate::types::{AnchorRecord, Certificate, PaymentAction, RegistryHealth, SdkError};

const DEFAULT_REGISTRY: &str = "https://api.aigpsigma.com";

fn validate_id(id: &str) -> Result<(), SdkError> {
    if id.is_empty() || id.len() > 128 {
        return Err(SdkError::Registry("credential_id length invalid".into()));
    }
    if id.chars().any(|c| matches!(c, '/' | '\\' | '.' | '?' | '#' | '%' | '@' | ':' | ' ' | '\0' | '\n' | '\r')) {
        return Err(SdkError::Registry(
            format!("credential_id contains invalid characters: {}", id),
        ));
    }
    Ok(())
}

fn validate_url(url: &str) -> Result<(), SdkError> {
    if !url.starts_with("https://") && !url.starts_with("http://") {
        return Err(SdkError::Registry(
            format!("registry_url must use http:// or https:// scheme, got: {}", url),
        ));
    }
    Ok(())
}

/// AIGP-Σ Registry client.
///
/// All methods call **public** endpoints — no API key required.
/// To issue or revoke certificates, purchase a plan at <https://aigpsigma.ai>.
///
/// # Example
/// ```rust,no_run
/// use aigpsigma_sdk::AigpSigma;
///
/// #[tokio::main]
/// async fn main() {
///     let sdk = AigpSigma::new(None);
///     let cert = sdk.verify("aigp-cert-xxxxxxxx-xxx").await.unwrap();
///     println!("{} — {}", cert.agent_name, cert.status);
/// }
/// ```
pub struct AigpSigma {
    http:         reqwest::Client,
    registry_url: String,
}

impl AigpSigma {
    /// Create a new SDK client.
    ///
    /// `registry_url` defaults to `https://api.aigpsigma.com` when `None`.
    /// HTTPS is enforced when the URL uses the `https://` scheme.
    pub fn new(registry_url: Option<&str>) -> Self {
        let url = registry_url
            .unwrap_or(DEFAULT_REGISTRY)
            .trim_end_matches('/')
            .to_string();
        if let Err(e) = validate_url(&url) {
            panic!("Invalid registry URL: {}", e);
        }
        let enforce_https = url.starts_with("https://");
        Self {
            http: reqwest::Client::builder()
                .https_only(enforce_https)
                .timeout(std::time::Duration::from_secs(10))
                .user_agent(concat!("aigpsigma-sdk/", env!("CARGO_PKG_VERSION")))
                .build()
                .expect("Failed to build HTTP client"),
            registry_url: url,
        }
    }

    /// Verify a certificate by ID.
    ///
    /// Returns the full certificate record including status (`active` / `revoked` / `expired`).
    pub async fn verify(&self, credential_id: &str) -> Result<Certificate, SdkError> {
        validate_id(credential_id)?;
        let url = format!("{}/v1/registry/{}", self.registry_url, credential_id);
        let resp = self.http.get(&url).send().await?;

        if resp.status().as_u16() == 404 {
            return Err(SdkError::NotFound(credential_id.to_string()));
        }

        let cert: Certificate = resp.error_for_status()?.json().await?;
        Ok(cert)
    }

    /// Return the embeddable SVG badge URL for a certificate.
    ///
    /// No network call is made — the URL is constructed locally.
    /// Embed in HTML: `<img src="..." alt="AIGP-Σ Certified" />`
    pub fn badge_url(&self, credential_id: &str) -> Result<String, SdkError> {
        validate_id(credential_id)?;
        Ok(format!("{}/v1/badge/{}.svg", self.registry_url, credential_id))
    }

    /// List all payment action blocks recorded for a certificate.
    pub async fn list_actions(&self, credential_id: &str) -> Result<Vec<PaymentAction>, SdkError> {
        validate_id(credential_id)?;
        let url = format!("{}/v1/registry/{}/actions", self.registry_url, credential_id);
        let resp = self.http.get(&url).send().await?.error_for_status()?;
        let body: serde_json::Value = resp.json().await?;
        let actions = serde_json::from_value(body["actions"].clone())
            .map_err(|e| SdkError::Registry(e.to_string()))?;
        Ok(actions)
    }

    /// Returns `true` if the certificate exists and is active.
    ///
    /// Useful for agent-to-agent trust checks before collaborating.
    pub async fn is_valid(&self, credential_id: &str) -> bool {
        if validate_id(credential_id).is_err() {
            return false;
        }
        self.verify(credential_id).await
            .map(|c| c.is_active())
            .unwrap_or(false)
    }

    /// List all Bitcoin OP_RETURN anchor records (WP-01 §13).
    pub async fn anchors(&self) -> Result<Vec<AnchorRecord>, SdkError> {
        let url = format!("{}/v1/anchors", self.registry_url);
        let body: serde_json::Value = self.http
            .get(&url)
            .send().await?
            .error_for_status()?
            .json().await?;
        let records = serde_json::from_value(body["anchors"].clone())
            .map_err(|e| SdkError::Registry(e.to_string()))?;
        Ok(records)
    }

    /// Check registry health.
    pub async fn ping(&self) -> Result<RegistryHealth, SdkError> {
        let url = format!("{}/health", self.registry_url);
        let health: RegistryHealth = self.http
            .get(&url)
            .send().await?
            .error_for_status()?
            .json().await?;
        Ok(health)
    }
}
