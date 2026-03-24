use aigpsigma_sdk::AigpSigma;
use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(
    name    = "aigpsigma",
    version = "0.1.0",
    about   = "AIGP-Σ CLI — verify AI agent certificates from the registry",
    long_about = None,
)]
struct Cli {
    /// Registry base URL (default: https://api.aigpsigma.ai)
    #[arg(long, env = "AIGPSIGMA_REGISTRY", global = true)]
    registry: Option<String>,

    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    /// Verify a certificate and print its details
    Verify {
        /// Certificate ID (e.g. aigp-cert-xxxxxxxx-xxx)
        credential_id: String,
    },
    /// Print the embeddable SVG badge URL for a certificate
    Badge {
        /// Certificate ID
        credential_id: String,
    },
    /// List payment action blocks recorded for a certificate
    Actions {
        /// Certificate ID
        credential_id: String,
    },
    /// Check registry health
    Ping,
}

#[tokio::main]
async fn main() {
    let cli = Cli::parse();
    let sdk = AigpSigma::new(cli.registry.as_deref());

    match cli.command {
        Command::Verify { credential_id } => {
            match sdk.verify(&credential_id).await {
                Ok(cert) => {
                    let status_icon = match cert.status.as_str() {
                        "active"  => "✓",
                        "revoked" => "✗",
                        _         => "?",
                    };
                    println!("{} AIGP-Σ Certificate", status_icon);
                    println!("  ID:        {}", cert.credential_id);
                    println!("  Agent:     {}", cert.agent_name);
                    println!("  Tenant:    {}", cert.tenant_id);
                    println!("  Status:    {}", cert.status.to_uppercase());
                    println!("  Scope:     {}", cert.scope.join(", "));
                    println!("  Issued:    {}", cert.issued_at);
                    println!("  Expires:   {}", cert.expires_at);
                    println!("  Registry:  {}", cert.registry_url);
                    println!("  Badge:     {}", cert.badge_url);
                    if let Some(h) = &cert.model_hash {
                        println!("  ModelHash: {}", h);
                    }
                    if !cert.is_active() {
                        eprintln!("\nWARNING: Certificate is not active ({})", cert.status);
                        std::process::exit(1);
                    }
                }
                Err(e) => { eprintln!("Error: {}", e); std::process::exit(1); }
            }
        }

        Command::Badge { credential_id } => {
            println!("{}", sdk.badge_url(&credential_id));
        }

        Command::Actions { credential_id } => {
            match sdk.list_actions(&credential_id).await {
                Ok(actions) if actions.is_empty() => {
                    println!("No payment actions recorded for {}", credential_id);
                }
                Ok(actions) => {
                    println!("{} payment action(s) for {}:\n", actions.len(), credential_id);
                    for a in &actions {
                        println!("  [{}] {} {} {} → {}",
                            a.created_at, a.action_type,
                            a.amount, a.currency, a.recipient);
                        println!("       scope_check: {} | hash: {}...", a.scope_check, &a.action_hash[..16]);
                    }
                }
                Err(e) => { eprintln!("Error: {}", e); std::process::exit(1); }
            }
        }

        Command::Ping => {
            match sdk.ping().await {
                Ok(h) => {
                    println!("✓ Registry online — {} v{}", h.service, h.version);
                    println!("  Certificates:    {}", h.certificates);
                    println!("  Payment actions: {}", h.payment_actions);
                    println!("  Whitepapers:     {}", h.whitepapers.join(", "));
                }
                Err(e) => { eprintln!("✗ Registry unreachable: {}", e); std::process::exit(1); }
            }
        }
    }
}
