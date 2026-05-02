"use server";

/**
 * Legacy entry point re-exports Staff (Coach model) mutations.
 * Canonical routes and redirects target `/staff`.
 */
export {
  createCoachAction,
  deleteCoachAction,
  setCoachActiveAction,
  updateCoachAction,
} from "@/app/actions/staff-directory";
