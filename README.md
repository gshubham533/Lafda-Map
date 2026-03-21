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
