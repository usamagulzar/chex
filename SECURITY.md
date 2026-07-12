# Security Policy

## Supported Versions

Chex is a continuously deployed, single‑branch web application — the version running at the live demo URL and the `main` branch is the only supported version. There are no separately maintained release branches.

| Version | Supported |
|---|---|
| `main` (latest) | ✅ |
| Older forks/snapshots | ❌ |

## Reporting a Vulnerability

If you discover a security vulnerability in Chex — including but not limited to:

- Client‑side data exposure (e.g. Firebase security rule gaps allowing unauthorized reads/writes to games, challenges, or user data)
- Cross‑site scripting (XSS) via move data, chat, usernames, or PGN import
- Authentication bypass
- Service Worker cache poisoning

please **do not open a public GitHub issue**. Instead, report it privately by messaging the maintainer directly through GitHub: [@usamagulzar](https://github.com/usamagulzar).

Please include:

- A clear description of the vulnerability and its potential impact.
- Steps to reproduce, including any proof‑of‑concept code, payloads, or screenshots.
- The browser/environment in which it was reproduced.

## Response Expectations

This is a community‑maintained project without a dedicated security team or formal SLA. As a good‑faith target:

- Acknowledgement of your report: within a few days.
- Initial assessment and, where applicable, a fix or mitigation: as soon as practically possible, prioritized by severity.

You are welcome to request credit for a responsibly disclosed finding once a fix has shipped.

## Scope Notes

- Chex's client credentials (Firebase Web API key, etc.) are, by design, public — client‑side Firebase API keys are not secrets. The actual security boundary is enforced by **Firebase Security Rules** on Firestore and the Realtime Database. Reports demonstrating that these rules allow unauthorized access, modification, or deletion of another user's game or account data are in scope and appreciated.
- The bundled Stockfish engine runs entirely sandboxed within the browser's WebAssembly runtime and does not have network or filesystem access.
