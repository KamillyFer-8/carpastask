import { describe, it, expect } from "vitest";
import { addDays, weekStart, formatDay } from "@/lib/calendar";
describe("civil dates and weekly boundaries", () => {
  it("uses Monday as the first day including Sundays", () => {
    expect(weekStart("2026-11-08")).toBe("2026-11-02");
    expect(weekStart("2026-11-02")).toBe("2026-11-02");
  });
  it("crosses month/year and leap-day boundaries without timezone shifts", () => {
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(weekStart("2027-01-01")).toBe("2026-12-28");
  });
  it("formats the exact scheduled day in Portuguese", () => {
    expect(
      formatDay("2026-11-05", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
    ).toBe("05/11/2026");
  });
});
