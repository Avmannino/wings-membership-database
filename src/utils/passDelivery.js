import { formatDate } from "./dateUtils";
import { getMemberDisplayName } from "./membershipUtils";

export function getPassRecipient(
  member
) {
  return {
    name: getMemberDisplayName(member),
    firstName: (
      member?.firstName || ""
    ).trim(),
    email:
      member?.email?.trim() || "",
    phone:
      member?.phone?.trim() || "",
    token:
      member?.qrToken?.trim() || "",
    membershipType:
      member?.membershipType || "",
    expirationDate:
      member?.expirationDate || "",
  };
}

/*
  Mail and messaging apps cannot carry the QR image
  itself, so the message sends the token the front
  desk can scan or type.
*/
export function buildPassMessage(
  member
) {
  const recipient =
    getPassRecipient(member);

  const lines = [
    `Wings Arena membership pass${
      recipient.name
        ? ` for ${recipient.name}`
        : ""
    }.`,
    "",
    `Member code: ${recipient.token}`,
  ];

  if (recipient.expirationDate) {
    lines.push(
      `Valid through: ${formatDate(
        recipient.expirationDate
      )}`
    );
  }

  lines.push(
    "",
    "Show this code at the front desk to check in."
  );

  return lines.join("\n");
}

export function buildMailtoUrl(
  member
) {
  const recipient =
    getPassRecipient(member);

  const subject =
    "Your Wings Arena Membership Pass";

  return `mailto:${encodeURIComponent(
    recipient.email
  )}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(
    buildPassMessage(member)
  )}`;
}

export function buildSmsUrl(member) {
  const recipient =
    getPassRecipient(member);

  const phoneNumber =
    recipient.phone.replace(
      /[^\d+]/g,
      ""
    );

  return `sms:${phoneNumber}?&body=${encodeURIComponent(
    buildPassMessage(member)
  )}`;
}

export function buildPassDocument(
  member,
  qrMarkup
) {
  const recipient =
    getPassRecipient(member);

  const expirationLine =
    recipient.expirationDate
      ? `<div class="pass-expiration">Valid through <strong>${formatDate(
          recipient.expirationDate
        )}</strong></div>`
      : "";

  return `<!doctype html>
    <html>
      <head>
        <title>Wings Arena Membership Pass</title>
        <style>
          body {
            margin: 0;
            font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
            display: grid;
            place-items: center;
            min-height: 100vh;
          }
          .pass {
            width: 320px;
            padding: 26px 24px 30px;
            border: 1px solid #d4dbe5;
            border-radius: 16px;
            text-align: center;
          }
          .pass-brand {
            font-size: 12px;
            font-weight: 800;
            letter-spacing: 2px;
            color: #4c5a6f;
          }
          .pass-type {
            margin-top: 4px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #7b8798;
          }
          .pass-qr {
            margin: 20px 0 16px;
          }
          .pass-name {
            margin: 0;
            font-size: 19px;
            color: #172033;
          }
          .pass-expiration {
            margin-top: 8px;
            font-size: 12px;
            color: #4c5a6f;
          }
          .pass-token {
            margin-top: 14px;
            font-family: ui-monospace, "SF Mono", Menlo, monospace;
            font-size: 14px;
            letter-spacing: 1px;
            color: #26364d;
          }
        </style>
      </head>
      <body>
        <div class="pass">
          <div class="pass-brand">WINGS ARENA</div>
          <div class="pass-type">${recipient.membershipType}</div>
          <div class="pass-qr">${qrMarkup}</div>
          <h3 class="pass-name">${recipient.name}</h3>
          ${expirationLine}
          <div class="pass-token">${recipient.token}</div>
        </div>
      </body>
    </html>`;
}
