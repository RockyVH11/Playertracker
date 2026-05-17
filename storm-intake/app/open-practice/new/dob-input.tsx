"use client";

import { useEffect, useState } from "react";
import { formatDobDigits } from "@/lib/dob-format";

type DobInputProps = {
  /** When set, seeds the field once (e.g. edit existing player). */
  initialMmDdYy?: string;
};

export function DobInput(props: DobInputProps) {
  const { initialMmDdYy } = props;
  const [value, setValue] = useState("");
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (seeded || !initialMmDdYy?.trim()) return;
    setValue(formatDobDigits(initialMmDdYy.replace(/\D/g, "")));
    setSeeded(true);
  }, [initialMmDdYy, seeded]);

  return (
    <input
      name="dob"
      required
      inputMode="numeric"
      autoComplete="bday"
      placeholder="MM/DD/YY"
      maxLength={8}
      value={value}
      onChange={(e) => {
        setValue(formatDobDigits(e.target.value));
      }}
      className="w-full rounded border border-slate-300 px-2 py-2"
    />
  );
}
