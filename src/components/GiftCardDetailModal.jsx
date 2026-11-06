import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Edit3,
  Mail,
  Printer,
  Trash2,
  X,
} from "lucide-react";

import {
  QRCodeCanvas,
  QRCodeSVG,
} from "qrcode.react";

import {
  recordGiftCardTransaction,
  removeGiftCardTransaction,
  subscribeToGiftCard,
} from "../services/giftCardService";

import { sendGiftCardEmail } from "../services/passEmailService";

import {
  formatDate,
  formatDateTime,
} from "../utils/dateUtils";

import { buildGiftCardDocument } from "../utils/giftCardDelivery";

import {
  formatMoney,
  getGiftCardStatus,
  roundMoney,
  sumTransactions,
  toCents,
} from "../utils/giftCardUtils";

const ACTIVITY_LABELS = {
  redeem: "Redeemed",
  reload: "Funds added",
};

/*
  Opens from the gift card list or from a scan on any
  screen, and listens to the card itself so the balance
  shown is always the one in Firestore.
*/
function GiftCardDetailModal({
  cardId,
  onClose,
  onEdit,
}) {
  const [card, setCard] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [loadError, setLoadError] =
    useState("");

  const [amount, setAmount] =
    useState("");

  const [note, setNote] = useState("");

  const [saving, setSaving] =
    useState(false);

  const [formError, setFormError] =
    useState("");

  const [formNotice, setFormNotice] =
    useState("");

  const [sending, setSending] =
    useState(false);

  const [sendNotice, setSendNotice] =
    useState("");

  const visualRef = useRef(null);
  const qrSourceRef = useRef(null);

  useEffect(
    () =>
      subscribeToGiftCard(
        cardId,
        (nextCard) => {
          setCard(nextCard);
          setLoading(false);
        },
        (error) => {
          console.error(
            "Unable to load gift card:",
            error
          );

          setLoadError(
            "Unable to load this gift card from Firebase."
          );

          setLoading(false);
        }
      ),
    [cardId]
  );

  /*
    Newest first, each showing the balance it left so
    staff can read the card's history at a glance.
  */
  const history = useMemo(() => {
    if (!card) {
      return [];
    }

    let runningCents = toCents(
      card.originalValue
    );

    const rows = [];

    for (const [
      index,
      entry,
    ] of card.transactions.entries()) {
      const entryCents = toCents(
        entry.amount
      );

      runningCents +=
        entry.type === "reload"
          ? entryCents
          : -entryCents;

      rows.unshift({
        ...entry,
        key: entry.id || `entry-${index}`,
        balanceAfter: runningCents / 100,
      });
    }

    return rows;
  }, [card]);

  async function handleTransaction(
    type
  ) {
    setFormError("");
    setFormNotice("");

    const value = roundMoney(amount);

    if (toCents(value) <= 0) {
      setFormError(
        "Enter an amount greater than $0."
      );

      return;
    }

    setSaving(true);

    try {
      await recordGiftCardTransaction(
        card.id,
        { type, amount: value, note }
      );

      setAmount("");
      setNote("");

      setFormNotice(
        type === "redeem"
          ? `${formatMoney(value)} redeemed.`
          : `${formatMoney(value)} added to the card.`
      );
    } catch (saveError) {
      console.error(
        "Unable to update gift card:",
        saveError
      );

      setFormError(
        saveError.message ||
          "That could not be saved."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(entry) {
    const confirmed = window.confirm(
      `Remove this ${formatMoney(
        entry.amount
      )} ${
        entry.type === "reload"
          ? "top-up"
          : "redemption"
      }? The balance will be recalculated.`
    );

    if (!confirmed) {
      return;
    }

    setFormError("");
    setFormNotice("");

    try {
      await removeGiftCardTransaction(
        card.id,
        entry.id
      );
    } catch (removeError) {
      console.error(
        "Unable to remove entry:",
        removeError
      );

      setFormError(
        removeError.message ||
          "That entry could not be removed."
      );
    }
  }

  function readQrPngBase64() {
    const canvas =
      qrSourceRef.current?.querySelector(
        "canvas"
      );

    if (!canvas) {
      return "";
    }

    return canvas
      .toDataURL("image/png")
      .split(",")[1];
  }

  async function handleSendEmail(
    audience
  ) {
    const email =
      audience === "purchaser"
        ? card.purchaserEmail
        : card.recipientEmail;

    setSending(true);
    setSendNotice(
      `Sending the gift card to ${email}...`
    );

    try {
      await sendGiftCardEmail({
        card,
        audience,
        qrPngBase64: readQrPngBase64(),
      });

      setSendNotice(
        `Gift card sent to ${email}.`
      );
    } catch (sendError) {
      console.error(
        "Unable to send gift card:",
        sendError
      );

      setSendNotice(
        sendError.message ||
          "Unable to send this gift card."
      );
    } finally {
      setSending(false);
    }
  }

  function handlePrint() {
    const svgElement =
      visualRef.current?.querySelector(
        "svg"
      );

    if (!svgElement) {
      setSendNotice(
        "Unable to build the gift card right now."
      );

      return;
    }

    const printWindow = window.open(
      "",
      "_blank",
      "width=520,height=720"
    );

    if (!printWindow) {
      setSendNotice(
        "Your browser blocked the print window. Allow pop-ups and try again."
      );

      return;
    }

    printWindow.document.write(
      buildGiftCardDocument(
        card,
        svgElement.outerHTML
      )
    );

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();

    setSendNotice("");
  }

  function renderBody() {
    if (loading) {
      return (
        <div className="empty-state">
          Loading gift card...
        </div>
      );
    }

    if (loadError) {
      return (
        <div className="empty-state">
          {loadError}
        </div>
      );
    }

    if (!card) {
      return (
        <div className="empty-state">
          No gift card matches{" "}
          <code className="qr-token">
            {cardId}
          </code>
          .
        </div>
      );
    }

    const status =
      getGiftCardStatus(card);

    const redeemedTotal =
      sumTransactions(
        card.transactions,
        "redeem"
      );

    const reloadedTotal =
      sumTransactions(
        card.transactions,
        "reload"
      );

    return (
      <>
        <div className="gift-card-summary">
          <div
            className="gift-card-visual"
            ref={visualRef}
          >
            <div className="gift-card-visual-brand">
              WINGS ARENA GIFT CARD
            </div>

            <div className="gift-card-visual-balance">
              {formatMoney(
                card.currentBalance
              )}
            </div>

            <div className="gift-card-visual-caption">
              Current balance
            </div>

            <div className="gift-card-visual-qr">
              <QRCodeSVG
                value={card.giftCardId}
                size={132}
                level="H"
              />
            </div>

            <div className="gift-card-visual-code">
              {card.giftCardId}
            </div>
          </div>

          <div className="gift-card-details">
            <div className="gift-card-detail">
              <span className="scan-info-label">
                Recipient
              </span>

              <strong>
                {card.recipientName}
              </strong>

              <small>
                {card.recipientEmail ||
                  "No email on file"}
              </small>
            </div>

            <div className="gift-card-detail">
              <span className="scan-info-label">
                Purchaser
              </span>

              <strong>
                {card.purchaserName}
              </strong>

              <small>
                {card.purchaserEmail}
              </small>
            </div>

            <div className="gift-card-detail">
              <span className="scan-info-label">
                Original Value
              </span>

              <strong>
                {formatMoney(
                  card.originalValue
                )}
              </strong>

              {reloadedTotal > 0 && (
                <small>
                  +
                  {formatMoney(
                    reloadedTotal
                  )}{" "}
                  added since
                </small>
              )}
            </div>

            <div className="gift-card-detail">
              <span className="scan-info-label">
                Used So Far
              </span>

              <strong>
                {formatMoney(
                  redeemedTotal
                )}
              </strong>
            </div>

            <div className="gift-card-detail">
              <span className="scan-info-label">
                Date Issued
              </span>

              <strong>
                {formatDate(
                  card.dateIssued
                )}
              </strong>
            </div>

            <div className="gift-card-detail">
              <span className="scan-info-label">
                Status
              </span>

              <strong>
                <span
                  className={`membership-badge ${status}`}
                >
                  {status === "active"
                    ? "Active"
                    : "Fully Redeemed"}
                </span>
              </strong>
            </div>

            {card.notes && (
              <div className="gift-card-detail gift-card-detail-full">
                <span className="scan-info-label">
                  Notes
                </span>

                <p>{card.notes}</p>
              </div>
            )}
          </div>
        </div>

        <form
          className="gift-card-transaction"
          onSubmit={(event) => {
            event.preventDefault();
            handleTransaction("redeem");
          }}
        >
          <div className="gift-card-transaction-title">
            <strong>
              Record a purchase
            </strong>

            <button
              type="button"
              className="link-button"
              onClick={() =>
                setAmount(
                  card.currentBalance.toFixed(
                    2
                  )
                )
              }
              disabled={
                saving ||
                toCents(
                  card.currentBalance
                ) <= 0
              }
            >
              Use full balance
            </button>
          </div>

          <div className="gift-card-transaction-row">
            <div className="money-input">
              <span aria-hidden="true">
                $
              </span>

              <input
                type="number"
                value={amount}
                onChange={(event) =>
                  setAmount(
                    event.target.value
                  )
                }
                min="0.01"
                step="0.01"
                placeholder="0.00"
                aria-label="Amount"
                disabled={saving}
              />
            </div>

            <input
              className="gift-card-note-input"
              value={note}
              onChange={(event) =>
                setNote(event.target.value)
              }
              placeholder="What was it used for? (optional)"
              aria-label="Note"
              disabled={saving}
            />

            <button
              type="submit"
              className="primary-button"
              disabled={
                saving ||
                toCents(
                  card.currentBalance
                ) <= 0
              }
            >
              Redeem
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                handleTransaction(
                  "reload"
                )
              }
              disabled={saving}
            >
              Add Funds
            </button>
          </div>

          {formError && (
            <p className="form-message-error">
              {formError}
            </p>
          )}

          {formNotice && (
            <p className="form-message-success">
              {formNotice}
            </p>
          )}
        </form>

        <div className="gift-card-history">
          <h3>History</h3>

          <div className="gift-card-history-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Activity</th>
                  <th className="money-column">
                    Amount
                  </th>
                  <th className="money-column">
                    Balance
                  </th>
                  <th />
                </tr>
              </thead>

              <tbody>
                {history.map((entry) => (
                  <tr key={entry.key}>
                    <td>
                      {formatDateTime(
                        entry.date
                      )}
                    </td>

                    <td className="gift-card-history-activity">
                      {ACTIVITY_LABELS[
                        entry.type
                      ] || entry.type}

                      {entry.note && (
                        <span className="gift-card-history-meta">
                          {entry.note}
                        </span>
                      )}

                      {entry.recordedBy && (
                        <span className="gift-card-history-meta">
                          by{" "}
                          {entry.recordedBy}
                        </span>
                      )}
                    </td>

                    <td
                      className={`money-column ${
                        entry.type ===
                        "reload"
                          ? "amount-credit"
                          : "amount-debit"
                      }`}
                    >
                      {entry.type ===
                      "reload"
                        ? "+"
                        : "−"}
                      {formatMoney(
                        entry.amount
                      )}
                    </td>

                    <td className="money-column">
                      {formatMoney(
                        entry.balanceAfter
                      )}
                    </td>

                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="icon-button icon-button-small danger"
                          title="Remove this entry"
                          onClick={() =>
                            handleRemove(
                              entry
                            )
                          }
                          disabled={
                            !entry.id
                          }
                        >
                          <Trash2
                            size={15}
                          />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                <tr>
                  <td>
                    {formatDate(
                      card.dateIssued
                    )}
                  </td>

                  <td>Issued</td>

                  <td className="money-column amount-credit">
                    +
                    {formatMoney(
                      card.originalValue
                    )}
                  </td>

                  <td className="money-column">
                    {formatMoney(
                      card.originalValue
                    )}
                  </td>

                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div
          ref={qrSourceRef}
          aria-hidden="true"
          className="send-pass-qr-source"
        >
          <QRCodeCanvas
            value={card.giftCardId}
            size={320}
            level="H"
          />
        </div>
      </>
    );
  }

  return (
    <div className="modal-backdrop">
      <div className="modal gift-card-modal">
        <div className="modal-header">
          <div>
            <h2>
              Gift Card{" "}
              {card?.giftCardId || cardId}
            </h2>

            <p>
              Record purchases against the
              balance and send the card.
            </p>
          </div>

          <button
            type="button"
            className="icon-button"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        {renderBody()}

        {card && sendNotice && (
          <p
            className="gift-card-send-notice"
            role="status"
          >
            {sendNotice}
          </p>
        )}

        <div className="modal-actions">
          {card && (
            <div className="gift-card-send">
              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  handleSendEmail(
                    "recipient"
                  )
                }
                disabled={
                  !card.recipientEmail ||
                  sending
                }
                title={
                  card.recipientEmail
                    ? `Email the card to ${card.recipientEmail}`
                    : "Add a recipient email to enable this option"
                }
              >
                <Mail size={16} />
                Email Recipient
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  handleSendEmail(
                    "purchaser"
                  )
                }
                disabled={
                  !card.purchaserEmail ||
                  sending
                }
                title={
                  card.purchaserEmail
                    ? `Email the card to ${card.purchaserEmail}`
                    : "Add a purchaser email to enable this option"
                }
              >
                <Mail size={16} />
                Email Purchaser
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={handlePrint}
              >
                <Printer size={16} />
                Print
              </button>
            </div>
          )}

          {card && onEdit && (
            <button
              type="button"
              className="secondary-button"
              onClick={() => onEdit(card)}
            >
              <Edit3 size={16} />
              Edit
            </button>
          )}

          <button
            type="button"
            className="primary-button"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default GiftCardDetailModal;
