# aigpsigma-sdk

Official JavaScript/TypeScript SDK for the [AIGP-Σ AI Certification Registry](https://aigpsigma.ai).

Works in **Node.js 18+** and modern **browsers** (fetch API).

## Install

```bash
npm install aigpsigma-sdk
# or
pnpm add aigpsigma-sdk
```

## Quick Start

```ts
import { AigpSigma } from 'aigpsigma-sdk'

const sdk = new AigpSigma()

// Verify a certificate
const cert = await sdk.verify('aigp-cert-xxxxxxxx-xxx')
console.log(cert.agent_name) // "MyAgent-v2"
console.log(cert.status)     // "active"

// Check if valid (never throws)
const ok = await sdk.isValid('aigp-cert-xxxxxxxx-xxx')

// Embeddable badge URL
const badge = sdk.badgeUrl('aigp-cert-xxxxxxxx-xxx')
// <img src={badge} alt="AIGP-Σ Certified" />

// List payment actions (WP-04)
const actions = await sdk.listActions('aigp-cert-xxxxxxxx-xxx')

// Bitcoin anchor log (WP-01 §13)
const anchors = await sdk.anchors()
// [{ bitcoin_txid, anchored_at, cert_count, verify_url, ... }]

// Registry health
const health = await sdk.ping()
console.log(health.status) // "ok"
```

## API

### `new AigpSigma(registryUrl?, options?)`

| Param | Default | Description |
|---|---|---|
| `registryUrl` | `https://api.aigpsigma.com` | Registry base URL |
| `options.timeoutMs` | `10000` | Request timeout in ms |

### Methods

| Method | Returns | Description |
|---|---|---|
| `verify(id)` | `Promise<Certificate>` | Full certificate record |
| `badgeUrl(id)` | `string` | Embeddable SVG URL (no network call) |
| `listActions(id)` | `Promise<PaymentAction[]>` | WP-04 payment audit trail |
| `isValid(id)` | `Promise<boolean>` | True only if active — never throws |
| `anchors()` | `Promise<AnchorRecord[]>` | Bitcoin OP_RETURN checkpoints |
| `ping()` | `Promise<RegistryHealth>` | Registry health |

## License

MIT
