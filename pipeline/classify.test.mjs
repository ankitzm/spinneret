import { test } from "node:test";
import assert from "node:assert/strict";
import { classify, nextGolden } from "./classify.mjs";

const REQ = ["name", "price"];
const golden = [
  { url: "/a", name: "Aurora", price: "129" },
  { url: "/b", name: "Pulse", price: "199" },
];

test("OK when rows match golden", () => {
  const { verdict } = classify(golden, golden, REQ);
  assert.equal(verdict, "OK");
});

test("BROKEN on zero rows", () => {
  const { verdict, evidence } = classify([], golden, REQ);
  assert.equal(verdict, "BROKEN");
  assert.equal(evidence.reason, "no rows returned");
});

test("BROKEN when a required field is empty", () => {
  const rows = [{ url: "/a", name: "Aurora", price: "" }, { url: "/b", name: "Pulse", price: "199" }];
  const { verdict, evidence } = classify(rows, golden, REQ);
  assert.equal(verdict, "BROKEN");
  assert.deepEqual(evidence.fields, ["price"]);
});

test("BROKEN when a required field is missing entirely", () => {
  const rows = [{ url: "/a", name: "Aurora" }];
  const { verdict } = classify(rows, golden, REQ);
  assert.equal(verdict, "BROKEN");
});

test("CHANGED when values differ but structure intact", () => {
  const rows = [{ url: "/a", name: "Aurora", price: "119" }, { url: "/b", name: "Pulse", price: "199" }];
  const { verdict, evidence } = classify(rows, golden, REQ);
  assert.equal(verdict, "CHANGED");
  assert.equal(evidence.deltas.length, 1);
  assert.equal(evidence.deltas[0].to, "119");
});

test("new rows are not flagged as changes", () => {
  const rows = [...golden, { url: "/c", name: "New", price: "50" }];
  const { verdict } = classify(rows, golden, REQ);
  assert.equal(verdict, "OK");
});

test("golden refreshes on CHANGED, holds on BROKEN", () => {
  const changed = [{ url: "/a", name: "Aurora", price: "119" }];
  assert.equal(nextGolden(changed, "CHANGED", golden), changed);
  assert.equal(nextGolden([], "BROKEN", golden), golden);
});
