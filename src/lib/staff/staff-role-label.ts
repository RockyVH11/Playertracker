import { StaffRole } from "@prisma/client";

export function displayStaffRole(r: StaffRole): string {
  switch (r) {
    case "DIRECTOR":
      return "Director";
    case "MANAGER":
      return "Manager";
    default:
      return "Coach";
  }
}
