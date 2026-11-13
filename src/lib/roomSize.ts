import { RoomMeeting } from "./coursesToClassrooms";

/** Minimum sizes offered by the free room filter; 0 means any size. */
export const SEAT_FILTERS = [0, 30, 60, 100, 200] as const;

/**
 * Estimates how many people a room holds from the largest class scheduled in
 * it. Schedules don't list seat counts, so this is a lower bound: the room
 * fits at least that class. Returns null when no class lists a capacity.
 */
export function estimateSeats(meetings: RoomMeeting[]): number | null {
  let largest = 0;
  for (const meeting of meetings) {
    if (Number.isFinite(meeting.capacity) && meeting.capacity > largest) {
      largest = meeting.capacity;
    }
  }
  return largest > 0 ? largest : null;
}

export function fitsSeatFilter(seats: number | null, minSeats: number): boolean {
  return minSeats <= 0 || (seats !== null && seats >= minSeats);
}
