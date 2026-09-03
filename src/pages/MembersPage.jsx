import {
  CreditCard,
  Edit3,
  Search,
  Trash2,
  UserPlus,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import MemberFormModal from "../components/MemberFormModal";
import MemberPassModal from "../components/MemberPassModal";
import MembershipBadge from "../components/MembershipBadge";
import SendPassMenu from "../components/SendPassMenu";

import { useMembersRefresh } from "../contexts/membersRefreshContext";

import {
  deleteMember,
  getMembers,
  updateMember,
} from "../services/memberService";

import {
  formatDate,
  isExpiringSoon,
} from "../utils/dateUtils";

function MembersPage() {
  const [members, setMembers] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [
    editingMember,
    setEditingMember,
  ] = useState(null);

  const [
    passMember,
    setPassMember,
  ] = useState(null);

  const {
    membersVersion,
    notifyMembersChanged,
    openAddMember,
  } = useMembersRefresh();

  const loadMembers = useCallback(
    async () => {
      setLoading(true);
      setError("");

      try {
        const results =
          await getMembers();

        setMembers(results);
      } catch (loadError) {
        console.error(
          "Unable to load members:",
          loadError
        );

        setError(
          "Unable to load members from Firebase."
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadMembers();
  }, [loadMembers, membersVersion]);

  const filteredMembers =
    useMemo(() => {
      const query = search
        .trim()
        .toLowerCase();

      if (!query) {
        return members;
      }

      return members.filter(
        (member) => {
          const searchableValue = [
            member.firstName,
            member.lastName,
            member.membershipType,
            member.qrToken,
          ]
            .join(" ")
            .toLowerCase();

          return searchableValue.includes(
            query
          );
        }
      );
    }, [members, search]);

  async function handleEditMember(
    form
  ) {
    setError("");

    try {
      await updateMember(
        editingMember.id,
        form
      );

      await loadMembers();

      notifyMembersChanged();
      setEditingMember(null);
    } catch (saveError) {
      console.error(
        "Unable to update member:",
        saveError
      );

      setError(
        saveError.message ||
          "Unable to update member."
      );

      throw saveError;
    }
  }

  async function handleDelete(
    member
  ) {
    const confirmed =
      window.confirm(
        `Delete ${member.firstName} ${member.lastName}?`
      );

    if (!confirmed) {
      return;
    }

    setError("");

    try {
      await deleteMember(member.id);
      await loadMembers();

      notifyMembersChanged();
    } catch (deleteError) {
      console.error(
        "Unable to delete member:",
        deleteError
      );

      setError(
        "Unable to delete this member."
      );
    }
  }

  return (
    <div className="page">
      <header className="page-header page-header-actions">
        <div>
          <span className="eyebrow">
            Wings Arena
          </span>

          <h1>Members</h1>

          <p>
            Manage membership status,
            expiration dates and passes.
          </p>
        </div>

        <button
          type="button"
          className="primary-button page-add-member"
          onClick={openAddMember}
        >
          <UserPlus size={20} />
          Add Member
        </button>
      </header>

      {error && (
        <div
          style={{
            padding: "14px 16px",
            marginBottom: "20px",
            borderRadius: "10px",
            background: "#fff0f0",
            color: "#a62e2e",
            fontSize: "13px",
          }}
        >
          {error}
        </div>
      )}

      <section className="content-card">
        <div className="member-toolbar">
          <div className="search-box">
            <Search size={19} />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search members..."
            />
          </div>

          <div className="member-count">
            {loading
              ? "Loading..."
              : `${filteredMembers.length} ${
                  filteredMembers.length ===
                  1
                    ? "member"
                    : "members"
                }`}
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table members-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Membership</th>
                <th>Status</th>
                <th>Expiration</th>
                <th>QR Token</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan="6"
                    className="empty-table-cell"
                  >
                    Loading members from
                    Firebase...
                  </td>
                </tr>
              )}

              {!loading &&
                filteredMembers.map(
                  (member) => (
                    <tr
                      key={member.id}
                    >
                      <td>
                        <div className="member-name-cell">
                          <div className="member-avatar">
                            {member.firstName
                              .charAt(0)
                              .toUpperCase()}
                            {member.lastName
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div>
                            <strong>
                              {
                                member.firstName
                              }{" "}
                              {
                                member.lastName
                              }
                            </strong>

                            {isExpiringSoon(
                              member
                            ) && (
                              <span className="expiring-label">
                                Expiring
                                Soon
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td>
                        {
                          member.membershipType
                        }
                      </td>

                      <td>
                        <MembershipBadge
                          member={member}
                        />
                      </td>

                      <td>
                        {formatDate(
                          member.expirationDate
                        )}
                      </td>

                      <td>
                        <code className="qr-token">
                          {member.qrToken}
                        </code>
                      </td>

                      <td>
                        <div className="row-actions">
                          <button
                            type="button"
                            className="icon-button"
                            title="Membership pass"
                            onClick={() =>
                              setPassMember(
                                member
                              )
                            }
                          >
                            <CreditCard
                              size={18}
                            />
                          </button>

                          <SendPassMenu
                            member={member}
                            compact
                          />

                          <button
                            type="button"
                            className="icon-button"
                            title="Edit member"
                            onClick={() =>
                              setEditingMember(
                                member
                              )
                            }
                          >
                            <Edit3
                              size={18}
                            />
                          </button>

                          <button
                            type="button"
                            className="icon-button danger"
                            title="Delete member"
                            onClick={() =>
                              handleDelete(
                                member
                              )
                            }
                          >
                            <Trash2
                              size={18}
                            />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}

              {!loading &&
                filteredMembers.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan="6"
                      className="empty-table-cell"
                    >
                      {search
                        ? "No members match your search."
                        : "No members have been added yet."}
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>
      </section>

      {editingMember && (
        <MemberFormModal
          member={editingMember}
          onClose={() =>
            setEditingMember(null)
          }
          onSave={
            handleEditMember
          }
        />
      )}

      {passMember && (
        <MemberPassModal
          member={passMember}
          onClose={() =>
            setPassMember(null)
          }
        />
      )}
    </div>
  );
}

export default MembersPage;