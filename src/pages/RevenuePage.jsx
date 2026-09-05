import { UserPlus } from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import EditableCell from "../components/EditableCell";

import { useMembersRefresh } from "../contexts/membersRefreshContext";

import {
  getMembers,
  updateMemberFields,
} from "../services/memberService";

import { formatDate } from "../utils/dateUtils";

import {
  MONTH_LABELS,
  formatCurrency,
  getMemberDisplayName,
  getMonthlyPrice,
  getMonthlyRevenue,
  monthKeyFor,
} from "../utils/membershipUtils";

function RevenuePage() {
  const [members, setMembers] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [year, setYear] = useState(
    () => new Date().getFullYear()
  );

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
          "Unable to load membership data from Firebase."
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

  async function saveMonthAmount(
    member,
    monthIndex,
    amount
  ) {
    const key = monthKeyFor(
      year,
      monthIndex
    );

    const nextRevenue = {
      ...(member.revenueByMonth ||
        {}),
      [key]: amount,
    };

    setMembers((previous) =>
      previous.map((entry) =>
        entry.id === member.id
          ? {
              ...entry,
              revenueByMonth:
                nextRevenue,
            }
          : entry
      )
    );

    try {
      await updateMemberFields(
        member.id,
        {
          [`revenueByMonth.${key}`]:
            amount,
        }
      );
    } catch (saveError) {
      console.error(
        "Unable to save revenue:",
        saveError
      );

      setError(
        "That change could not be saved."
      );

      await loadMembers();
    }
  }

  async function saveMemberField(
    member,
    field,
    value
  ) {
    setMembers((previous) =>
      previous.map((entry) =>
        entry.id === member.id
          ? {
              ...entry,
              [field]: value,
            }
          : entry
      )
    );

    try {
      await updateMemberFields(
        member.id,
        { [field]: value }
      );

      notifyMembersChanged();
    } catch (saveError) {
      console.error(
        "Unable to save member:",
        saveError
      );

      setError(
        "That change could not be saved."
      );

      await loadMembers();
    }
  }

  const schedule = useMemo(() => {
    const rows = members
      .map((member) => ({
        id: member.id,
        member,
        name:
          getMemberDisplayName(
            member
          ),
        startDate: member.startDate,
        expirationDate:
          member.expirationDate,
        price:
          getMonthlyPrice(member),
        months: getMonthlyRevenue(
          member,
          year
        ),
      }))
      .sort((a, b) => {
        if (
          a.expirationDate &&
          b.expirationDate
        ) {
          return a.expirationDate.localeCompare(
            b.expirationDate
          );
        }

        return a.name.localeCompare(
          b.name
        );
      });

    const monthTotals = new Array(
      12
    ).fill(0);

    rows.forEach((row) => {
      row.months.forEach(
        (amount, index) => {
          monthTotals[index] +=
            amount;
        }
      );
    });

    return {
      rows,
      monthTotals,
      grandTotal:
        monthTotals.reduce(
          (sum, amount) =>
            sum + amount,
          0
        ),
    };
  }, [members, year]);

  const yearOptions = useMemo(() => {
    const currentYear =
      new Date().getFullYear();

    const years = new Set([
      currentYear,
      year,
    ]);

    members.forEach((member) => {
      const startYear = Number(
        (member.startDate || "").slice(
          0,
          4
        )
      );

      if (startYear) {
        years.add(startYear);
      }
    });

    return Array.from(years).sort();
  }, [members, year]);

  return (
    <div className="page">
      <header className="page-header page-header-actions">
        <div>
          <span className="eyebrow">
            Wings Arena
          </span>

          <h1>Revenue Schedule</h1>

          <p>
            Membership revenue by month.
            Click any amount or date to
            edit it.
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
        <div className="page-error">
          {error}
        </div>
      )}

      <section className="content-card">
        <div className="member-toolbar">
          <label className="revenue-year-picker">
            <span>Year</span>

            <select
              value={year}
              onChange={(event) =>
                setYear(
                  Number(
                    event.target.value
                  )
                )
              }
            >
              {yearOptions.map(
                (option) => (
                  <option
                    key={option}
                    value={option}
                  >
                    {option}
                  </option>
                )
              )}
            </select>
          </label>

          <div className="member-count">
            {loading
              ? "Loading..."
              : `${
                  schedule.rows.length
                } ${
                  schedule.rows
                    .length === 1
                    ? "membership"
                    : "memberships"
                }`}
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table revenue-table">
            <thead>
              <tr>
                <th>Memberships</th>
                <th>Purchase Date</th>
                <th>Renewal Date</th>

                {MONTH_LABELS.map(
                  (month) => (
                    <th
                      key={month}
                      className="revenue-month-column"
                    >
                      {month}
                    </th>
                  )
                )}
              </tr>
            </thead>

            <tbody>
              {!loading && (
                <tr className="revenue-total-row">
                  <td>
                    {formatCurrency(
                      schedule.grandTotal
                    )}
                  </td>

                  <td>Price</td>

                  <td />

                  {schedule.monthTotals.map(
                    (
                      total,
                      index
                    ) => (
                      <td
                        key={
                          MONTH_LABELS[
                            index
                          ]
                        }
                        className="revenue-month-column"
                      >
                        {formatCurrency(
                          total
                        )}
                      </td>
                    )
                  )}
                </tr>
              )}

              {loading && (
                <tr>
                  <td
                    colSpan="15"
                    className="empty-table-cell"
                  >
                    Loading membership
                    data...
                  </td>
                </tr>
              )}

              {!loading &&
                schedule.rows.map(
                  (row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>
                          {row.name}
                        </strong>
                      </td>

                      <EditableCell
                        type="date"
                        value={
                          row.startDate ||
                          ""
                        }
                        display={formatDate(
                          row.startDate
                        )}
                        title="Click to edit the purchase date"
                        onSave={(next) =>
                          saveMemberField(
                            row.member,
                            "startDate",
                            next
                          )
                        }
                      />

                      <EditableCell
                        type="date"
                        value={
                          row.expirationDate ||
                          ""
                        }
                        display={formatDate(
                          row.expirationDate
                        )}
                        title="Click to edit the renewal date"
                        onSave={(next) =>
                          saveMemberField(
                            row.member,
                            "expirationDate",
                            next
                          )
                        }
                      />

                      {row.months.map(
                        (
                          amount,
                          index
                        ) => (
                          <EditableCell
                            key={
                              MONTH_LABELS[
                                index
                              ]
                            }
                            className={`revenue-month-column ${
                              amount >
                              0
                                ? "revenue-billed"
                                : ""
                            }`}
                            value={amount}
                            display={formatCurrency(
                              amount
                            )}
                            title={`Click to edit ${
                              MONTH_LABELS[
                                index
                              ]
                            } for ${row.name}`}
                            onSave={(next) =>
                              saveMonthAmount(
                                row.member,
                                index,
                                next
                              )
                            }
                          />
                        )
                      )}
                    </tr>
                  )
                )}

              {!loading &&
                schedule.rows.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan="15"
                      className="empty-table-cell"
                    >
                      No memberships have
                      been added yet.
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default RevenuePage;
