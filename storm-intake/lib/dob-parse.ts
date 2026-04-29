export function utcDate(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

/** Parses DOB entered as MM/DD/YYYY, MMDDYY (20xx), or MM/DD/YY (20xx). */
export function parseDobToUtcDate(input: string): Date {
  const t = input.trim();
  const sixDigit = /^(\d{2})(\d{2})(\d{2})$/.exec(t);
  if (sixDigit) {
    const y = Number(`20${sixDigit[3]}`);
    const month = Number(sixDigit[1]);
    const day = Number(sixDigit[2]);
    const d = utcDate(y, month, day);
    if (d.getUTCFullYear() !== y || d.getUTCMonth() + 1 !== month || d.getUTCDate() !== day) throw new Error("Invalid DOB");
    return d;
  }

  const shortUs = /^(\d{2})\/(\d{2})\/(\d{2})$/.exec(t);
  if (shortUs) {
    const y = Number(`20${shortUs[3]}`);
    const month = Number(shortUs[1]);
    const day = Number(shortUs[2]);
    const d = utcDate(y, month, day);
    if (d.getUTCFullYear() !== y || d.getUTCMonth() + 1 !== month || d.getUTCDate() !== day) throw new Error("Invalid DOB");
    return d;
  }

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (iso) {
    const d = utcDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
    if (d.getUTCFullYear() !== Number(iso[1]) || d.getUTCMonth() + 1 !== Number(iso[2]) || d.getUTCDate() !== Number(iso[3])) throw new Error("Invalid DOB");
    return d;
  }

  const us = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(t);
  if (us) {
    const d = utcDate(Number(us[3]), Number(us[1]), Number(us[2]));
    if (d.getUTCFullYear() !== Number(us[3]) || d.getUTCMonth() + 1 !== Number(us[1]) || d.getUTCDate() !== Number(us[2])) throw new Error("Invalid DOB");
    return d;
  }

  throw new Error("Invalid DOB format");
}
