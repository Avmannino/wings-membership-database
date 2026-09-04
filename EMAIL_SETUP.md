# Sending Membership Passes by Email

Clicking **Email** in the Send QR Code menu posts to a Cloudflare
Worker, which verifies the caller is signed-in Wings Arena staff and
then sends the pass through Resend. The member receives a real email
with the QR code attached as a PNG.

The mail provider's API key lives only in the worker. Nothing secret
is ever shipped to the browser, which matters because this repo is
public and the site is static.

Total cost: nothing. Cloudflare Workers allows 100,000 requests a
day on the free plan and Resend allows 3,000 emails a month, neither
of which requires a card.

## 1. Create a Resend account

Sign up at <https://resend.com> and create an API key.

For testing you can send from `onboarding@resend.dev`, which works
immediately but only delivers to the address you signed up with.

For real use, verify a domain you own (Resend walks you through the
DNS records) and send from an address on it such as
`noreply@wingsarena.com`. Mail from an unverified domain mostly
lands in spam.

## 2. Configure the worker

Edit `worker/wrangler.toml`:

- `FIREBASE_PROJECT_ID` — already set to this project
- `ALLOWED_ORIGINS` — origins permitted to call the worker. Add
  `http://localhost:5173` while developing
- `MAIL_FROM` — your verified sender address

## 3. Deploy it

```bash
cd worker
npx wrangler login
npx wrangler secret put RESEND_API_KEY   # paste the Resend key
npx wrangler deploy
```

The deploy prints the worker URL, something like
`https://wings-pass-email.your-name.workers.dev`.

The API key is stored as a secret, so it never enters the repo.

## 4. Point the app at the worker

Create `.env` in the project root (it is gitignored):

```
VITE_PASS_EMAIL_ENDPOINT=https://wings-pass-email.your-name.workers.dev
```

Then rebuild and redeploy the site. Vite bakes this value into the
bundle at build time, so a rebuild is required after any change.

The URL is not a secret — the worker checks who is calling rather
than relying on its address staying private.

## 5. Confirm the Firestore rule

The worker confirms staff identity by reading the caller's own
`staff` document through the Firestore REST API, using the caller's
token. Your rules must therefore let a signed-in user read their own
staff document:

```
match /staff/{uid} {
  allow read: if request.auth != null && request.auth.uid == uid;
  allow write: if false;
}
```

Without this the worker cannot confirm staff and will reject every
send with an authorization error.

## How requests are checked

1. The browser attaches the staff member's Firebase ID token.
2. The worker verifies that token's signature against Google's
   public keys and checks its issuer, audience, and expiry.
3. It reads the caller's `staff` document to confirm the role.
4. Only then does it call Resend.

An unauthenticated request, a signed-in user who is not staff, or a
request from an origin outside `ALLOWED_ORIGINS` is all rejected
before any mail is sent.

## Testing locally

```bash
cd worker
npx wrangler dev
```

Put the printed localhost URL in `.env`, add `http://localhost:5173`
to `ALLOWED_ORIGINS`, and run `npm run dev` in the project root.

## Notes

- Errors surface in the UI. A rejected send shows the provider's own
  message rather than a generic failure.
- There is no rate limiting. If the endpoint is ever abused despite
  the auth checks, Cloudflare's dashboard has rate limiting rules.
- SMS still opens the staff member's messaging app. Sending texts
  directly needs Twilio plus A2P 10DLC carrier registration.
