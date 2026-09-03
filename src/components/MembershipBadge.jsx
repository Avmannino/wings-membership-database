import { getMembershipState } from "../utils/dateUtils";

function MembershipBadge({ member }) {
  const state = getMembershipState(member);

  const labels = {
    active: "Active",
    expired: "Expired",
    suspended: "Suspended",
    inactive: "Inactive",
  };

  return (
    <span className={`membership-badge ${state}`}>
      {labels[state] || state}
    </span>
  );
}

export default MembershipBadge;