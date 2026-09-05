import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "../firebase/firebase";
import {
  getDefaultMonthlyPrice,
  getMonthlyRevenue,
  monthKeyFor,
} from "../utils/membershipUtils";
import { generateMemberToken } from "../utils/tokenUtils";

const membersCollection = collection(
  db,
  "members"
);

const checkInsCollection = collection(
  db,
  "checkIns"
);

function normalizeMember(
  documentSnapshot
) {
  const data =
    documentSnapshot.data();

  return {
    id: documentSnapshot.id,
    ...data,
    familyMembers:
      Array.isArray(
        data.familyMembers
      )
        ? data.familyMembers
        : [],
  };
}

function normalizeCheckIn(
  documentSnapshot
) {
  const data =
    documentSnapshot.data();

  let timestamp = null;

  if (data.timestamp?.toDate) {
    timestamp = data.timestamp
      .toDate()
      .toISOString();
  } else if (
    typeof data.timestamp ===
    "string"
  ) {
    timestamp = data.timestamp;
  }

  return {
    id: documentSnapshot.id,
    ...data,
    timestamp,
  };
}


/*
  Members keep the rate they were billed at, so an
  older membership is not restated when pricing
  changes. New ones take the rate for their type.
*/
function resolveMonthlyPrice(
  memberData,
  membershipType
) {
  const provided = Number(
    memberData.monthlyPrice
  );

  if (
    Number.isFinite(provided) &&
    provided >= 0
  ) {
    return provided;
  }

  return getDefaultMonthlyPrice(
    membershipType
  );
}

function normalizeMemberData(
  memberData
) {
  const membershipType =
    memberData.membershipType.trim();

  return {
    firstName:
      memberData.firstName.trim(),
    lastName:
      memberData.lastName.trim(),
    email:
      memberData.email?.trim() ||
      "",
    phone:
      memberData.phone?.trim() ||
      "",
    membershipType,
    monthlyPrice: resolveMonthlyPrice(
      memberData,
      membershipType
    ),
    startDate:
      memberData.startDate || "",
    expirationDate:
      memberData.expirationDate,
    qrToken:
      memberData.qrToken
        .trim()
        .toUpperCase(),
    notes:
      memberData.notes?.trim() ||
      "",
  };
}

export async function getMembers() {
  const snapshot =
    await getDocs(
      membersCollection
    );

  const members =
    snapshot.docs.map(
      normalizeMember
    );

  return members.sort(
    (a, b) => {
      const lastNameComparison =
        a.lastName.localeCompare(
          b.lastName
        );

      if (
        lastNameComparison !== 0
      ) {
        return lastNameComparison;
      }

      return a.firstName.localeCompare(
        b.firstName
      );
    }
  );
}

export async function getMemberById(
  memberId
) {
  if (!memberId) {
    return null;
  }

  const memberReference = doc(
    db,
    "members",
    memberId
  );

  const snapshot =
    await getDoc(
      memberReference
    );

  if (!snapshot.exists()) {
    return null;
  }

  return normalizeMember(
    snapshot
  );
}

export async function getMemberByQrToken(
  qrToken
) {
  const normalizedToken =
    qrToken
      .trim()
      .toUpperCase();

  if (!normalizedToken) {
    return null;
  }

  const memberQuery = query(
    membersCollection,
    where(
      "qrToken",
      "==",
      normalizedToken
    ),
    limit(1)
  );

  const snapshot =
    await getDocs(
      memberQuery
    );

  if (snapshot.empty) {
    return null;
  }

  return normalizeMember(
    snapshot.docs[0]
  );
}

async function assertQrTokenAvailable(
  qrToken,
  excludedMemberId = null
) {
  const existingMember =
    await getMemberByQrToken(
      qrToken
    );

  if (
    existingMember &&
    existingMember.id !==
      excludedMemberId
  ) {
    throw new Error(
      "A member already uses this QR token."
    );
  }
}

export async function addMember(
  memberData
) {
  const normalizedData =
    normalizeMemberData({
      ...memberData,
      qrToken:
        memberData.qrToken?.trim() ||
        generateMemberToken(),
    });

  await assertQrTokenAvailable(
    normalizedData.qrToken
  );

  const documentReference =
    await addDoc(
      membersCollection,
      {
        ...normalizedData,
        createdAt:
          serverTimestamp(),
        updatedAt:
          serverTimestamp(),
      }
    );

  return {
    id: documentReference.id,
    ...normalizedData,
  };
}

function freezeBilledMonths(member) {
  const today = new Date();
  const year = today.getFullYear();

  const amounts = getMonthlyRevenue(
    member,
    year
  );

  const frozen = {
    ...(member.revenueByMonth || {}),
  };

  for (
    let month = 0;
    month < today.getMonth();
    month += 1
  ) {
    const key = monthKeyFor(
      year,
      month
    );

    if (!(key in frozen)) {
      frozen[key] = amounts[month];
    }
  }

  return frozen;
}

export async function updateMember(
  memberId,
  updates
) {
  const currentMember =
    await getMemberById(
      memberId
    );

  if (!currentMember) {
    throw new Error(
      "Member could not be found."
    );
  }

  const normalizedData =
    normalizeMemberData({
      ...currentMember,
      ...updates,
    });

  await assertQrTokenAvailable(
    normalizedData.qrToken,
    memberId
  );

  /*
    A membership that changes rate or type part way
    through a year must not restate the months already
    billed, so those are recorded before the change
    takes effect.
  */
  const rateChanged =
    normalizedData.monthlyPrice !==
      currentMember.monthlyPrice ||
    normalizedData.membershipType !==
      currentMember.membershipType;

  if (rateChanged) {
    normalizedData.revenueByMonth =
      freezeBilledMonths(
        currentMember
      );
  }

  const memberReference = doc(
    db,
    "members",
    memberId
  );

  await updateDoc(
    memberReference,
    {
      ...normalizedData,
      updatedAt:
        serverTimestamp(),
    }
  );

  return {
    ...currentMember,
    ...normalizedData,
  };
}


/*
  Writes single fields straight through, so an inline
  edit does not have to round-trip the whole record.
*/
export async function updateMemberFields(
  memberId,
  fields
) {
  await updateDoc(
    doc(db, "members", memberId),
    {
      ...fields,
      updatedAt: serverTimestamp(),
    }
  );
}

export async function deleteMember(
  memberId
) {
  const memberReference = doc(
    db,
    "members",
    memberId
  );

  await deleteDoc(
    memberReference
  );
}

export async function getCheckIns(
  maximumResults = 50
) {
  const checkInQuery = query(
    checkInsCollection,
    orderBy(
      "timestamp",
      "desc"
    ),
    limit(maximumResults)
  );

  const snapshot =
    await getDocs(
      checkInQuery
    );

  return snapshot.docs.map(
    normalizeCheckIn
  );
}

export async function recordCheckIn({
  memberId = null,
  qrToken,
  result,
  memberName = null,
  membershipType = null,
}) {
  const documentReference =
    await addDoc(
      checkInsCollection,
      {
        memberId,
        qrToken:
          qrToken
            .trim()
            .toUpperCase(),
        result,
        memberName,
        membershipType,
        timestamp:
          serverTimestamp(),
      }
    );

  return documentReference.id;
}