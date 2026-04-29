import { Gender } from "@prisma/client";

/**
 * Canonical league list / display order (`hierarchy` asc; tie-break by name).
 * Prefer setting `allowedGender` for boys-only vs girls-only pathways; otherwise omit.
 */
export const ORDERED_LEAGUES: Array<{
  name: string;
  hierarchy: number;
  allowedGender?: Gender | null;
}> = [
  { name: "ECNL-RL-NTX", hierarchy: 10 },
  { name: "ECNL-RL-Frontier", hierarchy: 20 },
  { name: "Pre-ECNL Frontier", hierarchy: 30 },
  { name: "Pre-ECNL NTx", hierarchy: 40 },
  { name: "N1 NTx D1", hierarchy: 50 },
  { name: "N1 NTx D2", hierarchy: 60 },
  { name: "N1 Frontier D1", hierarchy: 70 },
  { name: "N1 Frontier D2", hierarchy: 80 },
  /** Alphabetically after tier block */
  { name: "API", hierarchy: 110 },
  { name: "Boys Classic", hierarchy: 120, allowedGender: Gender.BOYS },
  { name: "Girls Classic", hierarchy: 130, allowedGender: Gender.GIRLS },
  { name: "LHGCL", hierarchy: 140 },
  { name: "Other", hierarchy: 150 },
  { name: "PPIL", hierarchy: 160 },
  { name: "SCDL", hierarchy: 170 },
  { name: "SPOT", hierarchy: 180 },
  { name: "SuperCopa", hierarchy: 190 },
  { name: "USL Y", hierarchy: 200 },
];

/** If these legacy rows exist, rename once so FKs stay on the same `id`. */
export const LEAGUE_RENAMES_FROM_TO: ReadonlyArray<readonly [string, string]> = [
  ["ECNL RL NTx", "ECNL-RL-NTX"],
  ["ECNL RL Frontier", "ECNL-RL-Frontier"],
  ["PreECNL Frontier", "Pre-ECNL Frontier"],
  ["PreECNL NTx", "Pre-ECNL NTx"],
];
