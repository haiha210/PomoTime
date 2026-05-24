import { describe, expect, it } from "vitest";

import { isValidIsoDate, normalizeIsoDateInput } from "./dateTime";

describe("isValidIsoDate", () => {
  it("accepts a valid ISO date", () => {
    expect(isValidIsoDate("2026-05-24")).toBe(true);
  });

  it("rejects impossible dates", () => {
    expect(isValidIsoDate("2026-02-30")).toBe(false);
    expect(isValidIsoDate("2026-13-01")).toBe(false);
  });

  it("rejects non-ISO input", () => {
    expect(isValidIsoDate("24/05/2026")).toBe(false);
    expect(isValidIsoDate("2026-5-2")).toBe(false);
  });
});

describe("normalizeIsoDateInput", () => {
  it("keeps only date digits and inserts separators", () => {
    expect(normalizeIsoDateInput("20260524")).toBe("2026-05-24");
    expect(normalizeIsoDateInput("2026/05/24")).toBe("2026-05-24");
  });

  it("limits to YYYY-MM-DD length", () => {
    expect(normalizeIsoDateInput("202605241234")).toBe("2026-05-24");
  });
});