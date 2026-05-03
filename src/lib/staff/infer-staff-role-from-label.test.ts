import { StaffRole } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { inferStaffRoleFromLabel } from "./infer-staff-role-from-label";

describe("inferStaffRoleFromLabel", () => {
  it("maps director-like labels", () => {
    expect(inferStaffRoleFromLabel(" Director ")).toBe(StaffRole.DIRECTOR);
    expect(inferStaffRoleFromLabel("club director")).toBe(StaffRole.DIRECTOR);
  });

  it("maps manager-like labels", () => {
    expect(inferStaffRoleFromLabel("Manager")).toBe(StaffRole.MANAGER);
  });

  it("defaults to coach", () => {
    expect(inferStaffRoleFromLabel("")).toBe(StaffRole.COACH);
    expect(inferStaffRoleFromLabel(" Head coach ")).toBe(StaffRole.COACH);
  });
});
