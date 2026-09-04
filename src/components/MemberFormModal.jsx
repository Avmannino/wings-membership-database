import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  RefreshCw,
  X,
} from "lucide-react";

import SendPassMenu from "./SendPassMenu";

import { addOneMonth } from "../utils/dateUtils";
import { generateMemberToken } from "../utils/tokenUtils";

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  membershipType: "Individual",
  startDate: "",
  expirationDate: "",
  qrToken: "",
  notes: "",
};

function MemberFormModal({
  member,
  onClose,
  onSave,
}) {
  const [form, setForm] =
    useState(emptyForm);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const expirationEditedRef =
    useRef(false);

  useEffect(() => {
    if (member) {
      setForm({
        firstName:
          member.firstName || "",
        lastName:
          member.lastName || "",
        email:
          member.email || "",
        phone:
          member.phone || "",
        membershipType:
          member.membershipType ||
          "Individual",
        startDate:
          member.startDate || "",
        expirationDate:
          member.expirationDate || "",
        qrToken:
          member.qrToken || "",
        notes:
          member.notes || "",
      });
    } else {
      setForm({
        ...emptyForm,
        qrToken:
          generateMemberToken(),
      });
    }

    setError("");
    expirationEditedRef.current = false;
  }, [member]);

  function handleChange(event) {
    const {
      name,
      value,
    } = event.target;

    if (name === "expirationDate") {
      expirationEditedRef.current = true;
    }

    setForm((current) => {
      const updatedForm = {
        ...current,
        [name]: value,
      };

      /*
        A start date implies the expiration a month
        later, until someone sets one by hand.
      */
      if (
        name === "startDate" &&
        !expirationEditedRef.current
      ) {
        updatedForm.expirationDate =
          addOneMonth(value);
      }

      return updatedForm;
    });
  }




  async function handleSubmit(
    event
  ) {
    event.preventDefault();

    if (
      !form.firstName.trim() ||
      !form.lastName.trim() ||
      !form.expirationDate ||
      !form.qrToken.trim()
    ) {
      setError(
        "Please complete all required fields."
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
          "Unable to save this member."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function regenerateToken() {
    setForm((current) => ({
      ...current,
      qrToken:
        generateMemberToken(),
    }));
  }

  return (
    <div className="modal-backdrop">
      <div className="modal member-form-modal">
        <div className="modal-header">
          <div>
            <h2>
              {member
                ? "Edit Member"
                : "Add Member"}
            </h2>

            <p>
              Manage membership
              information and scan
              credentials.
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
              <span>
                First Name
              </span>

              <input
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                disabled={submitting}
                required
              />
            </label>

            <label className="form-field">
              <span>
                Last Name
              </span>

              <input
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
                disabled={submitting}
                required
              />
            </label>

            <label className="form-field">
              <span>Email</span>

              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                disabled={submitting}
                placeholder="member@example.com"
              />
            </label>

            <label className="form-field">
              <span>
                Phone Number
              </span>

              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                disabled={submitting}
                placeholder="(555) 555-5555"
              />
            </label>

            <label className="form-field">
              <span>
                Membership Type
              </span>

              <select
                name="membershipType"
                value={form.membershipType}
                onChange={handleChange}
                disabled={submitting}
              >
                <option value="Individual">
                  Individual
                </option>

                <option value="Family">
                  Family
                </option>
              </select>
            </label>

            <label className="form-field">
              <span>
                Start Date
              </span>

              <input
                type="date"
                name="startDate"
                value={form.startDate}
                onChange={handleChange}
                disabled={submitting}
              />
            </label>

            <label className="form-field">
              <span>
                Expiration Date
              </span>

              <input
                type="date"
                name="expirationDate"
                value={
                  form.expirationDate
                }
                onChange={handleChange}
                disabled={submitting}
                required
              />
            </label>

            <div className="form-field form-field-full">
              <span>
                QR / Barcode Token
              </span>

              <div className="token-input-row">
                <input
                  name="qrToken"
                  value={form.qrToken}
                  onChange={handleChange}
                  disabled={submitting}
                  required
                />

                <button
                  type="button"
                  className="secondary-button token-regenerate-button"
                  onClick={
                    regenerateToken
                  }
                  disabled={submitting}
                >
                  <RefreshCw
                    size={17}
                  />
                  Generate
                </button>
              </div>

              <SendPassMenu
                member={form}
              />
            </div>

            <label className="form-field form-field-full">
              <span>Notes</span>

              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows="4"
                disabled={submitting}
              />
            </label>

            {error && (
              <div
                className="form-field-full"
                style={{
                  padding:
                    "11px 13px",
                  borderRadius:
                    "8px",
                  background:
                    "#fff0f0",
                  color:
                    "#a62e2e",
                  fontSize:
                    "12px",
                }}
              >
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
                : member
                  ? "Save Changes"
                  : "Add Member"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default MemberFormModal;