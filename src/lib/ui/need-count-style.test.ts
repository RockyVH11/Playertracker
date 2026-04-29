import { describe, expect, it } from "vitest";
import { needFieldClass, needGkClass } from "./need-count-style";

describe("needGkClass", () => {
  it("greens at zero", () => expect(needGkClass(0)).toContain("green"));
  it("reds when positive", () => expect(needGkClass(1)).toContain("red"));
});

describe("needFieldClass", () => {
  it("greens at zero", () => expect(needFieldClass(0)).toContain("green"));
  it("yellows for 1-2", () => expect(needFieldClass(2)).toContain("amber"));
  it("reds at 3+", () => expect(needFieldClass(3)).toContain("red"));
});
