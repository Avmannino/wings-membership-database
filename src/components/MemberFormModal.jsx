import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";

import { generateMemberToken } from "../utils/tokenUtils";

const emptyForm = {
  firstName: "",
  lastName: "",
  membershipType: "Adult Membership",
  startDate: "",
  expirationDate: "",
  status: "active",
  qrToken: "",
  notes: "",
};

function MemberFormModal({
  member,
  onClose,
  onSave,
}) {
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (member) {
      setForm({
        firstName: member.firstName || "",
        lastName: member.lastName || "",
        membershipType:
          member.membershipType || "Adult Membership",
        startDate: member.startDate || "",
        expirationDate: member.expirationDate || "",
        status: member.status || "active",
        qrToken: member.qrToken || "",
        notes: member.notes || "",
      });
    } else {
      setForm({
        ...emptyForm,
        qrToken: generateMemberToken(),
      });
    }
  }, [member]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (
      !form.firstName.trim() ||
      !form.lastName.trim() ||
      !form.expirationDate ||
      !form.qrToken.trim()
    ) {
      return;
    }

    onSave(form);
  }

  function regenerateToken() {
    setForm((current) => ({
      ...current,
      qrToken: generateMemberToken(),
    }));
  }

  return (
    <div className="modal-backdrop">
      <div className="modal member-form-modal">
        <div className="modal-header">
          <div>
            <h2>
              {member ? "Edit Member" : "Add Member"}
            </h2>

            <p>
              Manage membership information and scan
              credentials.
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

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <label className="form-field">
              <span>First Name</span>

              <input
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                required
              />
            </label>

            <label className="form-field">
              <span>Last Name</span>

              <input
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
                required
              />
            </label>

            <label className="form-field">
              <span>Membership Type</span>

              <input
                name="membershipType"
                value={form.membershipType}
                onChange={handleChange}
              />
            </label>

            <label className="form-field">
              <span>Status</span>

              <select
                name="status"
                value={form.status}
                onChange={handleChange}
              >
                <option value="active">Active</option>
                <option value="suspended">
                  Suspended
                </option>
                <option value="inactive">
                  Inactive
                </option>
              </select>
            </label>

            <label className="form-field">
              <span>Start Date</span>

              <input
                type="date"
                name="startDate"
                value={form.startDate}
                onChange={handleChange}
              />
            </label>

            <label className="form-field">
              <span>Expiration Date</span>

              <input
                type="date"
                name="expirationDate"
                value={form.expirationDate}
                onChange={handleChange}
                required
              />
            </label>

            <div className="form-field form-field-full">
              <span>QR / Barcode Token</span>

              <div className="token-input-row">
                <input
                  name="qrToken"
                  value={form.qrToken}
                  onChange={handleChange}
                  required
                />

                <button
                  type="button"
                  className="secondary-button token-regenerate-button"
                  onClick={regenerateToken}
                >
                  <RefreshCw size={17} />
                  Generate
                </button>
              </div>
            </div>

            <label className="form-field form-field-full">
              <span>Notes</span>

              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows="4"
              />
            </label>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="primary-button"
            >
              {member ? "Save Changes" : "Add Member"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default MemberFormModal;