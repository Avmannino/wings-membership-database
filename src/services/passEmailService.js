import { auth } from "../firebase/firebase";

import { formatDate } from "../utils/dateUtils";

import { getPassRecipient } from "../utils/passDelivery";

const PASS_EMAIL_ENDPOINT =
  import.meta.env
    .VITE_PASS_EMAIL_ENDPOINT || "";

/*
  The mail provider's key lives in a Cloudflare Worker,
  which checks the caller is signed-in staff before it
  sends anything. The browser only ever holds its own
  Firebase sign-in token.
*/
export async function sendPassEmail({
  member,
  qrPngBase64,
}) {
  const recipient =
    getPassRecipient(member);

  if (!recipient.email) {
    throw new Error(
      "This member does not have an email address on file."
    );
  }

  if (!PASS_EMAIL_ENDPOINT) {
    throw new Error(
      "Email sending is not configured yet."
    );
  }

  const currentUser =
    auth.currentUser;

  if (!currentUser) {
    throw new Error(
      "Please sign in again to send this pass."
    );
  }

  const idToken =
    await currentUser.getIdToken();

  const response = await fetch(
    PASS_EMAIL_ENDPOINT,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        pass: {
          email: recipient.email,
          name: recipient.name,
          token: recipient.token,
          membershipType:
            recipient.membershipType,
          expirationLabel:
            recipient.expirationDate
              ? formatDate(
                  recipient.expirationDate
                )
              : "",
          qrPngBase64,
        },
      }),
    }
  );

  const result = await response
    .json()
    .catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      result?.error ||
        "Unable to send this pass."
    );
  }

  return result;
}
