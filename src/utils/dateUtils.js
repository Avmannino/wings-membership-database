export function parseDateOnly(dateString) {
  if (!dateString) {
    return null;
  }

  return new Date(`${dateString}T12:00:00`);
}

export function getToday() {
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  return today;
}

export function getMembershipState(member) {
  if (!member) {
    return "not_found";
  }

  if (member.status === "suspended") {
    return "suspended";
  }

  if (member.status === "inactive") {
    return "inactive";
  }

  const expirationDate = parseDateOnly(member.expirationDate);

  if (!expirationDate) {
    return "expired";
  }

  if (expirationDate < getToday()) {
    return "expired";
  }

  return "active";
}

export function isExpiringSoon(member, days = 30) {
  if (getMembershipState(member) !== "active") {
    return false;
  }

  const expirationDate = parseDateOnly(member.expirationDate);
  const today = getToday();

  const millisecondsPerDay = 1000 * 60 * 60 * 24;

  const difference = Math.ceil(
    (expirationDate - today) / millisecondsPerDay
  );

  return difference >= 0 && difference <= days;
}

export function formatDate(dateString) {
  const date = parseDateOnly(dateString);

  if (!date) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(dateString) {
  if (!dateString) {
    return "—";
  }

  const date = new Date(dateString);

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function isToday(dateString) {
  const date = new Date(dateString);
  const today = new Date();

  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}