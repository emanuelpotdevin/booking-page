# Set up your own booking page

Your own online booking page, connected to your Google Calendar. It runs on free plans and takes about **30 minutes**. You don't need to write any code.

**What you get when you're done**
- A booking link like `https://your-name.vercel.app` (or `book.yourbusiness.com`)
- Your meeting types (e.g. a 15-min intro call and a 60-min strategy session), each with its own link
- Busy times in your Google Calendar are hidden automatically
- Every booking lands in your Google Calendar with a Google Meet link, and the guest gets an invite by email
- Buffers between meetings, minimum notice, how far ahead people can book, and a daily limit

---

## Step 0 — Have this ready

**Accounts** (all free):
- A **Google account**, the one whose calendar you want to use
- A **GitHub** account (github.com), which stores your copy of the code
- A **Vercel** account (vercel.com), which runs your booking page. Sign up with GitHub.

**Your branding.** Write your answers down now. You'll enter them in Step 6.

| Question | Example |
|---|---|
| 1. Business name | Northwind Studio |
| 2. Your name, as guests see it | Sam |
| 3. Welcome line on your page | "Pick a time that works for you." |
| 4. Logo or photo (square image, PNG or JPG) | logo.png |
| 5. Brand / accent colour (a hex code, or pick one from the presets) | #0A84FF |
| 6. Your time zone | Europe/Amsterdam |
| 7. Your working hours per day | Mon–Fri 09:00–17:00, lunch 12:00–13:00 off |
| 8. Your meeting types: name, duration, location | Intro call · 15 min · Google Meet |
| 9. Questions to ask guests per meeting type | "Company name", "What do you want to discuss?" |
| 10. Buffer before / after meetings | 0 min before, 10 min after |
| 11. Minimum notice | 4 hours |
| 12. How far ahead people can book | 30 days |
| 13. Maximum bookings per day | 4 |
| 14. Optional: your own web address | book.yourbusiness.com |

---

## Step 1 — Get your own copy of the code

1. Sign in at **github.com**.
2. Open the GitHub page of this booking-page template (the link you were sent).
3. Click the green **Use this template** button, then **Create a new repository**.
4. Name it something like `booking-page`, set it to **Private**, and click **Create**.

## Step 2 — Put it online with Vercel

1. Go to **vercel.com** and choose **Sign up → Continue with GitHub**.
2. Click **Add New… → Project**.
3. Find `booking-page` in the list and click **Import**. If it isn't listed, click *Adjust GitHub App Permissions* and give Vercel access to that repository.
4. Leave every setting as it is and click **Deploy**. Wait about a minute.
5. Click **Continue to Dashboard**. Under **Domains** you'll see your address, for example `booking-page-abc.vercel.app`.
   👉 **Write this address down.** It's called *YOUR-URL* in the rest of this guide.

> The page already works now, with example content. The next steps connect your calendar and make it yours.

## Step 3 — Add storage (where your settings are saved)

1. In your Vercel project, click the **Storage** tab.
2. Click **Create Database**, or **Browse Marketplace**. Choose **Upstash**, then **Upstash for Redis**, then **Continue**.
3. Pick the **Free** plan and a region close to you (e.g. *Frankfurt*), then click **Create**.
4. On the next screen, make sure your `booking-page` project is selected with **all environments** ticked, then click **Connect**.

That's all. Vercel adds the storage keys for you.

## Step 4 — Connect Google (the longest step, about 10 min)

Here you create a private "key" that lets your booking page read your free/busy times and add bookings to your calendar.

### 4a. Create a Google Cloud project
1. Go to **console.cloud.google.com** and sign in with the **same Google account as your calendar**.
2. If asked, accept the terms.
3. Click the project picker at the top left, then **New project**. Name it `Booking page` and click **Create**. Make sure the new project is selected afterwards.

### 4b. Turn on the Calendar API
1. In the search bar at the top, type **Google Calendar API** and open it.
2. Click **Enable**.

### 4c. Set up the consent screen
1. In the search bar, type **Google Auth Platform** (or *OAuth consent screen*) and open it. Click **Get started**.
2. **App name:** your business name. **User support email:** your email. Click **Next**.
3. **Audience:**
   - If you use **Google Workspace** (an email on your own domain, like you@yourbusiness.com), choose **Internal**.
   - If you use a normal **@gmail.com** address, choose **External**.
4. **Contact email:** your email. Tick the agreement box and click **Create**.
5. **External only:** in the left menu, open **Branding** and fill in:
   - **Application home page:** `https://YOUR-URL`
   - **Application privacy policy link:** `https://YOUR-URL/privacy` (this page is already part of your booking page)
   - **Authorised domains:** click **Add domain** and enter `YOUR-URL` without `https://` (e.g. `booking-page-abc.vercel.app`)

   Click **Save**. Then open **Audience** and click **Publish app**, then **Confirm**.
   *Why: while the app is in "Testing" mode, Google disconnects your calendar every 7 days.*

### 4d. Create the key (OAuth client)
1. In the left menu, open **Clients**, then **Create client**.
2. **Application type:** *Web application*. **Name:** `Booking page`.
3. Under **Authorized redirect URIs**, click **Add URI** and paste:
   ```
   https://YOUR-URL/api/auth/callback
   ```
   For example: `https://booking-page-abc.vercel.app/api/auth/callback`. Use no trailing slash, and use your own address.
4. Click **Create**. A window shows your **Client ID** and **Client secret**. Keep this window open, or download the JSON. You need both in the next step.

> 🔒 Treat the Client secret like a password. Don't email it or paste it into a chat. Only paste it into Vercel, in Step 5.

## Step 5 — Add your keys to Vercel

1. In your Vercel project, go to **Settings → Environment Variables**.
2. Add these four, one at a time (**Key** on the left, **Value** on the right), and click **Save** after each:

| Key | Value |
|---|---|
| `GOOGLE_CLIENT_ID` | the Client ID from Step 4d |
| `GOOGLE_CLIENT_SECRET` | the Client secret from Step 4d |
| `OWNER_EMAIL` | your Google email address (only this account can open your settings) |
| `SESSION_SECRET` | a long random password of 32+ characters (use a password generator) |

3. Go to the **Deployments** tab. Click the **⋯** next to the top deployment, then **Redeploy**, then **Redeploy**. Wait about a minute.

## Step 6 — Set up your booking page

1. Open **`https://YOUR-URL/admin`**.
2. Click **Continue with Google** and choose your account.
3. **External / @gmail.com only:** Google shows *"Google hasn't verified this app."* This is expected, because it's your own private app. Click **Advanced**, then **Go to Booking page (unsafe)**.
4. **Tick both calendar permissions** and click **Continue**.
5. The setup screen opens. Fill in the answers you prepared in Step 0:
   1. **Branding:** name, logo, welcome line, colour
   2. **Google Calendar:** check that it says *connected*, and choose your time zone
   3. **Availability:** your weekly hours. Use *+ Block* for a lunch break, and *Copy to all* to save time.
   4. **Meeting types:** duration, location, buffers and guest questions for each
   5. **Booking rules:** minimum notice, booking window, daily limit
   6. **Your link:** copy your links and share them 🎉
6. **Test it:** open your link in a private window and book a meeting with a second email address. Check that it appears in your Google Calendar.

---

## Optional — Use your own web address (e.g. book.yourbusiness.com)

1. In Vercel, go to **Settings → Domains → Add**. Type `book.yourbusiness.com` and click **Add**.
2. Vercel shows a **CNAME** record. Add it at your domain provider (TransIP, GoDaddy, Cloudflare, …) under DNS settings. It can take up to an hour to work.
3. In Google Cloud, go to **Google Auth Platform → Clients**, open your client, and **add a second redirect URI**:
   `https://book.yourbusiness.com/api/auth/callback`. Click **Save**.
4. From now on, open `https://book.yourbusiness.com/admin` to change your settings.

---

## Troubleshooting

| You see | Fix |
|---|---|
| **Error 400: redirect_uri_mismatch** | The redirect URI in Step 4d doesn't exactly match your address. Check `https://`, spelling and that there's no `/` at the end. Changes in Google can take ~5 min to apply. |
| **"Access blocked"** or **"not a test user"** (External) | You skipped **Publish app** in Step 4c, point 5. |
| **"That Google account is not the owner"** | `OWNER_EMAIL` in Vercel doesn't match the account you signed in with. Fix it, then **Redeploy**. |
| **"Google keys are missing"** | You added the keys but didn't **Redeploy** (Step 5, point 3). |
| **"No storage connected"** / settings won't save | Do Step 3, then **Redeploy**. |
| **"Something went wrong talking to Google"** right after allowing access | Usually the Client secret in Vercel is wrong (e.g. the Client ID was pasted instead). In Google Cloud → Clients → your client, click **Add secret**, copy the new one, replace `GOOGLE_CLIENT_SECRET` in Vercel, and **Redeploy**. |
| **Calendar disconnected after a week** | Your app is still in *Testing*. Publish it (Step 4c, point 5), then reconnect at `/admin`. |
| **No times show up** | Check that the weekday is switched on under *Availability*, the meeting type is *Bookable*, and that minimum notice and booking window aren't too strict. |
| **Guests don't get an email** | Google sends the invite from your calendar. Ask them to check spam. The booking is always visible in your Google Calendar. |

## Good to know
- **Privacy:** the page only sees *when* you're busy, not what your meetings are about. Bookings are stored in your Google Calendar, not on the booking page.
- **Cancelling or moving a meeting:** do it in Google Calendar as usual. The guest is notified by Google.
- **Cost:** €0 on the free plans of Vercel, Upstash and Google for normal use by one person.
