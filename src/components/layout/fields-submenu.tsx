import Link from "next/link";
import { NavDropdown } from "@/components/layout/nav-dropdown";

export type FieldsSubmenuProps = {
  showEquipment: boolean;
  /** Admin inner nav uses underline like sibling links */
  variant?: "toolbar" | "admin";
};

export function FieldsSubmenu({ showEquipment, variant = "toolbar" }: FieldsSubmenuProps) {
  const summaryClass =
    variant === "admin"
      ? "cursor-pointer list-none text-slate-800 underline-offset-4 hover:underline [&::-webkit-details-marker]:hidden"
      : "cursor-pointer list-none text-slate-800 hover:text-slate-950 [&::-webkit-details-marker]:hidden";
  const panelClass =
    "absolute left-0 top-full z-50 mt-1 min-w-[11rem] rounded-md border border-slate-200 bg-white py-1 shadow-md";

  return (
    <NavDropdown label="Fields" summaryClassName={summaryClass} panelClassName={panelClass}>
        <Link className="block px-3 py-2 text-slate-800 hover:bg-slate-50" href="/fields/complexes">
          Field setup
        </Link>
        <Link className="block px-3 py-2 text-slate-800 hover:bg-slate-50" href="/fields/schedule">
          Schedule
        </Link>
        <Link className="block px-3 py-2 text-slate-800 hover:bg-slate-50" href="/fields/dashboard">
          Field usage
        </Link>
        <Link className="block px-3 py-2 text-slate-800 hover:bg-slate-50" href="/fields/blackouts">
          Blackouts
        </Link>
        {showEquipment ? (
          <Link className="block px-3 py-2 text-slate-800 hover:bg-slate-50" href="/fields/equipment">
            Equipment
          </Link>
        ) : null}
    </NavDropdown>
  );
}
