import { buildings } from "./buildings";
import { TermBuildings } from "./coursesToClassrooms";

/**
 * Parts of campus for filtering, in the order students usually think of them
 * (the colleges by founding, then the shared areas). IDs match the groups in
 * buildings.json; labels are English UI strings for `t()`.
 */
export const AREAS: readonly { id: string; label: string }[] = [
  { id: "revelle", label: "Revelle" },
  { id: "muir", label: "Muir" },
  { id: "marshall", label: "Marshall" },
  { id: "warren", label: "Warren" },
  { id: "erc", label: "ERC" },
  { id: "sixth", label: "Sixth" },
  { id: "seventh", label: "Seventh" },
  { id: "eighth", label: "Eighth" },
  { id: "universityCenter", label: "University Center" },
  { id: "pepperCanyon", label: "Pepper Canyon" },
  { id: "med", label: "School of Medicine" },
  { id: "sio", label: "Scripps (SIO)" },
];

/** The area a building belongs to, or null for unknown buildings. */
export function areaOf(building: string): string | null {
  return buildings[building]?.college ?? null;
}

/** Areas that have at least one classroom with classes this term, in order. */
export function availableAreas(termBuildings: TermBuildings): string[] {
  const present = new Set(
    Object.entries(termBuildings)
      .filter(([, rooms]) => Object.keys(rooms).length > 0)
      .map(([code]) => areaOf(code))
  );
  return AREAS.map((area) => area.id).filter((id) => present.has(id));
}
