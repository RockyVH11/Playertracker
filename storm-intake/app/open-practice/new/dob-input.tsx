"use client";

import { useState } from "react";
import { formatDobDigits } from "@/lib/dob-format";

export function DobInput() {
  const [value, setValue] = useState("");

  return (
    <input
      name="dob"
      required
      inputMode="numeric"
      autoComplete="bday"
      placeholder="MM/DD/20YY"
      maxLength={10}
      value={value}
      onChange={(e) => {
        setValue(formatDobDigits(e.target.value));
      }}
      className="w-full rounded border border-slate-300 px-2 py-2"
    />
  );
}
