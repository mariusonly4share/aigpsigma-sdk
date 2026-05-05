//! # AIGP-Σ SDK
//!
//! Official Rust SDK for the [AIGP-Σ AI Certification Registry](https://aigpsigma.ai).
//!
//! ## What is AIGP-Σ?
//!
//! AIGP-Σ is a cryptographic certification system for AI agents. Each certificate:
//! - Proves an AI agent has been reviewed and authorized by a verified authority
//! - Contains a scoped permission set (what the agent is allowed to do)
//! - Is publicly verifiable by anyone
//! - Includes an embeddable SVG trust badge
//!
//! ## Getting a Certificate
//!
//! Certificates are issued through [aigpsigma.ai](https://aigpsigma.ai).
//! This SDK provides verification and public lookup — no API key needed.
//!
//! ## Quick Start
//!
//! ```rust,no_run
//! use aigpsigma_sdk::AigpSigma;
//!
//! #[tokio::main]
//! async fn main() {
//!     let sdk = AigpSigma::new(None);
//!
//!     // Verify a certificate
//!     let cert = sdk.verify("aigp-cert-xxxxxxxx-xxx").await.unwrap();
//!     println!("Agent: {} | Status: {}", cert.agent_name, cert.status);
//!     println!("Scope: {:?}", cert.scope);
//!
//!     // Get embeddable badge URL
//!     let badge = sdk.badge_url("aigp-cert-xxxxxxxx-xxx");
//!     println!("Badge: {}", badge);
//! }
//! ```

mod client;
pub mod types;

pub use client::AigpSigma;
pub use types::{AnchorRecord, Certificate, PaymentAction, RegisterRequest, RegisterResponse, RegistryHealth, SdkError, TokenVerification};
