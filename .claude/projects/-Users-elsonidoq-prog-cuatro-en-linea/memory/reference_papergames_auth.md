---
name: reference-papergames-auth
description: "papergames.io auth API: login needs reCAPTCHA (blocks server-side login); refresh works without it; token lifetimes"
metadata:
  node_type: memory
  type: reference
---

# Papergames.io authentication API (reverse-engineered 2026-06-18)

Captured live via Chrome DevTools MCP network inspection during a real login. No secrets stored here.

- **Login**: `POST https://papergames.io/api/authentication/login`, body `{ username: <email>, password }`. **Requires a reCAPTCHA v2 token** sent as `recaptcha: <token>` + `recaptchaversion: v2` headers (site key `6LcerRsrAAAAAH3yoyyl415MZqI9a116JH24dmkt`). Returns `{ access, refresh }` (JWTs) and sets HttpOnly cookies `Authentication`/`Refresh`/`connect.sid`. The reCAPTCHA token is **domain-bound to papergames.io** — cannot be generated from our origin, so **fully server-side automated login is impossible**.
- **Refresh**: `POST https://papergames.io/api/authentication/refresh`, empty body, **no reCAPTCHA** — authenticates purely via the `Refresh` cookie/token. 401 if no valid refresh token.
- **Token lifetimes** (from JWT `exp`): access ≈ **30 min** (`Max-Age=1800`); refresh ≈ **366 days** (`Max-Age≈31.6M`). JWT payload = `{ username, id, iat, exp }` where `id` is the papergames account id.
- **Guest** path (what the app uses today): `POST /api/authentication/guest-registration` → throwaway token; the WS handshake frame is `40{"token":"<token>"}` (same for guest or real access token).

**Consequence for real-account play**: the only viable path is a one-time human login (solves reCAPTCHA) → capture the long-lived `Refresh` token → server mints access tokens via `/refresh`. In a pure web app the resulting session is unreadable (HttpOnly, cross-origin sandbox), so capture would need a browser extension or desktop/webview. This is why real-account play was **shelved** — see [[project-papergames-live-game-integration]].
