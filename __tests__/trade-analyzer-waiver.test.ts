import { waiverAdjustment } from "@/app/tools/trade-analyzer/helpers";

describe("waiverAdjustment", () => {
  it("returns 0 when sides have equal asset counts", () => {
    expect(waiverAdjustment([5000], [6000], true)).toBe(0);
    expect(waiverAdjustment([5000, 100], [6000, 200], true)).toBe(0);
  });

  it("returns 0 when the smaller side is empty", () => {
    expect(waiverAdjustment([], [6000, 200], true)).toBe(0);
  });

  it("returns 0 when the 'smaller' side is actually larger", () => {
    expect(waiverAdjustment([5000, 100, 50], [6000], true)).toBe(0);
  });

  it("credits the smaller side from the larger side's cheapest assets (dynasty)", () => {
    // k = 1, cheapest of larger side is 500 → min(500 * 0.6982, 753) = 349
    expect(waiverAdjustment([8000], [4000, 500], true)).toBe(349);
  });

  it("caps the credit per asset (dynasty)", () => {
    // cheapest is 5000 → 5000 * 0.6982 = 3491, capped at 753
    expect(waiverAdjustment([9000], [8000, 5000], true)).toBe(753);
  });

  it("uses redraft parameters when not dynasty", () => {
    // k = 1, cheapest is 500 → min(500 * 0.4, 1150) = 200
    expect(waiverAdjustment([8000], [4000, 500], false)).toBe(200);
  });

  it("sums credits for multiple extra assets with a stepped cap", () => {
    // k = 2, two cheapest are 2000 and 3000 (dynasty):
    // min(2000 * 0.6982, 753) = 753, then min(3000 * 0.6982, 753 + 0.23) = 753
    expect(waiverAdjustment([9000], [8000, 3000, 2000], true)).toBe(753 + 753);
  });
});
