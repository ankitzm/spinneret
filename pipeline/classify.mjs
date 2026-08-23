// The moat: tell a broken scraper apart from a changed world.
//
// BROKEN  -> structure failed: zero rows, or a required field is empty/missing.
//            Fix by healing the scraper.
// CHANGED -> structure intact, values differ from golden. The world moved
//            (price, stock). Not a scraper problem — record it as a signal.
// OK      -> matches golden.

const isEmpty = (v) => v === undefined || v === null || v === "" ||
  (typeof v === "string" && v.trim() === "");

// key rows so we can compare across runs regardless of order
const keyOf = (row) => String(row.url ?? row.id ?? row.name ?? JSON.stringify(row));

export function classify(rows, golden, requiredFields) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { verdict: "BROKEN", evidence: { reason: "no rows returned", fields: requiredFields } };
  }

  // structural check: every required field populated on every row
  const deadFields = new Set();
  for (const row of rows) {
    for (const f of requiredFields) {
      if (isEmpty(row?.[f])) deadFields.add(f);
    }
  }
  if (deadFields.size > 0) {
    return {
      verdict: "BROKEN",
      evidence: { reason: "required fields empty", fields: [...deadFields] },
    };
  }

  // structure intact — compare values against golden
  const goldenByKey = new Map((golden ?? []).map((r) => [keyOf(r), r]));
  const deltas = [];
  for (const row of rows) {
    const g = goldenByKey.get(keyOf(row));
    if (!g) continue; // new row, not a change to flag
    for (const f of requiredFields) {
      if (String(row[f]) !== String(g[f])) {
        deltas.push({ key: keyOf(row), field: f, from: g[f], to: row[f] });
      }
    }
  }

  if (deltas.length > 0) return { verdict: "CHANGED", evidence: { deltas } };
  return { verdict: "OK", evidence: {} };
}

// Golden refreshes only on OK/CHANGED, never on BROKEN. Without this a real
// price change would re-flag CHANGED forever.
export function nextGolden(rows, verdict, prevGolden) {
  return verdict === "BROKEN" ? prevGolden : rows;
}
