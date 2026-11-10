# Hosted in-app notification vendors for Cadence

Research for [#2](https://github.com/davidschwarz3/cohort-005-project-001/issues/2) under map [#1](https://github.com/davidschwarz3/cohort-005-project-001/issues/1).
All pricing pages and docs were read on **2026-11-10**. npm versions are the `latest` dist-tag from the npm registry on the same day.

Cadence context: React 19.2 + React Router 8.3 (SSR), Node server, SQLite. Requirements from the map: a persistent inbox (bell, unread count, feed, mark-as-read) **and** real-time toasts, the vendor's prebuilt UI, hosted SaaS only, a free tier that covers a cohort-sized platform, a React SDK, a Node/HTTP trigger API, and per-user preferences as a nice-to-have. The v1 event shortlist has **5–6 event types** (new Refund Request, Refund approved/declined, reply, new question, Seat claimed). That number matters for Novu's workflow cap.

## Summary table

| | **Knock** | **Courier** | **Novu Cloud** | **SuprSend** | **MagicBell** |
|---|---|---|---|---|---|
| Free tier | 10,000 messages/mo, unlimited workflows/profiles, unlimited feed retention, 30-day logs | 10,000 sends/mo | 10,000 workflow runs/mo, **max 5 workflows**, 2 envs, 24 h activity retention, Novu branding | 10,000 notifications/mo, feed **with SuprSend branding** | **1,000 deliveries/mo**, 1 project |
| First paid tier | Starter $250/mo | Business $0.005/send, pay as you go | Pro from $30/mo | Essentials $100/mo | Startup $249/mo |
| React package (version) | `@knocklabs/react` 0.15.1 | `@trycourier/courier-react` 9.3.5 | `@novu/react` 3.19.2 | `@suprsend/react` 1.5.0 | `@magicbell/react` 1.14.0 |
| React 19 | Yes, in the peer deps (`^17 \|\| ^18 \|\| ^19`) | Peer dep `>=18`; docs say only "React 18+" | Yes, in the docs and the peer deps | Peer dep `>=16.8` | Not stated |
| SSR safety | Ships `"use client"`; client-only widgets | Docs: "render client-side only", needs `'use client'` | Not documented; the UI renders with SolidJS inside (client-only) | Not documented | Not documented |
| Prebuilt inbox | `NotificationFeedPopover`, `NotificationIconButton`, `NotificationFeed` | `CourierInbox` | `<Inbox />` (bell, popover, preferences) | `<Inbox />` popover | `Inbox`, `FloatingInbox` |
| Toasts | **You build them**: listen for `items.received.realtime` and render with react-hot-toast/sonner | **Built in**: `<CourierToast />` | Not built in (not documented) | **Not built in** ("no longer included in Inbox by default") | **Built in**: `ToastContainer`, on by default |
| Real-time | WebSocket (Phoenix channels, in `@knocklabs/client` deps) | WebSocket (`listenForUpdates()`) | WebSocket (socket.io/partysocket; `wss://…socket.novu.co`) | WebSocket (socket.io-client) | WebSocket (reconnecting-websocket) |
| Node trigger | `@knocklabs/node` 1.41.1; `POST /v1/workflows/{key}/trigger` | `@trycourier/courier` 10.0.0; send API | `@novu/api` 3.19.1; `POST /v1/events/trigger` | `@suprsend/node-sdk` 1.15.1 | REST API (v2) |
| Browser inbox auth | RS256 JWT signed on our server (`signUserToken`), enforced by "enhanced security mode" | JWT minted by an API call (`POST /auth/issue-token`) with scopes | HMAC-SHA256(secret, subscriberId) → `subscriberHash` | ES256 JWT signed on our server, "enhanced security mode" | HS256 JWT signed with the project secret |
| Preferences | Preferences API plus a hosted center; **no prebuilt React UI** | `<CourierPreferences />` | `Preferences` built into the Inbox | Through the client/hooks (`getPreferences`) | `UserPreferences` component |
| Dev/test | Separate environments (Development/Production), each with its own keys | Test/production environments (not verified on a page) | Dev + Prod environments (2 on free) | Staging/production workspaces (not verified on a page) | Only 1 project on free, so no separate dev project |

## Per vendor

### Knock

- **Pricing** ([knock.app/pricing](https://knock.app/pricing), 2026-11-10): Developer plan is $0 and needs no card. It includes 10,000 messages/mo (bounced or failed messages don't count), unlimited stored profiles, workflows, channels and team members, unlimited (configurable) feed retention, and 30-day log retention. Knock branding can't be removed on the free plan. Starter is $250/mo for 50k messages, then $0.005 each. This is the most generous free tier with no structural cap.
- **React**: `@knocklabs/react` 0.15.1 declares peer `react ^17 || ^18 || ^19`. Its peer list also includes `next` and `@tanstack/react-router`, which look optional for the guides/location features. The dist bundle carries `"use client"` directives. Components: `KnockProvider` (`apiKey`, `user={{ id }}`, `userToken`), `KnockFeedProvider` (`feedId`), `NotificationIconButton`, `NotificationFeedPopover` and `NotificationFeed`. Styling uses `@knocklabs/react/dist/index.css` and `--rnf-*` CSS variables. ([feed docs](https://docs.knock.app/in-app-ui/react/feed))
- **Toasts**: "there are no out-of-the-box toast components". The documented pattern is `feedClient.on("items.received.realtime", …)` plus `toast.custom(...)` from react-hot-toast. ([toasts](https://docs.knock.app/in-app-ui/react/toasts)) That is about 20 lines of our own code.
- **Real-time**: WebSocket. `@knocklabs/client` 0.23.1 depends on `phoenix`, and the docs describe socket auto-management for inactive tabs.
- **Trigger**: `POST /v1/workflows/{key}/trigger` with `recipients` (ids or inline identify objects), `actor`, `data` and `tenant`. ([API ref](https://docs.knock.app/api-reference/workflows/trigger)) The Node SDK is `@knocklabs/node`. Inline identify lets us send name/email with the trigger, so no separate sync step is needed.
- **Auth**: "Enhanced security mode" makes Knock reject public-key client requests that lack a user token. The token is an RS256 JWT with `sub` = user id plus `iat`/`exp`, signed with a signing key from the dashboard. The Node helper is `signUserToken(userId, { expiresInSeconds })` from `@knocklabs/node/lib/tokenSigner`. Signing happens locally with no network call, and the client gets `onUserTokenExpiring`. ([security](https://docs.knock.app/in-app-ui/security-and-authentication)) This fits a React Router loader: sign the token in the root loader and pass it to `KnockProvider`.
- **Preferences**: A `PreferenceSet` (categories / channel_types / channels / workflows → boolean, default opt-in) and a hosted preference center. We would have to build any in-app UI ourselves. ([preferences](https://docs.knock.app/preferences/overview))
- **Dev/test**: Separate environments with their own keys. The docs suggest leaving enhanced security off in Development and turning it on in Production. The trigger example also shows a `settings.sandbox_mode` flag (not explained on the page, so unverified).
- **User data**: Only the user id is required. Name and email are optional and only needed for templates or other channels.

### Courier

- **Pricing** ([courier.com/pricing](https://www.courier.com/pricing), 2026-11-10): Developer plan includes 10,000 sends/mo, with no seat or channel fees. Business is $0.005/send with no listed base fee. The page doesn't say whether Inbox or retention limits apply on the free plan (**unverified**).
- **React**: `@trycourier/courier-react` 9.3.5 has peer `react >=18`. The docs say "React 18+" but never mention React 19 (**React 19 is unverified**; the peer range permits it). The docs say Inbox and Toast "render client-side only" and need `'use client'` in Next.js. The old `@trycourier/react-inbox`/`react-toast` packages are deprecated. ([React SDK](https://www.courier.com/docs/sdk-libraries/courier-react-web), [inbox overview](https://www.courier.com/docs/platform/inbox/inbox-overview))
- **Toasts**: Built in. `<CourierToast />` shows messages that arrive while the app is open and stays in sync with the Inbox feed. `useCourier().toast.addMessage/removeMessage` give manual control.
- **Real-time**: WebSocket, opened by `listenForUpdates()`.
- **Auth**: Our backend calls `POST /auth/issue-token` with the workspace API key and scopes `user_id:<id> inbox:read:messages inbox:write:events` (plus `read:preferences write:preferences` for the preference center) and `expires_in`. Without `expires_in` the token **never expires**. The SDKs don't refresh tokens. ([auth](https://www.courier.com/docs/platform/inbox/authentication)) The cost is one network round trip to Courier per token mint, which we would cache per session.
- **Preferences**: `<CourierPreferences />` plus the `useCourier().preferences` hook.
- **Dev/test**: Courier has test and production environments with separate keys. I know this from general knowledge and did **not re-verify it on a page today**.

### Novu Cloud

- **Pricing** ([novu.co/pricing](https://novu.co/pricing), 2026-11-10): Free plan includes 10,000 workflow runs/mo, **up to 5 workflows**, 2 environments (Dev/Prod), 24 h activity-feed retention and 3 team members. Branding removal is paid only. Pro starts at $30/mo for 30k runs, with $1.20 per extra 1k. Subscribers appear "Unlimited" in the comparison table, but the table layout made this hard to read for sure.
- **Workflow cap matters**: The v1 shortlist is 5–6 event types. Splitting approved and declined into separate workflows would reach 6. We could fit under the cap by sharing workflows and branching on payload, but the cap blocks any growth on the free plan.
- **React**: `@novu/react` 3.19.2. React 18+ is required and React 19 is supported (docs and peer deps). The UI is rendered by `@novu/js`, which uses SolidJS internally, so it is effectively client-only. The docs give no SSR guidance. `<Inbox applicationIdentifier subscriberId routerPush={(p) => navigate(p)} />`, and the docs use React Router's `useNavigate` for `routerPush`. ([quickstart](https://docs.novu.co/platform/quickstart/react), [overview](https://docs.novu.co/platform/inbox/overview))
- **Toasts**: The docs don't describe any. We would build them from SDK events (**unverified** which event).
- **Real-time**: WebSocket. The EU config documents `socketUrl: wss://eu.socket.novu.co`, and `@novu/js` depends on socket.io-client and partysocket.
- **Trigger**: `POST /v1/events/trigger` with `Authorization: ApiKey <secret>` and body `{ name/workflowId, to: subscriberId | {subscriberId, email, firstName,…} | [≤100], payload }`. Node SDK: `new Novu({ secretKey }).trigger({ workflowId, to })`. ([trigger](https://docs.novu.co/api-reference/events/trigger-event)) The page doesn't confirm that a recipient is auto-created from `to` (**unverified**).
- **Auth**: The HMAC toggle is set on the In-App integration. Then `subscriberHash = HMAC-SHA256(NOVU_SECRET_KEY, subscriberId)` as hex, passed as a prop, and the Inbox won't load without it. It also authorises profile updates from the client. ([prod checklist](https://docs.novu.co/platform/inbox/prepare-for-production)) This is the simplest auth of the five, but the hash never expires.
- **Preferences**: A `Preferences` view is built into the Inbox, per workflow and channel.

### SuprSend

- **Pricing** ([suprsend.com/pricing](https://www.suprsend.com/pricing), 2026-11-10): Free plan includes 10k notifications/mo, an in-app feed **with SuprSend branding**, unlimited channels and team members. Essentials is $100/mo for 50k.
- **React**: `@suprsend/react` 1.5.0 (the old `@suprsend/react-inbox` is end-of-support) has peer `react >=16.8`. React 19 and SSR are not documented. `SuprSendProvider` takes `publicApiKey`, `distinctId`, `userToken` and `refreshUserToken`. ([react sdk](https://docs.suprsend.com/docs/react-sdk), [feed](https://docs.suprsend.com/docs/react-in-app-feed))
- **Toasts**: "toast notification functionality is no longer included in Inbox by default", so we would build them ourselves.
- **Real-time**: WebSocket (socket.io-client in `@suprsend/web-sdk`). The SDK exposes connection status (ONLINE/DEGRADED/AUTH_ERROR…).
- **Auth**: An ES256 JWT `{ entity_type: 'subscriber', entity_id, exp, iat, scope? }` signed with a dashboard signing key, required when enhanced security mode is on. ([client auth](https://docs.suprsend.com/docs/client-authentication))
- **Preferences**: Read and written through the client (`user.preferences.getPreferences()`). The docs don't show a prebuilt React preference UI (**unverified**).

### MagicBell

- **Pricing** ([magicbell.com/pricing](https://www.magicbell.com/pricing), 2026-11-10): Builder plan is $0 for **1,000 deliveries/mo** and 1 project. Startup is $249/mo for 50k. The free tier is 10× smaller than the others, and having only 1 project means no separate dev/prod.
- **React**: `@magicbell/react` 1.14.0 (no peer deps declared; the older `@magicbell/magicbell-react` 11.5.1 has peer `react >=18.3.1`). Components: `ContextProvider` (`token`), `Inbox`, `FloatingInbox`, `UserPreferences` and `ToastContainer`. Toasts are on by default. React version and SSR are not documented. ([React components](https://www.magicbell.com/docs/libraries/magicbell-react))
- **Real-time**: WebSocket (`reconnecting-websocket` dependency).
- **Auth**: An HS256 JWT signed with the project Secret Key, with claims `user_external_id` and/or `user_email` plus `api_key`. The examples use a 1-year expiry. ([user auth](https://www.magicbell.com/docs/api/authentication/user))
- **Fit**: It has the best built-in UI coverage (inbox, toasts and preferences), but the free tier is too small and leaves no room for a dev environment.

### Other contenders

No other vendor beat these on the "prebuilt React inbox + toasts + free tier" criteria in a quick look. Engagespot and Stream (Activity Feeds) exist but were **not researched**.

## What leaves Cadence (all vendors)

The minimum is a stable user id (Cadence `users.id`). Name and email are optional; we would only send them for template rendering ("Ana replied to your question"), and we could instead put them in each event payload. Each trigger also sends a payload: course title, Refund Request id/amount, comment excerpt, and so on. The vendor then stores those payloads for the feed's retention period (unlimited by default on Knock).

## Ranked recommendation

1. **Knock**. It has the best free tier (10k messages, unlimited workflows, no structural caps), declares React 19 explicitly and ships `"use client"`. Its user tokens are signed locally in a React Router loader (RS256, `signUserToken`) and can expire, and it has clean Development/Production environments. The trigger API accepts inline recipient identify, so no separate user-sync job is needed. **Gap:** no prebuilt toast and no prebuilt preferences UI. Toasts take about 20 lines on `items.received.realtime`, and preferences are only nice-to-have.
2. **Courier**. It is the only well-priced option with **both** a prebuilt inbox and a prebuilt toast (`<CourierToast />`) plus a preference center. The free tier is 10k sends with no workflow cap. **Gaps to check hands-on:** React 19 isn't stated (peer `>=18`), each token mint is an API round trip, tokens don't auto-refresh, and free-plan inbox retention is unstated.

Novu ranks a close third. It has good React 19 support, the simplest auth and built-in preferences. It drops below Courier because of the **5-workflow free cap** (the v1 catalogue already sits at 5–6 workflows), the forced branding and the missing toast. SuprSend (branding, no toast) and MagicBell (1,000 deliveries, 1 project) are not recommended.

## Unverified / flagged

- Courier: React 19 support, free-plan inbox retention and test-environment details.
- Novu: whether subscribers are auto-created from `to` on trigger, and any toast/new-notification event API.
- Knock: what `settings.sandbox_mode` does on trigger.
- SuprSend: prebuilt preference UI, React 19 and SSR.
- MagicBell: React 19 and SSR.
- Real-time transports were inferred from client SDK dependencies (npm registry) where the docs don't name them.
- Pricing pages change often. All figures are as of 2026-11-10.
