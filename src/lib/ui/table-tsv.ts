/** Collapse whitespace for clipboard-friendly spreadsheet cells */
export function normalizeCellText(raw: string): string {
  return raw.replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
}

export function tabDelimitedFromRows(rows: readonly (readonly string[])[]): string {
  const lines = rows.filter((cells) => cells.length > 0).map((cells) => cells.join("\t"));
  return lines.join("\n");
}
