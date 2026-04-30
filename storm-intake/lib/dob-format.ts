export function formatDobDigits(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 6);
  const mm = digits.slice(0, 2);
  const dd = digits.slice(2, 4);
  const yy = digits.slice(4, 6);

  if (digits.length <= 2) return mm;
  if (digits.length <= 4) return `${mm}/${dd}`;
  return `${mm}/${dd}/${yy}`;
}
