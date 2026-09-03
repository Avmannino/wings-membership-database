import {
  useEffect,
  useState,
} from "react";

import {
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";

import { generateMemberToken } from "../utils/tokenUtils";

const emptyFamilyMember = {
  name: "",
  relationship: "",
};

const emptyForm = {
  firstName: "",
  lastName: "",
  membershipType: "Individual",
  startDate: "",
  expirationDate: "",
  qrToken: "",
  notes: "",
  familyMembers: [],
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

  useEffect(() => {
    if (member) {
      setForm({
        firstName:
          member.firstName || "",
        lastName:
          member.lastName || "",
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
        familyMembers:
          Array.isArray(
            member.familyMembers
          )
            ? member.familyMembers
            : [],
      });
    } else {
      setForm({
        ...emptyForm,
        qrToken:
          generateMemberToken(),
      });
    }

    setError("");
  }, [member]);

  function handleChange(event) {
    const {
      name,
      value,
    } = event.target;

    setForm((current) => {
      const updatedForm = {
        ...current,
        [name]: value,
      };

      if (
        name === "membershipType" &&
        value === "Family" &&
        current.familyMembers.length === 0
      ) {
        updatedForm.familyMembers = [
          { ...emptyFamilyMember },
        ];
      }

      if (
        name === "membershipType" &&
        value === "Individual"
      ) {
        updatedForm.familyMembers = [];
      }

      return updatedForm;
    });
  }

  function handleFamilyMemberChange(
    index,
    field,
    value
  ) {
    setForm((current) => ({
      ...current,
      familyMembers:
        current.familyMembers.map(
          (familyMember, memberIndex) =>
            memberIndex === index
              ? {
                  ...familyMember,
                  [field]: value,
                }
              : familyMember
        ),
    }));
  }

  function addFamilyMember() {
    setForm((current) => ({
      ...current,
      familyMembers: [
        ...current.familyMembers,
        { ...emptyFamilyMember },
      ],
    }));
  }

  function removeFamilyMember(index) {
    setForm((current) => ({
      ...current,
      familyMembers:
        current.familyMembers.filter(
          (_, memberIndex) =>
            memberIndex !== index
        ),
    }));
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

    if (
      form.membershipType === "Family"
    ) {
      const incompleteFamilyMember =
        form.familyMembers.some(
          (familyMember) =>
            !familyMember.name.trim() ||
            !familyMember.relationship.trim()
        );

      if (incompleteFamilyMember) {
        setError(
          "Please enter a name and relationship for each family member."
        );

        return;
      }
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

            {form.membershipType ===
              "Family" && (
              <div className="form-field form-field-full">
                <span>
                  Family Members
                </span>

                <div
                  style={{
                    display: "flex",
                    flexDirection:
                      "column",
                    gap: "10px",
                    marginTop: "2px",
                  }}
                >
                  {form.familyMembers.map(
                    (
                      familyMember,
                      index
                    ) => (
                      <div
                        key={index}
                        style={{
                          display:
                            "grid",
                          gridTemplateColumns:
                            "minmax(0, 1fr) minmax(150px, 0.7fr) 38px",
                          gap: "8px",
                          alignItems:
                            "center",
                        }}
                      >
                        <input
                          type="text"
                          value={
                            familyMember.name
                          }
                          onChange={(
                            event
                          ) =>
                            handleFamilyMemberChange(
                              index,
                              "name",
                              event
                                .target
                                .value
                            )
                          }
                          placeholder="Family member name"
                          disabled={
                            submitting
                          }
                          required
                        />

                        <select
                          value={
                            familyMember.relationship
                          }
                          onChange={(
                            event
                          ) =>
                            handleFamilyMemberChange(
                              index,
                              "relationship",
                              event
                                .target
                                .value
                            )
                          }
                          disabled={
                            submitting
                          }
                          required
                        >
                          <option value="">
                            Relationship
                          </option>

                          <option value="Spouse / Partner">
                            Spouse /
                            Partner
                          </option>

                          <option value="Child">
                            Child
                          </option>

                          <option value="Parent">
                            Parent
                          </option>

                          <option value="Sibling">
                            Sibling
                          </option>

                          <option value="Other">
                            Other
                          </option>
                        </select>

                        <button
                          type="button"
                          className="icon-button danger"
                          title="Remove family member"
                          onClick={() =>
                            removeFamilyMember(
                              index
                            )
                          }
                          disabled={
                            submitting
                          }
                        >
                          <Trash2
                            size={17}
                          />
                        </button>
                      </div>
                    )
                  )}

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={
                      addFamilyMember
                    }
                    disabled={submitting}
                    style={{
                      width:
                        "fit-content",
                    }}
                  >
                    <Plus size={17} />
                    Add Family Member
                  </button>
                </div>
              </div>
            )}

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