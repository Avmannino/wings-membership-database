import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

import {
  auth,
  db,
} from "../firebase/firebase";

import {
  calculateBalance,
  formatGiftCardId,
  formatMoney,
  getGiftCardNumber,
  roundMoney,
  toCents,
} from "../utils/giftCardUtils";

const giftCardsCollection = collection(
  db,
  "giftCards"
);

/*
  Card numbers come from a single counter read and
  bumped inside the same transaction that creates the
  card, so two front-desk computers can never hand out
  the same number.
*/
const counterReference = doc(
  db,
  "counters",
  "giftCards"
);

function giftCardReference(cardId) {
  return doc(db, "giftCards", cardId);
}

function staffEmail() {
  return auth.currentUser?.email || "";
}

function normalizeGiftCard(
  documentSnapshot
) {
  const data =
    documentSnapshot.data();

  const transactions =
    Array.isArray(data.transactions)
      ? data.transactions
      : [];

  return {
    id: documentSnapshot.id,
    ...data,
    giftCardId:
      data.giftCardId ||
      documentSnapshot.id,
    originalValue: roundMoney(
      data.originalValue
    ),
    transactions,
    currentBalance: calculateBalance(
      data.originalValue,
      transactions
    ),
  };
}

function normalizeGiftCardData(form) {
  const data = {
    purchaserName:
      form.purchaserName?.trim() || "",
    purchaserEmail:
      form.purchaserEmail?.trim() || "",
    recipientName:
      form.recipientName?.trim() || "",
    recipientEmail:
      form.recipientEmail?.trim() || "",
    originalValue: roundMoney(
      form.originalValue
    ),
    dateIssued: form.dateIssued || "",
    notes: form.notes?.trim() || "",
  };

  if (
    !data.purchaserName ||
    !data.purchaserEmail ||
    !data.recipientName ||
    !data.dateIssued
  ) {
    throw new Error(
      "Please complete all required fields."
    );
  }

  if (toCents(data.originalValue) <= 0) {
    throw new Error(
      "The original value must be more than $0."
    );
  }

  return data;
}

export function subscribeToGiftCards(
  onChange,
  onError
) {
  return onSnapshot(
    giftCardsCollection,
    (snapshot) => {
      const cards = snapshot.docs
        .map(normalizeGiftCard)
        .sort(
          (a, b) =>
            getGiftCardNumber(
              b.giftCardId
            ) -
            getGiftCardNumber(
              a.giftCardId
            )
        );

      onChange(cards);
    },
    onError
  );
}

export function subscribeToGiftCard(
  cardId,
  onChange,
  onError
) {
  return onSnapshot(
    giftCardReference(cardId),
    (snapshot) => {
      onChange(
        snapshot.exists()
          ? normalizeGiftCard(snapshot)
          : null
      );
    },
    onError
  );
}

export async function createGiftCard(
  form
) {
  const data =
    normalizeGiftCardData(form);

  return runTransaction(
    db,
    async (transaction) => {
      const counter =
        await transaction.get(
          counterReference
        );

      let number =
        (Number(
          counter.data()?.lastNumber
        ) || 0) + 1;

      let reference = giftCardReference(
        formatGiftCardId(number)
      );

      /*
        Should the counter ever be reset, step past
        numbers already in use rather than overwrite
        a card someone is holding.
      */
      while (
        (await transaction.get(reference))
          .exists()
      ) {
        number += 1;

        reference = giftCardReference(
          formatGiftCardId(number)
        );
      }

      transaction.set(
        counterReference,
        { lastNumber: number },
        { merge: true }
      );

      transaction.set(reference, {
        ...data,
        giftCardId: reference.id,
        transactions: [],
        currentBalance:
          data.originalValue,
        createdBy: staffEmail(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return reference.id;
    }
  );
}

export async function updateGiftCard(
  cardId,
  form
) {
  const data =
    normalizeGiftCardData(form);

  const reference =
    giftCardReference(cardId);

  await runTransaction(
    db,
    async (transaction) => {
      const snapshot =
        await transaction.get(reference);

      if (!snapshot.exists()) {
        throw new Error(
          "This gift card could not be found."
        );
      }

      const card =
        normalizeGiftCard(snapshot);

      const currentBalance =
        calculateBalance(
          data.originalValue,
          card.transactions
        );

      if (toCents(currentBalance) < 0) {
        throw new Error(
          `The original value cannot be less than the ${formatMoney(
            card.originalValue -
              card.currentBalance
          )} already used.`
        );
      }

      transaction.update(reference, {
        ...data,
        currentBalance,
        updatedAt: serverTimestamp(),
      });
    }
  );
}

/*
  Every redemption and top-up is kept as its own entry,
  so the balance can always be traced back and a
  mistaken entry removed without guessing.
*/
export async function recordGiftCardTransaction(
  cardId,
  { type, amount, note = "" }
) {
  const value = roundMoney(amount);

  if (toCents(value) <= 0) {
    throw new Error(
      "Enter an amount greater than $0."
    );
  }

  const reference =
    giftCardReference(cardId);

  await runTransaction(
    db,
    async (transaction) => {
      const snapshot =
        await transaction.get(reference);

      if (!snapshot.exists()) {
        throw new Error(
          "This gift card could not be found."
        );
      }

      const card =
        normalizeGiftCard(snapshot);

      if (
        type === "redeem" &&
        toCents(value) >
          toCents(card.currentBalance)
      ) {
        throw new Error(
          `This card only has ${formatMoney(
            card.currentBalance
          )} left.`
        );
      }

      const transactions = [
        ...card.transactions,
        {
          id: crypto.randomUUID(),
          type,
          amount: value,
          note: note.trim(),
          date: new Date().toISOString(),
          recordedBy: staffEmail(),
        },
      ];

      transaction.update(reference, {
        transactions,
        currentBalance: calculateBalance(
          card.originalValue,
          transactions
        ),
        updatedAt: serverTimestamp(),
      });
    }
  );
}

export async function removeGiftCardTransaction(
  cardId,
  entryId
) {
  const reference =
    giftCardReference(cardId);

  await runTransaction(
    db,
    async (transaction) => {
      const snapshot =
        await transaction.get(reference);

      if (!snapshot.exists()) {
        throw new Error(
          "This gift card could not be found."
        );
      }

      const card =
        normalizeGiftCard(snapshot);

      const transactions =
        card.transactions.filter(
          (entry) => entry.id !== entryId
        );

      const currentBalance =
        calculateBalance(
          card.originalValue,
          transactions
        );

      if (toCents(currentBalance) < 0) {
        throw new Error(
          "Removing this entry would leave a negative balance. Remove the later purchases first."
        );
      }

      transaction.update(reference, {
        transactions,
        currentBalance,
        updatedAt: serverTimestamp(),
      });
    }
  );
}

export async function deleteGiftCard(
  cardId
) {
  await deleteDoc(
    giftCardReference(cardId)
  );
}
