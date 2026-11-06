export const GIFT_CARD_PREFIX = "WINGS-GC-";

const GIFT_CARD_CODE_PATTERN =
  /^WINGS-GC-\d{1,10}$/;

export function formatGiftCardId(
  number
) {
  return `${GIFT_CARD_PREFIX}${String(
    number
  ).padStart(4, "0")}`;
}

/*
  Scans and typed codes both go through the layout, so
  a gift card number has to be told apart from a
  membership pass before anything is looked up.
*/
export function isGiftCardCode(
  value
) {
  return GIFT_CARD_CODE_PATTERN.test(
    (value || "").trim().toUpperCase()
  );
}

export function getGiftCardNumber(
  giftCardId
) {
  return (
    Number(
      (giftCardId || "").slice(
        GIFT_CARD_PREFIX.length
      )
    ) || 0
  );
}

/*
  Balances are added up in whole cents so a run of
  small purchases cannot drift by a fraction of a cent.
*/
export function toCents(amount) {
  const value = Number(amount);

  return Number.isFinite(value)
    ? Math.round(value * 100)
    : 0;
}

export function roundMoney(amount) {
  return toCents(amount) / 100;
}

export function calculateBalance(
  originalValue,
  transactions = []
) {
  const cents = transactions.reduce(
    (total, entry) => {
      const amount = toCents(
        entry.amount
      );

      return entry.type === "reload"
        ? total + amount
        : total - amount;
    },
    toCents(originalValue)
  );

  return cents / 100;
}

export function sumTransactions(
  transactions = [],
  type
) {
  return (
    transactions
      .filter(
        (entry) => entry.type === type
      )
      .reduce(
        (total, entry) =>
          total + toCents(entry.amount),
        0
      ) / 100
  );
}

export function getGiftCardStatus(
  card
) {
  return toCents(card?.currentBalance) >
    0
    ? "active"
    : "redeemed";
}

export function formatMoney(amount) {
  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "USD",
    }
  ).format(Number(amount) || 0);
}
