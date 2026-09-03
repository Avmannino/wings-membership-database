import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  UserCheck,
  Users,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import {
  getCheckIns,
  getMemberById,
  getMembers,
} from "../services/memberService";

import {
  formatDateTime,
  getMembershipState,
  isExpiringSoon,
  isToday,
} from "../utils/dateUtils";

function DashboardPage() {
  const [members, setMembers] = useState([]);
  const [checkIns, setCheckIns] = useState([]);

  useEffect(() => {
    setMembers(getMembers());
    setCheckIns(getCheckIns());
  }, []);

  const activeMembers = members.filter(
    (member) =>
      getMembershipState(member) === "active"
  );

  const expiredMembers = members.filter(
    (member) =>
      getMembershipState(member) === "expired"
  );

  const expiringSoon = members.filter((member) =>
    isExpiringSoon(member)
  );

  const todaysSuccessfulCheckIns = checkIns.filter(
    (checkIn) =>
      checkIn.result === "active" &&
      isToday(checkIn.timestamp)
  );

  const recentCheckIns = checkIns.slice(0, 10);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <span className="eyebrow">
            Wings Arena
          </span>

          <h1>Membership Dashboard</h1>

          <p>
            Current membership status and recent
            check-ins.
          </p>
        </div>
      </header>

      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <Users size={22} />
          </div>

          <div>
            <span>Total Members</span>
            <strong>{members.length}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <CheckCircle2 size={22} />
          </div>

          <div>
            <span>Active</span>
            <strong>{activeMembers.length}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <CalendarClock size={22} />
          </div>

          <div>
            <span>Expiring in 30 Days</span>
            <strong>{expiringSoon.length}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Clock3 size={22} />
          </div>

          <div>
            <span>Expired</span>
            <strong>{expiredMembers.length}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <UserCheck size={22} />
          </div>

          <div>
            <span>Check-Ins Today</span>
            <strong>
              {todaysSuccessfulCheckIns.length}
            </strong>
          </div>
        </div>
      </section>

      <section className="content-card">
        <div className="content-card-header">
          <div>
            <h2>Recent Check-Ins</h2>

            <p>
              Latest scans recorded by the system.
            </p>
          </div>
        </div>

        {recentCheckIns.length === 0 ? (
          <div className="empty-state">
            No check-ins have been recorded yet.
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
                {recentCheckIns.map((checkIn) => {
                  const member = checkIn.memberId
                    ? getMemberById(checkIn.memberId)
                    : null;

                  return (
                    <tr key={checkIn.id}>
                      <td>
                        {member
                          ? `${member.firstName} ${member.lastName}`
                          : "Unknown Pass"}
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
                        {formatDateTime(
                          checkIn.timestamp
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default DashboardPage;