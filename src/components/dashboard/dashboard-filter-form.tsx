"use client";

import type { FormHTMLAttributes, ReactNode } from "react";

/** GET filter form: changing any &lt;select&gt; submits (updates URL/query). Use the button after editing the season text field. */
export function DashboardFilterForm({
  children,
  className,
  ...rest
}: FormHTMLAttributes<HTMLFormElement> & { children: ReactNode }) {
  return (
    <form
      method="get"
      className={className}
      onChange={(e) => {
        if (e.target instanceof HTMLSelectElement) {
          e.currentTarget.requestSubmit();
        }
      }}
      {...rest}
    >
      {children}
    </form>
  );
}
