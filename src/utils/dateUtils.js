export function parseDateOnly(dateString) {
  if (!dateString) {
    return null;
  }

  return new Date(`${dateString}T12:00:00`);
}

/*
  A membership runs to the same day of the next month.
  Months are uneven, so a start date late in the month
  falls back to the last day the next one has.
*/
export function addOneMonth(dateString) {
  if (!dateString) {
    return "";
  }

  const [year, month, day] = dateString
    .split("-")
    .map(Number);

  if (!year || !month || !day) {
    return "";
  }

  const lastDayOfNextMonth = new Date(
    year,
    month + 1,
    0
  ).getDate();

  const target = new Date(
    year,
    month,
    Math.min(day, lastDayOfNextMonth)
  );

  const targetMonth = String(
    target.getMonth() + 1
  ).padStart(2, "0");

  const targetDay = String(
    target.getDate()
  ).padStart(2, "0");

  return `${target.getFullYear()}-${targetMonth}-${targetDay}`;
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