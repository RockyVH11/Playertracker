import { describe, expect, it } from "vitest";
import { formatDobDigits } from "./dob-format";

describe("formatDobDigits", () => {
  it("accepts six digits and inserts slashes with 20xx year", () => {
    expect(formatDobDigits("010610")).toBe("01/06/2010");
  });

  it("formats partial input progressively", () => {
    expect(formatDobDigits("01")).toBe("01");
    expect(formatDobDigits("0106")).toBe("01/06");
  });

  it("ignores non-digit characters", () => {
    expect(formatDobDigits("01-06-10")).toBe("01/06/2010");
  });
});
