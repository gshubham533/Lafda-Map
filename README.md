# LafdaMap

Real-time incident mapping (MVP). Next.js 14, Supabase (anonymous auth + Realtime), **MapLibre** + [OpenFreeMap](https://openfreemap.org/) tiles (free, no API key).

### Database (Phase 2)

Run the SQL migration once in the Supabase **SQL Editor** (or via Supabase CLI):

- File: [`supabase/migrations/20250322120000_incidents.sql`](supabase/migrations/20250322120000_incidents.sql)

This creates `public.incidents`, RLS policies, and adds the table to `supabase_realtime`. If Realtime does not stream, open **Database → Replication** and ensure `incidents` is enabled.

To test pins, insert from the **SQL Editor** (runs with privileges that bypass RLS), reusing a real `auth.users` id:

```sql
insert into public.incidents (user_id, type, title, lat, lng)
select id, 'chaos', 'Test pin', 18.5204, 73.8567
from auth.users
limit 1;
```

Or use **Table Editor** as a project admin (service role), with a valid `user_id` and `type` in `street_fight` | `road_rage` | `jcb` | `chaos`.

### Live streaming (Phase 5)

Run:

- [`supabase/migrations/20250322140000_live_sessions.sql`](supabase/migrations/20250322140000_live_sessions.sql)

This adds `public.live_sessions`, RLS, triggers that flip `incidents.is_live`, the `live_session_viewer_delta` RPC, and Realtime for `live_sessions`. Ensure **Database → Replication** includes `live_sessions` if changes do not push to clients.

**WebRTC**: the app uses **simple-peer** with public **STUN** only by default. Symmetric NAT / strict firewalls may need a **TURN** provider later; set comma-separated ICE URLs in `NEXT_PUBLIC_WEBRTC_ICE_SERVERS` (see `.env.example`).

Signaling uses **Supabase Realtime broadcast** on channel `live:{sessionId}`. Chat messages are also written to **`live_chat_messages`** (see migrations below) so they appear on the incident page and in **All events** flows.

**Additional migrations** (run in order after the base incidents + live tables):

- [`20250322150000_reporter_only_live.sql`](supabase/migrations/20250322150000_reporter_only_live.sql) — `start_live_session_for_incident` RPC; only the incident reporter can start a live session.
- [`20250322160000_live_chat_peak.sql`](supabase/migrations/20250322160000_live_chat_peak.sql) — `peak_viewers` on `live_sessions`, `live_chat_messages` + RLS.
- [`20250322170000_incident_media.sql`](supabase/migrations/20250322170000_incident_media.sql) — Storage bucket **`incident-media`**, `incident_media` table + RLS (reporter uploads; public read).

**Storage**: create the bucket via migration above; in the dashboard, confirm **Storage → incident-media** exists and is public if you want direct `getPublicUrl` links. Max file size and MIME allowlists can be tightened in the dashboard for production.

**Privacy**: the incident list (`/events`), chat log, and media gallery are **world-readable** to anyone with the URL (same as the map). Moderation is via Supabase Studio for now.

## Setup

1. Copy environment variables:

   ```bash
   cp .env.example .env.local
   ```

2. Fill in [`.env.local`](.env.example):

   - **Supabase**: project URL and anon key. In the Supabase dashboard, enable **Authentication → Providers → Anonymous sign-ins** so `signInAnonymously()` works.
   - **Map** (optional): `NEXT_PUBLIC_MAP_STYLE_URL` to use another MapLibre style; default is OpenFreeMap dark.
   - **Map center** (optional): `NEXT_PUBLIC_MAP_DEFAULT_CENTER` as `lat,lng,zoom` (default is Pune).

3. Install and run:

   ```bash
   npm install
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run start` — run production build locally
- `npm run lint` — ESLint

## Deploy (Vercel)

1. Push the repo to GitHub/GitLab/Bitbucket and [import the project](https://vercel.com/new) in Vercel (Next.js is detected automatically).
2. **Environment variables**: add every key from [`.env.example`](.env.example) in the Vercel project **Settings → Environment Variables** (Production / Preview / Development as needed). At minimum:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Optional: `NEXT_PUBLIC_MAP_DEFAULT_CENTER`, `NEXT_PUBLIC_MAP_STYLE_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_WEBRTC_ICE_SERVERS`
3. Set **`NEXT_PUBLIC_SITE_URL`** to your production origin (e.g. `https://your-app.vercel.app`) so shared incident links and Open Graph URLs resolve correctly.
4. Deploy. No custom `vercel.json` is required for this app.

## PWA (install)

The app ships a [Web App Manifest](app/manifest.ts) and [`public/icon.svg`](public/icon.svg). On supported mobile browsers you can **Add to Home Screen** for a standalone-like experience. Offline caching is not included (no service worker); refresh requires network.

## Smoke test checklist

Run through after a deploy or before a release:

| Step | Action |
|------|--------|
| 1 | Map loads, filters work, GPS dot appears if permission granted |
| 2 | Report incident → submit → new pin appears for everyone (Realtime) |
| 3 | Tap pin → detail sheet → Share copies/opens link |
| 4 | Open `/incident/{id}` → metadata + “View on map” works |
| 5 | Go live → camera/mic → another device Watch live → video/chat (same network easiest) |
| 6 | Host ends stream → pin stops pulsing, `is_live` clears |
