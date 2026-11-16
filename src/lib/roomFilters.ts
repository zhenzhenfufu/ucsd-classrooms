import { useSyncExternalStore } from "react";
import { areaOf } from "./areas";
import { fitsSeatFilter, SEAT_FILTERS } from "./roomSize";

/** Area and size filters shared by Free rooms and Plan this week. */
export type RoomFilters = {
  /** An `AREAS` id, or "" for anywhere. */
  area: string;
  /** Minimum estimated seats; 0 for any size. */
  minSeats: number;
};

const AREA_KEY = "ucsd-classrooms:free-room-area";
const SEATS_KEY = "ucsd-classrooms:free-room-seats";
const DEFAULT: RoomFilters = { area: "", minSeats: 0 };

let cache: RoomFilters | null = null;
const listeners = new Set<() => void>();

function read(): RoomFilters {
  if (cache === null) {
    try {
      const seats = Number(window.localStorage.getItem(SEATS_KEY));
      cache = {
        area: window.localStorage.getItem(AREA_KEY) ?? "",
        minSeats: (SEAT_FILTERS as readonly number[]).includes(seats) ? seats : 0,
      };
    } catch {
      cache = DEFAULT;
    }
  }
  return cache;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setRoomFilters(patch: Partial<RoomFilters>): void {
  cache = { ...read(), ...patch };
  try {
    window.localStorage.setItem(AREA_KEY, cache.area);
    window.localStorage.setItem(SEATS_KEY, String(cache.minSeats));
  } catch {
    // Storage may be unavailable (private mode); filters last this session
  }
  for (const listener of listeners) {
    listener();
  }
}

/** The filters as last chosen in this browser. */
export function useRoomFilters(): RoomFilters {
  return useSyncExternalStore(subscribe, read, () => DEFAULT);
}

/**
 * Whether a room passes the filters. `areas` lists the areas on offer; a
 * remembered area that isn't among them counts as anywhere.
 */
export function matchesRoomFilters(
  filters: RoomFilters,
  areas: readonly string[],
  building: string,
  seats: number | null
): boolean {
  const area = areas.includes(filters.area) ? filters.area : "";
  return (!area || areaOf(building) === area) && fitsSeatFilter(seats, filters.minSeats);
}
