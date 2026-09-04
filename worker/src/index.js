/*
  Sends membership passes by email.

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

  return lines.join("\n");
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

  if (
    !pass.email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      pass.email
    )
  ) {
    throw new Error(
      "That member does not have a valid email address."
    );
  }

  if (!pass.token) {
    throw new Error(
      "That member has no pass code."
    );
  }

  if (
    pass.qrPngBase64 &&
    pass.qrPngBase64.length >
      MAX_ATTACHMENT_BYTES
  ) {
    throw new Error(
      "The pass image is too large to send."
    );
  }
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

    let pass;

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

      const body =
        await request.json();

      pass = body?.pass;

      validatePass(pass);
    } catch (error) {
      return jsonResponse(
        { error: error.message },
        401,
        headers
      );
    }

    const attachments =
      pass.qrPngBase64
        ? [
            {
              filename:
                "wings-arena-pass.png",
              content:
                pass.qrPngBase64,
              content_id:
                "wings-pass-qr",
            },
          ]
        : [];

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
            to: [pass.email],
            subject:
              "Your Wings Arena Membership Pass",
            html: buildEmailHtml(pass),
            text: buildEmailText(pass),
            attachments,
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
          sentTo: pass.email,
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
