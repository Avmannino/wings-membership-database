/*
  One-time import of the memberships carried over from
  the Monthly Revenue Schedule spreadsheet.

  Signs in as a staff account and writes through the
  same security rules the app uses, so no service
  account key is needed.

  Usage:
    WINGS_EMAIL=you@example.com \
    WINGS_PASSWORD=yourpassword \
    node scripts/import-members.mjs [--dry-run]
*/

import { readFile } from "node:fs/promises";

import { initializeApp } from "firebase/app";

import {
  getAuth,
  signInWithEmailAndPassword,
} from "firebase/auth";

import {
  addDoc,
  collection,
  getDocs,
  getFirestore,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDs3ylmo5SdF_e5kS6J-x2lkoG9hT_y5vs",
  authDomain: "wings-membership-database.firebaseapp.com",
  projectId: "wings-membership-database",
  storageBucket: "wings-membership-database.firebasestorage.app",
  messagingSenderId: "133864100849",
  appId: "1:133864100849:web:aee1105e73b9da3aa7aa50",
};

const dryRun =
  process.argv.includes("--dry-run");

const email = process.env.WINGS_EMAIL;
const password =
  process.env.WINGS_PASSWORD;

if (!email || !password) {
  console.error(
    "Set WINGS_EMAIL and WINGS_PASSWORD to a staff account."
  );

  process.exit(1);
}

const members = JSON.parse(
  await readFile(
    new URL(
      "../src/data/membersImport.json",
      import.meta.url
    ),
    "utf8"
  )
);

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

try {
  await signInWithEmailAndPassword(
    auth,
    email,
    password
  );
} catch (error) {
  console.error(
    `\nCould not sign in as ${email}: ${error.code || error.message}`
  );

  console.error(
    "Check the email and password, and that the account exists in Firebase Authentication."
  );

  process.exit(1);
}

console.log(
  `Signed in as ${email}.`
);

const membersCollection = collection(
  db,
  "members"
);

const existing = await getDocs(
  membersCollection
);

/*
  Re-running must not double up the roster, so anything
  already carrying one of these codes is left alone.
*/
const existingTokens = new Set(
  existing.docs
    .map(
      (entry) =>
        entry.data().qrToken
    )
    .filter(Boolean)
);

const existingNames = new Set(
  existing.docs.map((entry) => {
    const data = entry.data();

    return `${data.firstName} ${data.lastName} ${data.startDate}`.toLowerCase();
  })
);

let written = 0;
let skipped = 0;

for (const member of members) {
  const nameKey =
    `${member.firstName} ${member.lastName} ${member.startDate}`.toLowerCase();

  if (
    existingTokens.has(
      member.qrToken
    ) ||
    existingNames.has(nameKey)
  ) {
    skipped += 1;
    continue;
  }

  const record = {
    ...member,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (dryRun) {
    console.log(
      `  would add ${member.firstName} ${member.lastName} (${member.membershipType})`
    );
  } else {
    try {
      await addDoc(
        membersCollection,
        record
      );
    } catch (error) {
      console.error(
        `\nFailed writing ${member.firstName} ${member.lastName}: ${
          error.code || error.message
        }`
      );

      console.error(
        "If this says permission-denied, the Firestore rules are blocking writes to the members collection."
      );

      process.exit(1);
    }
  }

  written += 1;
}

const total = members.reduce(
  (sum, member) =>
    sum +
    Object.values(
      member.revenueByMonth || {}
    ).reduce(
      (inner, amount) =>
        inner + amount,
      0
    ),
  0
);

if (dryRun) {
  console.log(
    "\n*** DRY RUN - nothing was written. Re-run without --dry-run to import. ***"
  );
}

console.log(
  dryRun
    ? `\nDry run: ${written} would be added, ${skipped} already present.`
    : `\nAdded ${written} memberships, skipped ${skipped} already present.`
);

console.log(
  `Scheduled revenue across the file: $${total.toLocaleString()}`
);

process.exit(0);
