import { formatDate } from "./dateUtils";
import { formatMoney } from "./giftCardUtils";

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

export function buildGiftCardDocument(
  card,
  qrMarkup
) {
  const code = escapeHtml(
    card.giftCardId
  );

  const toLine = card.recipientName
    ? `<div class="line">To <strong>${escapeHtml(
        card.recipientName
      )}</strong></div>`
    : "";

  const fromLine = card.purchaserName
    ? `<div class="line">From <strong>${escapeHtml(
        card.purchaserName
      )}</strong></div>`
    : "";

  return `<!doctype html>
    <html>
      <head>
        <title>Wings Arena Gift Card ${code}</title>
        <style>
          body {
            margin: 0;
            font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
            display: grid;
            place-items: center;
            min-height: 100vh;
          }
          .card {
            width: 340px;
            padding: 26px 24px 28px;
            border: 2px solid #0b1f3a;
            border-radius: 18px;
            text-align: center;
            color: #172033;
          }
          .brand {
            font-size: 13px;
            font-weight: 800;
            letter-spacing: 3px;
            color: #0b1f3a;
          }
          .kind {
            margin-top: 3px;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 2px;
            color: #7b8798;
          }
          .balance {
            margin: 16px 0 10px;
            font-size: 40px;
            font-weight: 850;
            letter-spacing: -1px;
          }
          .line {
            margin-top: 4px;
            font-size: 13px;
            color: #4c5a6f;
          }
          .qr {
            margin: 18px 0 12px;
          }
          .code {
            font-family: ui-monospace, "SF Mono", Menlo, monospace;
            font-size: 15px;
            letter-spacing: 1px;
            color: #26364d;
          }
          .issued {
            margin-top: 6px;
            font-size: 11px;
            color: #7b8798;
          }
          .instructions {
            margin: 16px 0 0;
            font-size: 12px;
            color: #4c5a6f;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="brand">WINGS ARENA</div>
          <div class="kind">GIFT CARD</div>
          <div class="balance">${formatMoney(
            card.currentBalance
          )}</div>
          ${toLine}
          ${fromLine}
          <div class="qr">${qrMarkup}</div>
          <div class="code">${code}</div>
          <div class="issued">Issued ${formatDate(
            card.dateIssued
          )}</div>
          <p class="instructions">Present this card at the Wings Arena front desk to use the balance.</p>
        </div>
      </body>
    </html>`;
}
