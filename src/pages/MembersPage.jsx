import {
  CreditCard,
  Edit3,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import {
  useMemo,
  useState,
} from "react";

import MemberFormModal from "../components/MemberFormModal";
import MemberPassModal from "../components/MemberPassModal";
import MembershipBadge from "../components/MembershipBadge";

import {
  addMember,
  deleteMember,
  getMembers,
  updateMember,
} from "../services/memberService";

import {
  formatDate,
  isExpiringSoon,
} from "../utils/dateUtils";

function MembersPage() {
  const [members, setMembers] = useState(
    getMembers()
  );

  const [search, setSearch] = useState("");
  const [editingMember, setEditingMember] =
    useState(null);

  const [passMember, setPassMember] =
    useState(null);

  const [showAddMember, setShowAddMember] =
    useState(false);

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return members;
    }

    return members.filter((member) => {
      const searchableValue = [
        member.firstName,
        member.lastName,
        member.membershipType,
        member.qrToken,
      ]
        .join(" ")
        .toLowerCase();

      return searchableValue.includes(query);
    });
  }, [members, search]);

  function refreshMembers() {
    setMembers(getMembers());
  }

  function handleAddMember(form) {
    addMember(form);
    refreshMembers();
    setShowAddMember(false);
  }

  function handleEditMember(form) {
    updateMember(editingMember.id, form);
    refreshMembers();
    setEditingMember(null);
  }

  function handleDelete(member) {
    const confirmed = window.confirm(
      `Delete ${member.firstName} ${member.lastName}?`
    );

    if (!confirmed) {
      return;
    }

    deleteMember(member.id);
    refreshMembers();
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
            Manage membership status, expiration
            dates and passes.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={() => setShowAddMember(true)}
        >
          <Plus size={18} />
          Add Member
        </button>
      </header>

      <section className="content-card">
        <div className="member-toolbar">
          <div className="search-box">
            <Search size={19} />

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search members..."
            />
          </div>

          <div className="member-count">
            {filteredMembers.length}{" "}
            {filteredMembers.length === 1
              ? "member"
              : "members"}
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
              {filteredMembers.map((member) => (
                <tr key={member.id}>
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
                          {member.firstName}{" "}
                          {member.lastName}
                        </strong>

                        {isExpiringSoon(member) && (
                          <span className="expiring-label">
                            Expiring Soon
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  <td>{member.membershipType}</td>

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
                          setPassMember(member)
                        }
                      >
                        <CreditCard size={18} />
                      </button>

                      <button
                        type="button"
                        className="icon-button"
                        title="Edit member"
                        onClick={() =>
                          setEditingMember(member)
                        }
                      >
                        <Edit3 size={18} />
                      </button>

                      <button
                        type="button"
                        className="icon-button danger"
                        title="Delete member"
                        onClick={() =>
                          handleDelete(member)
                        }
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredMembers.length === 0 && (
                <tr>
                  <td
                    colSpan="6"
                    className="empty-table-cell"
                  >
                    No members match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showAddMember && (
        <MemberFormModal
          member={null}
          onClose={() => setShowAddMember(false)}
          onSave={handleAddMember}
        />
      )}

      {editingMember && (
        <MemberFormModal
          member={editingMember}
          onClose={() => setEditingMember(null)}
          onSave={handleEditMember}
        />
      )}

      {passMember && (
        <MemberPassModal
          member={passMember}
          onClose={() => setPassMember(null)}
        />
      )}
    </div>
  );
}

export default MembersPage;