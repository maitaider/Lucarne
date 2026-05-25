import { describe, expect, it } from "vitest";
import {
  effectiveBuyInDeadline,
  type AppSettings,
} from "@/lib/admin/economy";

function makeSettings(overrides: Partial<AppSettings> = {}): AppSettings {
  return {
    token_price_cents: 100,
    buy_in_amount_cents: 2000,
    buy_in_deadline: null,
    tournament_start_at: "2026-06-11T20:00:00Z",
    tournament_end_at: "2026-07-19T21:00:00Z",
    prize_distribution: {
      shares: [50, 30, 20],
      house_rake_pct: 0,
      description_fr: "",
      description_en: "",
    },
    scoring_rules: {},
    contact_label: null,
    contact_info: null,
    currency: "CAD",
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("effectiveBuyInDeadline", () => {
  it("falls back to tournament_start - 1h when buy_in_deadline is null", () => {
    const d = effectiveBuyInDeadline(makeSettings());
    expect(d.toISOString()).toBe("2026-06-11T19:00:00.000Z");
  });

  it("honours an explicit buy_in_deadline when present", () => {
    const d = effectiveBuyInDeadline(
      makeSettings({ buy_in_deadline: "2026-06-01T00:00:00Z" }),
    );
    expect(d.toISOString()).toBe("2026-06-01T00:00:00.000Z");
  });

  it("is consistently a Date object", () => {
    const d = effectiveBuyInDeadline(makeSettings());
    expect(d).toBeInstanceOf(Date);
  });
});
