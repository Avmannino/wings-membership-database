import { parseDateOnly } from "./dateUtils";

export const FAMILY_MONTHLY_PRICE = 200;
export const INDIVIDUAL_MONTHLY_PRICE = 100;

export function isFamilyMembership(
  member
) {
  return (
    (member?.membershipType || "")
      .trim()
      .toLowerCase() === "family"
  );
}

/*
  A family membership is booked under the household
  name rather than whoever signed up for it.
*/
export function getMemberDisplayName(
  member
) {
  if (!member) {
    return "";
  }

  const firstName = (
    member.firstName || ""
  ).trim();

  const lastName = (
    member.lastName || ""
  ).trim();

  if (isFamilyMembership(member)) {
    return lastName
      ? `${lastName} Family`
      : "Family";
  }

  return `${firstName} ${lastName}`.trim();
}

export function getDefaultMonthlyPrice(
  membershipType
) {
  return (membershipType || "")
    .trim()
    .toLowerCase() === "family"
    ? FAMILY_MONTHLY_PRICE
    : INDIVIDUAL_MONTHLY_PRICE;
}

/*
  Members carry their own rate so historical records
  keep the amount they were actually billed, even
  where it differs from today's pricing.
*/
export function getMonthlyPrice(
  member
) {
  const stored = Number(
    member?.monthlyPrice
  );

  if (
    Number.isFinite(stored) &&
    stored >= 0
  ) {
    return stored;
  }

  return getDefaultMonthlyPrice(
    member?.membershipType
  );
}

export function monthKeyFor(
  year,
  monthIndex
) {
  return `${year}-${String(
    monthIndex + 1
  ).padStart(2, "0")}`;
}

function toMonthIndex(date) {
  return (
    date.getFullYear() * 12 +
    date.getMonth()
  );
}

/*
  A membership is billed from the month it was
  purchased through the month before it renews.
*/
export function getMonthlyRevenue(
  member,
  year
) {
  const months = new Array(12).fill(0);

  const startDate = parseDateOnly(
    member?.startDate
  );

  /*
    Months are recorded individually so a rate change
    cannot restate what was already billed. Anything
    without a recorded amount falls back to the
    membership's current schedule.
  */
  const recorded =
    member?.revenueByMonth &&
    typeof member.revenueByMonth ===
      "object"
      ? member.revenueByMonth
      : {};



  for (
    let month = 0;
    month < 12;
    month += 1
  ) {
    const key = monthKeyFor(
      year,
      month
    );

    if (key in recorded) {
      months[month] =
        Number(recorded[key]) || 0;
    }
  }

  if (!startDate) {
    return months;
  }

  const renewalDate = parseDateOnly(
    member?.expirationDate
  );

  const price =
    getMonthlyPrice(member);

  const firstBilled =
    toMonthIndex(startDate);

  const stopBilling = renewalDate
    ? toMonthIndex(renewalDate)
    : Infinity;

  for (
    let month = 0;
    month < 12;
    month += 1
  ) {
    const current =
      year * 12 + month;

    if (
      monthKeyFor(year, month) in
      recorded
    ) {
      continue;
    }

    if (
      current >= firstBilled &&
      current < stopBilling
    ) {
      months[month] = price;
    }
  }

  return months;
}

export function formatCurrency(
  amount
) {
  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }
  ).format(amount || 0);
}

export const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
