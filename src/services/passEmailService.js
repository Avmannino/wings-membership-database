import { auth } from "../firebase/firebase";

import { formatDate } from "../utils/dateUtils";

import { formatMoney } from "../utils/giftCardUtils";

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
async function postToMailWorker(
  body,
  fallbackError
) {
  if (!PASS_EMAIL_ENDPOINT) {
    throw new Error(
      "Email sending is not configured yet."
    );
  }

  const currentUser =
    auth.currentUser;

  if (!currentUser) {
    throw new Error(
      "Please sign in again to send this email."
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
      body: JSON.stringify(body),
    }
  );

  const result = await response
    .json()
    .catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      result?.error || fallbackError
    );
  }

  return result;
}

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

  return postToMailWorker(
    {
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
    },
    "Unable to send this pass."
  );
}

/*
  The recipient gets the card itself. The purchaser
  gets the same card worded as their receipt, so they
  can forward or print it if they are giving it in
  person.
*/
export async function sendGiftCardEmail({
  card,
  audience,
  qrPngBase64,
}) {
  const email = (
    audience === "purchaser"
      ? card.purchaserEmail
      : card.recipientEmail
  )?.trim();

  if (!email) {
    throw new Error(
      `This gift card has no ${audience} email address.`
    );
  }

  return postToMailWorker(
    {
      giftCard: {
        email,
        audience,
        code: card.giftCardId,
        recipientName:
          card.recipientName || "",
        purchaserName:
          card.purchaserName || "",
        balanceLabel: formatMoney(
          card.currentBalance
        ),
        originalValueLabel:
          formatMoney(
            card.originalValue
          ),
        issuedLabel: card.dateIssued
          ? formatDate(card.dateIssued)
          : "",
        qrPngBase64,
      },
    },
    "Unable to send this gift card."
  );
}
