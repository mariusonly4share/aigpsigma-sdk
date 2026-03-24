use aigpsigma_sdk::AigpSigma;

#[tokio::main]
async fn main() {
    let sdk = AigpSigma::new(None);

    let credential_id = std::env::args().nth(1)
        .expect("Usage: verify <credential_id>");

    println!("Verifying {}...\n", credential_id);

    let cert = sdk.verify(&credential_id).await
        .expect("Failed to verify certificate");

    println!("Agent:   {}", cert.agent_name);
    println!("Status:  {}", cert.status);
    println!("Scope:   {}", cert.scope.join(", "));
    println!("Expires: {}", cert.expires_at);
    println!("Badge:   {}", sdk.badge_url(&credential_id));
}
