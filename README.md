# Booking page

A minimal, iPhone-glass-style online booking page connected to your Google Calendar. One owner per copy. It's free to run on Vercel, Upstash and Google.

- Meeting types, each with its own duration, link, location (Google Meet, phone or in person) and guest questions
- Weekly working hours with multiple blocks per day
- Buffers before and after meetings, minimum notice, booking window and a daily limit
- Busy times in Google Calendar are hidden, and bookings are written to your calendar with a Meet link
- Guests see times in their own time zone

## Get your own

**Option A: let Claude Code set it up with you (recommended)**
1. Click **Use this template**, then **Create a new repository** on this page.
2. Open your new repository in [Claude Code](https://claude.com/claude-code) (desktop app or terminal).
3. Say: **"Help me set up my booking page."**

Claude follows the step-by-step playbook in [CLAUDE.md](CLAUDE.md):
- asks for your branding
- deploys to Vercel
- connects storage and Google Calendar
- fills in your settings

It stops for the few clicks only you can do: creating accounts, accepting terms and pasting your secret key.

**Option B: do it yourself.** Follow [SETUP.md](SETUP.md). It takes about 30 minutes and needs no coding.

## Privacy
Bookings are stored in your own Google Calendar. The page only reads *when* you're busy, not what your meetings are about. Each copy includes a privacy page at `/privacy`.
