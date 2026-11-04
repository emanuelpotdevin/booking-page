# Booking page: setup playbook for Claude Code

This repository is a self-hosted, single-owner online booking page with an iPhone "glass" look. It runs on Next.js on Vercel, stores its settings in Upstash Redis, and uses Google Calendar for availability and bookings. Each business owner runs **their own copy**.

The person you're working with is usually a **business owner, not a developer**. Your job is to take them from nothing to a live, branded booking link that writes real bookings into their Google Calendar. [SETUP.md](SETUP.md) is the human-readable version of the same steps. Keep both in sync if you change one.

If the user only asks for code changes, skip the playbook and see **For developers** at the bottom.

---

## Ground rules (read first)

**The owner must do these themselves.** Never do them for the owner, even if they ask:
- Create accounts (GitHub, Vercel, Google Cloud, Upstash), sign in, or enter passwords or 2-step codes
- Accept terms of service or policies (Upstash "Accept and Create", Google API user-data policy checkbox)
- Paste **secret values**: the Google **Client secret**. Pasting it and saving is the owner's job.

**Things you may do** when the owner asks you to drive their browser (e.g. with Claude in Chrome):
- Click through settings, fill in non-secret fields, choose free plans, and redeploy
- Copy the **Client ID**, which isn't a secret

Also:
- **Never ask for a secret in chat**, and never read one off the screen. After clicking **Create** on the Google OAuth client, don't take screenshots of that dialog. Hand over to the owner.
- **Least privilege:** when installing the Vercel GitHub app, choose *Only select repositories* and pick only their booking-page repo.
- **Privacy defaults:** decline optional cookie or tracking banners.
- **Ask before anything that emails someone.** A test booking sends a real Google invite to the guest.
- Keep messages short and friendly, and avoid jargon. Say "key" rather than "OAuth client".

---

## Step 0: Collect branding and preferences

Ask a few questions at a time, in plain language. If they share a banner, logo or website, offer to derive the answers from it (name, tagline, colours, a square crop of a portrait).

1. Business name, and their name as guests should see it (can be left empty)
2. Welcome line / tagline (offer 2–3 suggestions)
3. Square logo or photo. Check that it's suitable as a profile picture.
4. Accent colour. If they give a light colour, darken it so white button text stays readable.
5. Time zone (detect it from their browser if you can)
6. Working hours per weekday, including breaks
7. Meeting types: name, duration, and Google Meet, phone or in person (with address)
8. Per meeting type: guest questions, buffer before/after
9. Minimum notice, booking window (days ahead), maximum bookings per day
10. **Which Google account holds their calendar.** An address on their own domain (Google Workspace) can use the **Internal** audience, which is simpler. A `@gmail.com` address needs **External** plus publishing.
11. Whether they already have GitHub and Vercel accounts

Write the answers to `my-setup.md` (git-ignored, not committed) so they can be reused.

## Step 1: Their own copy of the code
- They need a GitHub account. They click **Use this template**, then **Create a new repository** on the template repo, and name it e.g. `booking-page` (private is fine).

## Step 2: Deploy on Vercel
1. They sign up at vercel.com with **Continue with GitHub** (their click), on the **Hobby** (free) plan.
2. Open `https://vercel.com/new`. If GitHub isn't connected, install the Vercel GitHub app via `https://github.com/apps/vercel/installations/new`:
   - choose their personal account
   - choose **Only select repositories**, then their repo
   - click **Install**
3. Import the repo and set **Project name** to something like `book-<name>`. This sets the URL: `https://book-<name>.vercel.app`.
4. Click **Deploy** and wait about 40 s. Note the production URL. Below it's called **YOUR-URL**.

## Step 3: Storage (Upstash Redis)
1. Open Project → **Storage** → **Create Database** → **Upstash** → **Upstash for Redis** → **Continue**.
2. **Accept and Create** is the owner's click (terms).
3. Leave the primary region on Washington, D.C. (iad1), which matches Vercel's default function region. Choose the **Free** plan, then **Continue** → **Create**.
4. **Connect the database to the project.** Creating it doesn't connect it.
   - Go to Storage → the database row → **Connect**.
   - Set the **Custom Environment Variable Prefix** to `KV`. The app reads `KV_REST_API_URL` and `KV_REST_API_TOKEN`, and also accepts `UPSTASH_REDIS_REST_URL` / `_TOKEN`.
   - Click **Connect Project**.
5. Check under Settings → Environment Variables that `KV_REST_API_URL` and `KV_REST_API_TOKEN` exist.
6. While you're there, add `OWNER_EMAIL` as type **Config**, environment **Production**, with the calendar Google account's address as the value. It isn't a secret.

## Step 4: Google Cloud
Use the **same Google account as the calendar**. Check which account is signed in (top-right account button) before doing anything.

**4a. Create the project.**
- Go to `https://console.cloud.google.com/projectcreate` and name it "Booking page".
- After it's created, **switch to it**: the console often stays on another project. Note the project ID.

**4b. Enable the Calendar API.**
- Open `https://console.cloud.google.com/apis/library/calendar-json.googleapis.com?project=<ID>` and click **Enable**.

**4c. Set up the consent screen** at `https://console.cloud.google.com/auth/overview?project=<ID>` → **Get started**:
- App name: e.g. "<Name> Booking". Support email: their email.
- Audience: **Internal** for Workspace, **External** for Gmail.
- Contact email: their email.
- The **policy agreement checkbox and Create** are the owner's clicks.

**4d. External only: branding, then publish.** Publishing is required: in "Testing" mode Google disconnects the calendar every 7 days.
1. Open `/auth/branding?project=<ID>` and fill in:
   - **Application home page:** `https://YOUR-URL`
   - **Application privacy policy link:** `https://YOUR-URL/privacy` (this page ships with the app)
   - **Authorised domains:** add `YOUR-URL` without `https://`
2. Click **Save**. Publishing stays greyed out until these are filled in.
3. Open `/auth/audience?project=<ID>` → **Publish app** → **Confirm**. The status should say **In production**. This is safe: only `OWNER_EMAIL` can open the settings.

**4e. Create the key.**
1. Open `/auth/clients/create?project=<ID>`:
   - Application type: **Web application**
   - Authorised redirect URI: `https://YOUR-URL/api/auth/callback` (exact, with no trailing slash)
   - Click **Create**.
2. **Stop taking screenshots now.** The dialog shows the secret, only once.

## Step 5: Keys in Vercel
1. `GOOGLE_CLIENT_ID`:
   - You may copy it with the copy icon in the client list (`/auth/clients?project=<ID>`).
   - Paste it into a new Vercel variable: type **Config**, environment **Production**.
   - Zoom in to check that the full value went in.
2. `GOOGLE_CLIENT_SECRET` is **the owner's paste**.
   - You can open the Add Environment Variable form, type the key name, and leave the empty Value box focused for them.
   - The secret starts with `GOCSPX-`.
3. Optional: `SESSION_SECRET`. The app falls back to the Google client secret if it isn't set.
4. **Redeploy:** Deployments → **⋯** on the latest production deployment → **Redeploy** → **Redeploy**.
5. Check: `curl -s -o /dev/null -w "%{redirect_url}" https://YOUR-URL/api/auth/google` should point to `accounts.google.com` with their client ID.

**Showing tabs to the owner:** tabs you open with browser tools may sit in a separate tab group the owner can't see. When they need to act on a page, open it in their normal browser window with `open "<url>"` (macOS) and tell them which tab to look at.

## Step 6: Connect and configure
1. Open `https://YOUR-URL/admin` → **Continue with Google** → pick the calendar account.
2. External apps show "Google hasn't verified this app". This is expected for a private app: **Advanced** → **Go to YOUR-URL (unsafe)**.
3. **Tick both calendar permissions** → **Continue**. You land on `/admin?connected=1`.
4. Enter the Step 0 answers in the setup screen: Branding → Google Calendar (time zone) → Availability → Meeting types → Booking rules → Your link.
   - Upload the logo with the file input, not via a native picker.
   - You can also save everything in one go from the signed-in page with `fetch('/api/settings')` GET, then PUT the modified JSON. Set `setupComplete: true`.
5. Check: `GET /api/availability?event=<slug>&from=<iso>&to=<iso>` returns `"preview": false`, which means the real calendar is being read. Times that are busy in their calendar should be missing.
6. **Test booking (ask first, because it emails the guest):** book from a private window with a second email address of theirs. Check that the event shows up in Google Calendar with a Meet link.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `/admin?error=google_error` right after allowing access | Check Vercel → Logs. **"The provided client secret is invalid"** means the wrong value was pasted. Fix: Google client page → **Add secret** → owner pastes it into the `GOOGLE_CLIENT_SECRET` **Edit** box in Vercel → Redeploy. |
| `redirect_uri_mismatch` | The redirect URI doesn't exactly match `https://YOUR-URL/api/auth/callback`. Google can take ~5 min to apply changes. |
| **Publish app** is greyed out | Branding is missing the home page, privacy link or authorised domain (Step 4d). |
| "Access blocked / not a test user" | The External app isn't published yet. |
| `not_owner` | `OWNER_EMAIL` doesn't match the signed-in account. Fix it, then redeploy. |
| "Google keys are missing" | The keys were added but there was no redeploy. |
| Settings won't save / "No storage connected" | The database was created but not **connected** (Step 3.4), or the prefix isn't `KV`. Redeploy after fixing. |
| No times show | Check that the weekday is on, the meeting type is Bookable, and the notice and window rules aren't too strict. |
| Calendar disconnects weekly | The app is still in Testing. Publish it, then reconnect at `/admin`. |

## Custom domain (optional)
1. Vercel → Settings → Domains → add `book.theirdomain.com` and set the CNAME at their DNS provider.
2. In Google, add a **second** redirect URI `https://book.theirdomain.com/api/auth/callback`. For External apps, also add the domain to Authorised domains and update the home and privacy links.

---

## For developers
- Run locally: `npm install && npm run dev`, then open http://localhost:3000.
  - Without Google keys, `/admin` opens without login (dev only), busy times aren't checked, and settings are saved to `.data/store.json` (git-ignored).
- Environment variables: see `.env.example`. Never commit real values. `.env*` files are git-ignored.
- Code map:
  - `lib/availability.ts`: slot calculation (hours, notice, window, buffers, daily limit, busy times)
  - `lib/google.ts`: Calendar API over plain fetch
  - `lib/store.ts`: Redis or local file
  - `lib/session.ts`: owner login cookie
  - `components/admin/SetupWizard.tsx`: setup screen
  - `components/BookingFlow.tsx`: guest booking flow
  - `app/privacy/page.tsx`: privacy policy that Google requires
