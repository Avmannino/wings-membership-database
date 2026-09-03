import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { useMembersRefresh } from "../contexts/membersRefreshContext";

import {
  getCheckIns,
  getMembers,
} from "../services/memberService";

import {
  formatDateTime,
  getMembershipState,
  isExpiringSoon,
  isToday,
} from "../utils/dateUtils";

function DashboardPage() {
  const [members, setMembers] =
    useState([]);

  const [checkIns, setCheckIns] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const {
    membersVersion,
    openAddMember,
  } = useMembersRefresh();

  const loadDashboard = useCallback(
    async () => {
      setLoading(true);
      setError("");

      try {
        const [
          memberResults,
          checkInResults,
        ] = await Promise.all([
          getMembers(),
          getCheckIns(50),
        ]);

        setMembers(memberResults);
        setCheckIns(checkInResults);
      } catch (loadError) {
        console.error(
          "Unable to load dashboard:",
          loadError
        );

        setError(
          "Unable to load membership data."
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard, membersVersion]);

  const activeMembers =
    members.filter(
      (member) =>
        getMembershipState(member) ===
        "active"
    );

  const expiredMembers =
    members.filter(
      (member) =>
        getMembershipState(member) ===
        "expired"
    );

  const expiringSoon =
    members.filter((member) =>
      isExpiringSoon(member)
    );

  const todaysSuccessfulCheckIns =
    checkIns.filter(
      (checkIn) =>
        checkIn.result === "active" &&
        checkIn.timestamp &&
        isToday(checkIn.timestamp)
    );

  const recentCheckIns =
    checkIns.slice(0, 10);

  return (
    <div className="page">
      <header className="page-header page-header-actions">
        <div>
          <span className="eyebrow">
            Wings Arena
          </span>

          <h1>
            Membership Dashboard
          </h1>

          <p>
            Current membership status and
            recent check-ins.
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

      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <Users size={22} />
          </div>

          <div>
            <span>Total Members</span>

            <strong>
              {loading
                ? "—"
                : members.length}
            </strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <CheckCircle2 size={22} />
          </div>

          <div>
            <span>Active</span>

            <strong>
              {loading
                ? "—"
                : activeMembers.length}
            </strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <CalendarClock
              size={22}
            />
          </div>

          <div>
            <span>
              Expiring in 30 Days
            </span>

            <strong>
              {loading
                ? "—"
                : expiringSoon.length}
            </strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Clock3 size={22} />
          </div>

          <div>
            <span>Expired</span>

            <strong>
              {loading
                ? "—"
                : expiredMembers.length}
            </strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <UserCheck size={22} />
          </div>

          <div>
            <span>
              Check-Ins Today
            </span>

            <strong>
              {loading
                ? "—"
                : todaysSuccessfulCheckIns.length}
            </strong>
          </div>
        </div>
      </section>

      <section className="content-card">
        <div className="content-card-header">
          <div>
            <h2>
              Recent Check-Ins
            </h2>

            <p>
              Latest scans recorded by
              the system.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">
            Loading check-ins...
          </div>
        ) : recentCheckIns.length ===
          0 ? (
          <div className="empty-state">
            No check-ins have been
            recorded yet.
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Result</th>
                  <th>Time</th>
                </tr>
              </thead>

              <tbody>
                {recentCheckIns.map(
                  (checkIn) => (
                    <tr
                      key={checkIn.id}
                    >
                      <td>
                        {checkIn.memberName ||
                          "Unknown Pass"}
                      </td>

                      <td>
                        <span
                          className={`check-in-result-badge ${checkIn.result}`}
                        >
                          {checkIn.result.replace(
                            "_",
                            " "
                          )}
                        </span>
                      </td>

                      <td>
                        {checkIn.timestamp
                          ? formatDateTime(
                              checkIn.timestamp
                            )
                          : "Processing..."}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default DashboardPage;