import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  deleteDoc,
  where,
} from "firebase/firestore";

const RULES = readFileSync(
  resolve(__dirname, "../../../../../../firestore.rules"),
  "utf8",
);

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-ensemble",
    firestore: { rules: RULES },
  });
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users/alice"), {
      uid: "alice",
      balanceMicros: 5_000_000,
    });
    await setDoc(doc(db, "users/bob"), { uid: "bob", balanceMicros: 1 });
    await setDoc(doc(db, "creditLedger/alice_grant"), {
      uid: "alice",
      type: "grant",
      amountMicros: 5_000_000,
    });
    await setDoc(doc(db, "creditLedger/bob_grant"), {
      uid: "bob",
      type: "grant",
      amountMicros: 1,
    });
    await setDoc(doc(db, "usage/alice_run1"), { uid: "alice", runId: "run1" });
    await setDoc(doc(db, "usage/bob_run1"), { uid: "bob", runId: "run1" });
    await setDoc(doc(db, "stripeEvents/evt_1"), {
      type: "checkout.session.completed",
    });
    await setDoc(doc(db, "proRuns/alice__run1"), {
      uid: "alice",
      runId: "run1",
    });
    await setDoc(doc(db, "rateLimits/alice"), { windowStartMs: 0, count: 1 });
    await setDoc(doc(db, "shares/abcdefghijklmnopqrstuv"), {
      uid: "alice",
      runId: "run-1",
      payload: "{}",
    });
    await setDoc(doc(db, "history/alice__run-1"), {
      uid: "alice",
      id: "run-1",
    });
    await setDoc(doc(db, "presets/alice__p1"), { uid: "alice", id: "p1" });
  });
});

const alice = () => env.authenticatedContext("alice").firestore();
const guest = () => env.unauthenticatedContext().firestore();

describe("users", () => {
  it("lets a user read their own document", async () => {
    await assertSucceeds(getDoc(doc(alice(), "users/alice")));
  });

  it("hides other users and signed-out visitors", async () => {
    await assertFails(getDoc(doc(alice(), "users/bob")));
    await assertFails(getDoc(doc(guest(), "users/alice")));
    await assertFails(getDocs(collection(alice(), "users")));
  });

  it("refuses every client write, including to the user's own balance", async () => {
    await assertFails(
      updateDoc(doc(alice(), "users/alice"), { balanceMicros: 1e12 }),
    );
    await assertFails(setDoc(doc(alice(), "users/new"), { uid: "new" }));
    await assertFails(deleteDoc(doc(alice(), "users/alice")));
  });
});

describe("creditLedger", () => {
  it("lets a user read their own entries, one at a time or by a uid query", async () => {
    await assertSucceeds(getDoc(doc(alice(), "creditLedger/alice_grant")));
    await assertSucceeds(
      getDocs(
        query(collection(alice(), "creditLedger"), where("uid", "==", "alice")),
      ),
    );
  });

  it("hides other users' entries and unfiltered lists", async () => {
    await assertFails(getDoc(doc(alice(), "creditLedger/bob_grant")));
    await assertFails(getDocs(collection(alice(), "creditLedger")));
    await assertFails(getDoc(doc(guest(), "creditLedger/alice_grant")));
  });

  it("refuses client writes, so entries stay append-only by the server", async () => {
    await assertFails(
      setDoc(doc(alice(), "creditLedger/forged"), {
        uid: "alice",
        type: "grant",
        amountMicros: 1e9,
      }),
    );
    await assertFails(
      updateDoc(doc(alice(), "creditLedger/alice_grant"), {
        amountMicros: 1e9,
      }),
    );
    await assertFails(deleteDoc(doc(alice(), "creditLedger/alice_grant")));
  });
});

describe("usage", () => {
  it("lets a user read their own usage only", async () => {
    await assertSucceeds(getDoc(doc(alice(), "usage/alice_run1")));
    await assertSucceeds(
      getDocs(query(collection(alice(), "usage"), where("uid", "==", "alice"))),
    );
    await assertFails(getDoc(doc(alice(), "usage/bob_run1")));
    await assertFails(
      setDoc(doc(alice(), "usage/alice_run2"), { uid: "alice" }),
    );
  });
});

describe("other collections", () => {
  it("are closed to clients", async () => {
    await assertFails(getDoc(doc(alice(), "stripeEvents/evt_1")));
    await assertFails(setDoc(doc(alice(), "anything/else"), { a: 1 }));
  });

  it("keep Pro run records and rate limits server only, even for their owner", async () => {
    await assertFails(getDoc(doc(alice(), "proRuns/alice__run1")));
    await assertFails(
      setDoc(doc(alice(), "proRuns/alice__run2"), { uid: "alice" }),
    );
    await assertFails(getDoc(doc(alice(), "rateLimits/alice")));
    await assertFails(setDoc(doc(alice(), "rateLimits/alice"), { count: 0 }));
  });
});

describe("shares, synced history and presets", () => {
  it("are read through the server only, by visitors and owners alike", async () => {
    await assertFails(getDoc(doc(guest(), "shares/abcdefghijklmnopqrstuv")));
    await assertFails(getDoc(doc(alice(), "shares/abcdefghijklmnopqrstuv")));
    await assertFails(
      getDocs(
        query(collection(alice(), "shares"), where("uid", "==", "alice")),
      ),
    );
    await assertFails(getDoc(doc(alice(), "history/alice__run-1")));
    await assertFails(
      getDocs(
        query(collection(alice(), "history"), where("uid", "==", "alice")),
      ),
    );
    await assertFails(getDoc(doc(alice(), "presets/alice__p1")));
  });

  it("refuse every client write", async () => {
    await assertFails(
      setDoc(doc(alice(), "shares/zzzzzzzzzzzzzzzzzzzzzz"), { uid: "alice" }),
    );
    await assertFails(deleteDoc(doc(alice(), "shares/abcdefghijklmnopqrstuv")));
    await assertFails(
      setDoc(doc(alice(), "history/alice__run-2"), { uid: "alice" }),
    );
    await assertFails(
      setDoc(doc(alice(), "presets/alice__p2"), { uid: "alice" }),
    );
  });
});
