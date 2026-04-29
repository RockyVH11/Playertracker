/** Goalkeeper need: any positive → red; zero/negative → green. */
export function needGkClass(n: number): string {
  return n > 0 ? "text-red-700 font-semibold" : "text-green-700";
}

/** Field player needs (D/M/F/U): 0 or less → green; 1–2 → yellow; 3+ → red. */
export function needFieldClass(n: number): string {
  if (n <= 0) return "text-green-700";
  if (n < 3) return "text-amber-600 font-semibold";
  return "text-red-700 font-semibold";
}
