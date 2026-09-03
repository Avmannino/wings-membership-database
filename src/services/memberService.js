import { generateMemberToken } from "../utils/tokenUtils";

const MEMBERS_KEY = "wings-membership-database-members";
const CHECK_INS_KEY = "wings-membership-database-check-ins";

function dateFromToday(days) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);

  return date.toISOString().split("T")[0];
}

const demoMembers = [
  {
    id: "demo-001",
    firstName: "John",
    lastName: "Smith",
    membershipType: "Adult Membership",
    startDate: dateFromToday(-120),
    expirationDate: dateFromToday(120),
    status: "active",
    qrToken: "WINGS-1001",
    notes: "",
  },
  {
    id: "demo-002",
    firstName: "Sarah",
    lastName: "Miller",
    membershipType: "Family Membership",
    startDate: dateFromToday(-300),
    expirationDate: dateFromToday(18),
    status: "active",
    qrToken: "WINGS-1002",
    notes: "",
  },
  {
    id: "demo-003",
    firstName: "Michael",
    lastName: "Johnson",
    membershipType: "Adult Membership",
    startDate: dateFromToday(-400),
    expirationDate: dateFromToday(-15),
    status: "active",
    qrToken: "WINGS-1003",
    notes: "",
  },
  {
    id: "demo-004",
    firstName: "Emily",
    lastName: "Davis",
    membershipType: "Family Membership",
    startDate: dateFromToday(-90),
    expirationDate: dateFromToday(180),
    status: "suspended",
    qrToken: "WINGS-1004",
    notes: "Demo suspended membership.",
  },
];

function safeParse(value, fallback = []) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function initializeData() {
  if (!localStorage.getItem(MEMBERS_KEY)) {
    localStorage.setItem(MEMBERS_KEY, JSON.stringify(demoMembers));
  }

  if (!localStorage.getItem(CHECK_INS_KEY)) {
    localStorage.setItem(CHECK_INS_KEY, JSON.stringify([]));
  }
}

export function getMembers() {
  initializeData();

  const members = safeParse(localStorage.getItem(MEMBERS_KEY));

  return members.sort((a, b) => {
    const lastNameComparison = a.lastName.localeCompare(b.lastName);

    if (lastNameComparison !== 0) {
      return lastNameComparison;
    }

    return a.firstName.localeCompare(b.firstName);
  });
}

export function getMemberById(memberId) {
  return getMembers().find((member) => member.id === memberId) || null;
}

export function getMemberByQrToken(qrToken) {
  const normalizedToken = qrToken.trim().toUpperCase();

  return (
    getMembers().find(
      (member) => member.qrToken.trim().toUpperCase() === normalizedToken
    ) || null
  );
}

export function addMember(memberData) {
  const members = getMembers();

  const newMember = {
    id: crypto.randomUUID(),
    firstName: memberData.firstName.trim(),
    lastName: memberData.lastName.trim(),
    membershipType: memberData.membershipType.trim(),
    startDate: memberData.startDate,
    expirationDate: memberData.expirationDate,
    status: memberData.status || "active",
    qrToken:
      memberData.qrToken?.trim().toUpperCase() || generateMemberToken(),
    notes: memberData.notes?.trim() || "",
  };

  members.push(newMember);

  localStorage.setItem(MEMBERS_KEY, JSON.stringify(members));

  return newMember;
}

export function updateMember(memberId, updates) {
  const members = getMembers();

  const updatedMembers = members.map((member) => {
    if (member.id !== memberId) {
      return member;
    }

    return {
      ...member,
      ...updates,
      firstName: updates.firstName?.trim() ?? member.firstName,
      lastName: updates.lastName?.trim() ?? member.lastName,
      membershipType:
        updates.membershipType?.trim() ?? member.membershipType,
      qrToken:
        updates.qrToken?.trim().toUpperCase() ?? member.qrToken,
      notes: updates.notes?.trim() ?? member.notes,
    };
  });

  localStorage.setItem(MEMBERS_KEY, JSON.stringify(updatedMembers));

  return updatedMembers.find((member) => member.id === memberId);
}

export function deleteMember(memberId) {
  const members = getMembers();

  const updatedMembers = members.filter(
    (member) => member.id !== memberId
  );

  localStorage.setItem(MEMBERS_KEY, JSON.stringify(updatedMembers));
}

export function getCheckIns() {
  initializeData();

  return safeParse(localStorage.getItem(CHECK_INS_KEY)).sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );
}

export function recordCheckIn({
  memberId = null,
  qrToken,
  result,
}) {
  const checkIns = getCheckIns();

  const checkIn = {
    id: crypto.randomUUID(),
    memberId,
    qrToken,
    result,
    timestamp: new Date().toISOString(),
  };

  checkIns.unshift(checkIn);

  localStorage.setItem(CHECK_INS_KEY, JSON.stringify(checkIns));

  return checkIn;
}

export function resetDemoData() {
  localStorage.setItem(MEMBERS_KEY, JSON.stringify(demoMembers));
  localStorage.setItem(CHECK_INS_KEY, JSON.stringify([]));
}