import SetupWizard from "@/components/admin/SetupWizard";
import { Avatar } from "@/components/Avatar";
import { getTokens, getSettings, storageConfigured } from "@/lib/store";
import { devBypass, googleConfigured, isOwner, ownerEmail } from "@/lib/session";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  google_not_configured: "Google keys are missing. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Vercel → Settings → Environment Variables, then redeploy.",
  owner_email_missing: "OWNER_EMAIL is not set. Add it in Vercel → Settings → Environment Variables, then redeploy.",
  not_owner: "That Google account is not the owner of this booking page. Sign in with the account set in OWNER_EMAIL.",
  google_denied: "Google access was cancelled. Please try again and allow calendar access.",
  missing_scope: "Please tick both calendar permissions on the Google screen — they are needed to check your free time and add bookings.",
  no_refresh_token: "Google didn't return a long-term key. Remove this app at myaccount.google.com/permissions and connect again.",
  state_mismatch: "Your sign-in session expired. Please try again.",
  google_error: "Something went wrong talking to Google. Check your Client ID, Secret and redirect URL, then try again.",
};

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const settings = await getSettings();

  if (!(await isOwner())) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
        <div className="glass fade-in flex flex-col items-center p-8 text-center">
          <Avatar brand={settings.brand} size={64} />
          <h1 className="mt-5 text-[24px] font-semibold tracking-tight">Booking page setup</h1>
          <p className="muted mt-2 text-[15px]">Sign in with the Google account whose calendar you want to use.</p>
          {error && ERRORS[error] && <p className="mt-5 rounded-2xl bg-red-500/10 p-3 text-[14px] text-red-600 dark:text-red-400">{ERRORS[error]}</p>}
          {!googleConfigured && <p className="mt-5 rounded-2xl bg-amber-500/10 p-3 text-[14px]">{ERRORS.google_not_configured}</p>}
          <a href="/api/auth/google" className="btn btn-primary mt-6 w-full">
            <GoogleG /> Continue with Google
          </a>
        </div>
      </main>
    );
  }

  const tokens = await getTokens();
  return (
    <SetupWizard
      initial={settings}
      status={{
        calendarEmail: tokens?.email || "",
        googleConfigured,
        storageConfigured,
        devBypass,
        ownerEmail,
        error: error && ERRORS[error] ? ERRORS[error] : "",
      }}
    />
  );
}

function GoogleG() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] rounded-full bg-white p-[2px]">
      <path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.7 3.3-8Z" />
      <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.5-2.7c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2.1v2.8A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.7 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.1a11 11 0 0 0 0 9.8l3.6-2.8Z" />
      <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.1-3.1A11 11 0 0 0 2.1 7.1l3.6 2.8C6.6 7.3 9.1 5.4 12 5.4Z" />
    </svg>
  );
}
