"use client";

import { useMemo, useState } from "react";

type Props = {
  name: string;
  className?: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
};

function isoToUsDate(s: string | undefined): string {
  if (!s) return "";
  const t = s.trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (!m) return t;
  return `${m[2]}/${m[3]}/${m[1]}`;
}

function formatDateInput(v: string): string {
  const digits = v.replace(/\D/g, "").slice(0, 8);
  const mm = digits.slice(0, 2);
  const dd = digits.slice(2, 4);
  const yyyy = digits.slice(4, 8);
  if (digits.length <= 2) return mm;
  if (digits.length <= 4) return `${mm}/${dd}`;
  return `${mm}/${dd}/${yyyy}`;
}

/**
 * Mobile-friendly DOB input: keyboard entry with auto slashes (MM/DD/YYYY).
 */
export function DobInput({
  name,
  className,
  required,
  defaultValue,
  placeholder = "MM/DD/YYYY",
}: Props) {
  const initial = useMemo(() => isoToUsDate(defaultValue), [defaultValue]);
  const [value, setValue] = useState(initial);

  return (
    <input
      name={name}
      type="text"
      inputMode="numeric"
      autoComplete="bday"
      placeholder={placeholder}
      className={className}
      required={required}
      value={value}
      maxLength={10}
      onChange={(e) => setValue(formatDateInput(e.target.value))}
    />
  );
}
