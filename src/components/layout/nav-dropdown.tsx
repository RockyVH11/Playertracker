"use client";

import { useEffect, useRef, type ReactNode } from "react";

type NavDropdownProps = {
  label: string;
  summaryClassName: string;
  panelClassName: string;
  children: ReactNode;
};

export function NavDropdown({
  label,
  summaryClassName,
  panelClassName,
  children,
}: NavDropdownProps) {
  const detailsRef = useRef<HTMLDetailsElement | null>(null);

  useEffect(() => {
    const details = detailsRef.current;
    if (!details) return;

    const handleToggle = () => {
      if (!details.open) return;
      const allDropdowns = document.querySelectorAll<HTMLDetailsElement>(
        'details[data-nav-dropdown="true"]'
      );
      for (const dropdown of allDropdowns) {
        if (dropdown !== details) dropdown.open = false;
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (!details.open) return;
      if (!details.contains(event.target as Node)) details.open = false;
    };

    details.addEventListener("toggle", handleToggle);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      details.removeEventListener("toggle", handleToggle);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  return (
    <details ref={detailsRef} className="relative" data-nav-dropdown="true">
      <summary className={summaryClassName}>
        {label}{" "}
        <span className="text-slate-500" aria-hidden>
          ▾
        </span>
      </summary>
      <div className={panelClassName}>{children}</div>
    </details>
  );
}
