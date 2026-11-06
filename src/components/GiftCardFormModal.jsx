import { useState } from "react";

import { X } from "lucide-react";

import { toDateInputValue } from "../utils/dateUtils";

import {
  calculateBalance,
  formatMoney,
  toCents,
} from "../utils/giftCardUtils";

function buildInitialForm(card) {
  if (!card) {
    return {
      purchaserName: "",
      purchaserEmail: "",
      recipientName: "",
      recipientEmail: "",
      originalValue: "",
      dateIssued: toDateInputValue(),
      notes: "",
    };
  }

  return {
    purchaserName:
      card.purchaserName || "",
    purchaserEmail:
      card.purchaserEmail || "",
    recipientName:
      card.recipientName || "",
    recipientEmail:
      card.recipientEmail || "",
    originalValue: String(
      card.originalValue ?? ""
    ),
    dateIssued: card.dateIssued || "",
    notes: card.notes || "",
  };
}

function GiftCardFormModal({
  card,
  onClose,
  onSave,
}) {
  const [form, setForm] = useState(
    () => buildInitialForm(card)
  );

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  /*
    The balance is never typed in. It is the original
    value less whatever has been recorded against the
    card, so changing the value moves it too.
  */
  const balancePreview =
    calculateBalance(
      form.originalValue,
      card?.transactions || []
    );

  const balanceTooLow =
    form.originalValue !== "" &&
    toCents(balancePreview) < 0;

  function handleChange(event) {
    const { name, value } =
      event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (
      !form.purchaserName.trim() ||
      !form.purchaserEmail.trim() ||
      !form.recipientName.trim() ||
      !form.dateIssued
    ) {
      setError(
        "Please complete all required fields."
      );

      return;
    }

    if (toCents(form.originalValue) <= 0) {
      setError(
        "The original value must be more than $0."
      );

      return;
    }

    if (balanceTooLow) {
      setError(
        "The original value cannot be less than what has already been used."
      );

      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await onSave(form);
    } catch (saveError) {
      setError(
        saveError.message ||
          "Unable to save this gift card."
      );

      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <div>
            <h2>
              {card
                ? "Edit Gift Card"
                : "Add Gift Card"}
            </h2>

            <p>
              {card
                ? "Update who bought and who received this card."
                : "Record a gift card sold at the front desk."}
            </p>
          </div>

          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            disabled={submitting}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <label className="form-field">
              <span>Gift Card ID</span>

              <input
                value={
                  card?.giftCardId || ""
                }
                placeholder="Assigned automatically when saved"
                readOnly
                disabled
              />
            </label>

            <label className="form-field">
              <span>Date Issued</span>

              <input
                type="date"
                name="dateIssued"
                value={form.dateIssued}
                onChange={handleChange}
                disabled={submitting}
                required
              />
            </label>

            <label className="form-field">
              <span>Purchaser Name</span>

              <input
                name="purchaserName"
                value={form.purchaserName}
                onChange={handleChange}
                disabled={submitting}
                required
              />
            </label>

            <label className="form-field">
              <span>Purchaser Email</span>

              <input
                type="email"
                name="purchaserEmail"
                value={
                  form.purchaserEmail
                }
                onChange={handleChange}
                disabled={submitting}
                placeholder="buyer@example.com"
                required
              />
            </label>

            <label className="form-field">
              <span>Recipient Name</span>

              <input
                name="recipientName"
                value={form.recipientName}
                onChange={handleChange}
                disabled={submitting}
                required
              />
            </label>

            <label className="form-field">
              <span>
                Recipient Email
                (optional)
              </span>

              <input
                type="email"
                name="recipientEmail"
                value={
                  form.recipientEmail
                }
                onChange={handleChange}
                disabled={submitting}
                placeholder="Needed to email the card to them"
              />
            </label>

            <label className="form-field">
              <span>Original Value</span>

              <div className="money-input">
                <span aria-hidden="true">
                  $
                </span>

                <input
                  type="number"
                  name="originalValue"
                  value={
                    form.originalValue
                  }
                  onChange={handleChange}
                  disabled={submitting}
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  required
                />
              </div>
            </label>

            <label className="form-field">
              <span>Current Balance</span>

              <input
                value={formatMoney(
                  Math.max(
                    balancePreview,
                    0
                  )
                )}
                className={
                  balanceTooLow
                    ? "input-invalid"
                    : ""
                }
                readOnly
                disabled
              />
            </label>

            <label className="form-field form-field-full">
              <span>Notes</span>

              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows="3"
                disabled={submitting}
                placeholder="e.g. EZFacility receipt number"
              />
            </label>

            {error && (
              <div className="form-field-full form-message-error">
                {error}
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="primary-button"
              disabled={submitting}
            >
              {submitting
                ? "Saving..."
                : card
                  ? "Save Changes"
                  : "Add Gift Card"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default GiftCardFormModal;
