/*
  Sends membership passes and gift cards by email.

  The browser cannot hold the mail provider's API key,
  so it calls this worker instead. The worker proves the
  caller is signed-in Wings Arena staff before sending
  anything, otherwise the endpoint would be an open
  relay for anyone who found its address.
*/

const JWKS_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

const JWKS_TTL_MS = 60 * 60 * 1000;

const MAX_ATTACHMENT_BYTES =
  2 * 1024 * 1024;

let cachedKeys = null;
let cachedKeysAt = 0;

async function getSigningKeys() {
  const now = Date.now();

  if (
    cachedKeys &&
    now - cachedKeysAt < JWKS_TTL_MS
  ) {
    return cachedKeys;
  }

  const response = await fetch(
    JWKS_URL
  );

  if (!response.ok) {
    throw new Error(
      "Unable to fetch Google signing keys."
    );
  }

  const data =
    await response.json();

  cachedKeys = data.keys || [];
  cachedKeysAt = now;

  return cachedKeys;
}

function base64UrlToBytes(value) {
  const padded = value
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const binary = atob(padded);
  const bytes = new Uint8Array(
    binary.length
  );

  for (
    let index = 0;
    index < binary.length;
    index += 1
  ) {
    bytes[index] =
      binary.charCodeAt(index);
  }

  return bytes;
}

function decodeSegment(segment) {
  return JSON.parse(
    new TextDecoder().decode(
      base64UrlToBytes(segment)
    )
  );
}

async function verifyIdToken(
  token,
  projectId
) {
  const parts = token.split(".");

  if (parts.length !== 3) {
    throw new Error(
      "Malformed sign-in token."
    );
  }

  const header = decodeSegment(
    parts[0]
  );

  const payload = decodeSegment(
    parts[1]
  );

  if (header.alg !== "RS256") {
    throw new Error(
      "Unexpected token algorithm."
    );
  }

  const keys =
    await getSigningKeys();

  const jwk = keys.find(
    (candidate) =>
      candidate.kid === header.kid
  );

  if (!jwk) {
    throw new Error(
      "Unknown token signing key."
    );
  }

  const key =
    await crypto.subtle.importKey(
      "jwk",
      {
        kty: jwk.kty,
        n: jwk.n,
        e: jwk.e,
        alg: "RS256",
        ext: true,
      },
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256",
      },
      false,
      ["verify"]
    );

  const signed = new TextEncoder().encode(
    `${parts[0]}.${parts[1]}`
  );

  const valid =
    await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      base64UrlToBytes(parts[2]),
      signed
    );

  if (!valid) {
    throw new Error(
      "Sign-in token signature is invalid."
    );
  }

  const now = Math.floor(
    Date.now() / 1000
  );

  if (
    !payload.exp ||
    payload.exp <= now
  ) {
    throw new Error(
      "Sign-in token has expired."
    );
  }

  if (payload.aud !== projectId) {
    throw new Error(
      "Sign-in token was issued for another project."
    );
  }

  if (
    payload.iss !==
    `https://securetoken.google.com/${projectId}`
  ) {
    throw new Error(
      "Sign-in token has the wrong issuer."
    );
  }

  if (!payload.sub) {
    throw new Error(
      "Sign-in token has no subject."
    );
  }

  return payload;
}

/*
  Firestore's REST API applies the project's security
  rules to the caller's own token, so reading the staff
  document is enough to confirm the role without this
  worker holding any service credentials.
*/
async function assertStaffAccount(
  uid,
  idToken,
  projectId
) {
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/staff/${uid}`,
    {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      "This account is not authorized as Wings Arena staff."
    );
  }
}

function corsHeaders(
  request,
  env
) {
  const allowed = (
    env.ALLOWED_ORIGINS || ""
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  const origin =
    request.headers.get("Origin") ||
    "";

  const headers = {
    "Access-Control-Allow-Methods":
      "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };

  if (allowed.includes(origin)) {
    headers[
      "Access-Control-Allow-Origin"
    ] = origin;
  }

  return headers;
}

function jsonResponse(
  body,
  status,
  headers
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...headers,
        "Content-Type":
          "application/json",
      },
    }
  );
}

function escapeHtml(value) {
  return String(value || "").replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]
  );
}

const HOUSEHOLD_SENTENCE =
  "This QR code can be used by all members of your household, so feel free to forward this email or save a screenshot of the code.";

function isFamily(pass) {
  return (
    (pass.membershipType || "")
      .trim()
      .toLowerCase() === "family"
  );
}

function buildEmailHtml(pass) {
  const name = escapeHtml(pass.name);

  const firstName =
    name.split(" ")[0] || "there";

  const expirationLine =
    pass.expirationLabel
      ? `<p style="margin:8px 0 0;color:#4c5a6f;font-size:13px;">Valid through <strong>${escapeHtml(
          pass.expirationLabel
        )}</strong></p>`
      : "";

  const householdLine = isFamily(pass)
    ? `<p style="margin:0 0 18px;text-align:left;color:#4c5a6f;font-size:14px;line-height:1.5;">
        ${HOUSEHOLD_SENTENCE}
      </p>`
    : "";

  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f4f6f9;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;">
    <div style="max-width:460px;margin:0 auto;padding:28px 26px 32px;background:#ffffff;border:1px solid #e0e5ec;border-radius:16px;text-align:center;">
      <div style="font-size:12px;font-weight:800;letter-spacing:2px;color:#4c5a6f;">WINGS ARENA</div>

      <p style="margin:22px 0 4px;text-align:left;color:#172033;font-size:15px;">Hi ${firstName},</p>

      <p style="margin:0 0 18px;text-align:left;color:#4c5a6f;font-size:14px;line-height:1.5;">
        Here is your Wings Arena membership pass. Show this code at the front desk to check in.
        It is also attached to this email.
      </p>

      ${householdLine}

      <img src="cid:wings-pass-qr" alt="Membership QR code" width="220" height="220" style="display:block;margin:0 auto 18px;" />

      <h3 style="margin:0;font-size:19px;color:#172033;">${name}</h3>

      <p style="margin:6px 0 0;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#7b8798;">${escapeHtml(
        pass.membershipType
      )}</p>

      ${expirationLine}

      <div style="margin-top:16px;font-family:ui-monospace,Menlo,monospace;font-size:14px;letter-spacing:1px;color:#26364d;">${escapeHtml(
        pass.token
      )}</div>
    </div>
  </body>
</html>`;
}

function buildEmailText(pass) {
  const lines = [
    `Wings Arena membership pass${
      pass.name
        ? ` for ${pass.name}`
        : ""
    }.`,
    "",
    `Member code: ${pass.token}`,
  ];

  if (pass.expirationLabel) {
    lines.push(
      `Valid through: ${pass.expirationLabel}`
    );
  }

  lines.push(
    "",
    "Show this code at the front desk to check in."
  );

  if (isFamily(pass)) {
    lines.push("", HOUSEHOLD_SENTENCE);
  }

  return lines.join("\n");
}

function isValidEmail(email) {
  return (
    typeof email === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email
    )
  );
}

function validateAttachment(
  qrPngBase64
) {
  if (
    qrPngBase64 &&
    String(qrPngBase64).length >
      MAX_ATTACHMENT_BYTES
  ) {
    throw new Error(
      "The QR image is too large to send."
    );
  }
}

function qrAttachments(
  qrPngBase64,
  filename,
  contentId
) {
  return qrPngBase64
    ? [
        {
          filename,
          content: qrPngBase64,
          content_id: contentId,
        },
      ]
    : [];
}

function validatePass(pass) {
  if (
    !pass ||
    typeof pass !== "object"
  ) {
    throw new Error(
      "Missing pass details."
    );
  }

  if (!isValidEmail(pass.email)) {
    throw new Error(
      "That member does not have a valid email address."
    );
  }

  if (!pass.token) {
    throw new Error(
      "That member has no pass code."
    );
  }

  validateAttachment(pass.qrPngBase64);
}

function buildPassMessage(pass) {
  validatePass(pass);

  return {
    to: pass.email,
    subject:
      "Your Wings Arena Membership Pass",
    html: buildEmailHtml(pass),
    text: buildEmailText(pass),
    attachments: qrAttachments(
      pass.qrPngBase64,
      "wings-arena-pass.png",
      "wings-pass-qr"
    ),
  };
}

const GIFT_CARD_CODE_PATTERN =
  /^WINGS-GC-\d{1,10}$/;

/*
  Names and labels come from the browser and end up in
  the subject line, so they are flattened to one short
  line before use.
*/
function singleLine(
  value,
  maximumLength = 80
) {
  return String(value || "")
    .replace(/[\r\n]+/g, " ")
    .trim()
    .slice(0, maximumLength);
}

function firstNameOf(name) {
  return (
    singleLine(name).split(/\s+/)[0] ||
    ""
  );
}

function validateGiftCard(card) {
  if (
    !card ||
    typeof card !== "object"
  ) {
    throw new Error(
      "Missing gift card details."
    );
  }

  if (!isValidEmail(card.email)) {
    throw new Error(
      "That gift card does not have a valid email address."
    );
  }

  if (
    !GIFT_CARD_CODE_PATTERN.test(
      card.code || ""
    )
  ) {
    throw new Error(
      "That gift card number is not valid."
    );
  }

  if (
    !["recipient", "purchaser"].includes(
      card.audience
    )
  ) {
    throw new Error(
      "Choose whether this goes to the recipient or the purchaser."
    );
  }

  validateAttachment(card.qrPngBase64);
}

function giftCardSubject(card) {
  const recipientName = singleLine(
    card.recipientName
  );

  const purchaserName = singleLine(
    card.purchaserName
  );

  if (card.audience === "purchaser") {
    return recipientName
      ? `Your Wings Arena gift card for ${recipientName}`
      : "Your Wings Arena gift card";
  }

  return purchaserName
    ? `${purchaserName} sent you a Wings Arena gift card`
    : "Your Wings Arena gift card";
}

function buildGiftCardEmailHtml(card) {
  const toPurchaser =
    card.audience === "purchaser";

  const recipientName = escapeHtml(
    singleLine(card.recipientName)
  );

  const purchaserName = escapeHtml(
    singleLine(card.purchaserName)
  );

  const greetingName =
    escapeHtml(
      firstNameOf(
        toPurchaser
          ? card.purchaserName
          : card.recipientName
      )
    ) || "there";

  const balance = escapeHtml(
    singleLine(card.balanceLabel, 24)
  );

  const code = escapeHtml(card.code);

  const intro = toPurchaser
    ? `Thank you for your purchase. Here is the Wings Arena gift card you bought${
        recipientName
          ? ` for <strong>${recipientName}</strong>`
          : ""
      }. Forward this email or print it to pass it along.`
    : `${
        purchaserName
          ? `<strong>${purchaserName}</strong> sent you`
          : "You have received"
      } a Wings Arena gift card. Show the code below at the front desk to use it.`;

  const toFromLines = [
    recipientName
      ? `To <strong style="color:#ffffff;">${recipientName}</strong>`
      : "",
    purchaserName
      ? `From <strong style="color:#ffffff;">${purchaserName}</strong>`
      : "",
  ]
    .filter(Boolean)
    .join(" &nbsp;·&nbsp; ");

  const receiptLines = toPurchaser
    ? `<div style="margin:22px 0 0;padding:14px 16px;border:1px solid #e0e5ec;border-radius:12px;text-align:left;color:#4c5a6f;font-size:13px;line-height:1.7;">
        <div><strong style="color:#172033;">Gift card number:</strong> ${code}</div>
        <div><strong style="color:#172033;">Amount:</strong> ${escapeHtml(
          singleLine(
            card.originalValueLabel,
            24
          )
        )}</div>
        ${
          card.issuedLabel
            ? `<div><strong style="color:#172033;">Issued:</strong> ${escapeHtml(
                singleLine(
                  card.issuedLabel,
                  40
                )
              )}</div>`
            : ""
        }
      </div>`
    : "";

  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f4f6f9;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;">
    <div style="max-width:460px;margin:0 auto;padding:28px 26px 32px;background:#ffffff;border:1px solid #e0e5ec;border-radius:16px;text-align:center;">
      <div style="font-size:12px;font-weight:800;letter-spacing:2px;color:#4c5a6f;">WINGS ARENA</div>

      <p style="margin:22px 0 4px;text-align:left;color:#172033;font-size:15px;">Hi ${greetingName},</p>

      <p style="margin:0 0 20px;text-align:left;color:#4c5a6f;font-size:14px;line-height:1.5;">${intro}</p>

      <div style="padding:22px 18px;border-radius:14px;background:#0b1f3a;color:#ffffff;">
        <div style="font-size:11px;font-weight:800;letter-spacing:2px;color:#9fb0c6;">GIFT CARD</div>
        <div style="margin-top:10px;font-size:38px;font-weight:800;letter-spacing:-1px;color:#ffffff;">${balance}</div>
        <div style="margin-top:4px;font-size:12px;color:#c2d0e2;">Available balance</div>
        ${
          toFromLines
            ? `<div style="margin-top:14px;font-size:13px;color:#c2d0e2;">${toFromLines}</div>`
            : ""
        }
      </div>

      <img src="cid:wings-gift-card-qr" alt="Gift card QR code" width="200" height="200" style="display:block;margin:22px auto 12px;" />

      <div style="font-family:ui-monospace,Menlo,monospace;font-size:15px;letter-spacing:1px;color:#26364d;">${code}</div>

      ${receiptLines}
    </div>
  </body>
</html>`;
}

function buildGiftCardEmailText(card) {
  const toPurchaser =
    card.audience === "purchaser";

  const recipientName = singleLine(
    card.recipientName
  );

  const purchaserName = singleLine(
    card.purchaserName
  );

  const lines = [
    toPurchaser
      ? `Here is the Wings Arena gift card you bought${
          recipientName
            ? ` for ${recipientName}`
            : ""
        }.`
      : `${
          purchaserName
            ? `${purchaserName} sent you`
            : "You have received"
        } a Wings Arena gift card.`,
    "",
    `Gift card number: ${card.code}`,
    `Available balance: ${singleLine(
      card.balanceLabel,
      24
    )}`,
  ];

  if (toPurchaser) {
    lines.push(
      `Amount: ${singleLine(
        card.originalValueLabel,
        24
      )}`
    );

    if (card.issuedLabel) {
      lines.push(
        `Issued: ${singleLine(
          card.issuedLabel,
          40
        )}`
      );
    }
  }

  lines.push(
    "",
    "Show this code at the Wings Arena front desk to use it."
  );

  return lines.join("\n");
}

function buildGiftCardMessage(card) {
  validateGiftCard(card);

  return {
    to: card.email,
    subject: giftCardSubject(card),
    html: buildGiftCardEmailHtml(card),
    text: buildGiftCardEmailText(card),
    attachments: qrAttachments(
      card.qrPngBase64,
      "wings-arena-gift-card.png",
      "wings-gift-card-qr"
    ),
  };
}

export default {
  async fetch(request, env) {
    const headers = corsHeaders(
      request,
      env
    );

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers,
      });
    }

    if (request.method !== "POST") {
      return jsonResponse(
        { error: "Method not allowed." },
        405,
        headers
      );
    }

    if (
      !headers[
        "Access-Control-Allow-Origin"
      ]
    ) {
      return jsonResponse(
        {
          error:
            "This origin is not allowed to send passes.",
        },
        403,
        headers
      );
    }

    const authorization =
      request.headers.get(
        "Authorization"
      ) || "";

    const idToken =
      authorization.startsWith(
        "Bearer "
      )
        ? authorization.slice(7)
        : "";

    if (!idToken) {
      return jsonResponse(
        {
          error:
            "You must be signed in to send a pass.",
        },
        401,
        headers
      );
    }

    try {
      const claims =
        await verifyIdToken(
          idToken,
          env.FIREBASE_PROJECT_ID
        );

      await assertStaffAccount(
        claims.sub,
        idToken,
        env.FIREBASE_PROJECT_ID
      );
    } catch (error) {
      return jsonResponse(
        { error: error.message },
        401,
        headers
      );
    }

    let message;

    try {
      const body =
        await request.json();

      message = body?.giftCard
        ? buildGiftCardMessage(
            body.giftCard
          )
        : buildPassMessage(body?.pass);
    } catch (error) {
      return jsonResponse(
        { error: error.message },
        400,
        headers
      );
    }

    try {
      const response = await fetch(
        "https://api.resend.com/emails",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            from: env.MAIL_FROM,
            to: [message.to],
            subject: message.subject,
            html: message.html,
            text: message.text,
            attachments:
              message.attachments,
          }),
        }
      );

      const result = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        return jsonResponse(
          {
            error:
              result?.message ||
              "The mail provider rejected this message.",
          },
          502,
          headers
        );
      }

      return jsonResponse(
        {
          id: result.id || "",
          sentTo: message.to,
        },
        200,
        headers
      );
    } catch (error) {
      return jsonResponse(
        {
          error:
            error.message ||
            "Unable to reach the mail provider.",
        },
        502,
        headers
      );
    }
  },
};
