import { useMemo } from "react";
import { buildings } from "../../lib/buildings";
import { compareRoomNums } from "../../lib/compareRoomNums";
import { RoomMeeting, TermBuildings } from "../../lib/coursesToClassrooms";
import {
  distanceMeters,
  formatDistance,
  startLocating,
  useUserLocation,
  walkingMinutes,
} from "../../lib/geolocation";
import { TermMoment, useMoment } from "../../lib/moment-context";
import { FavoriteRoom, toggleFavorite, useFavorites } from "../../lib/favorites";
import { useT } from "../../lib/i18n";
import { getRoomActivity, nextMeetingToday } from "../../lib/roomActivity";
import { estimateSeats, fitsSeatFilter } from "../../lib/roomSize";
import { availableAreas } from "../../lib/areas";
import { useRoomFilters } from "../../lib/roomFilters";
import { RoomFilterControls } from "./RoomFilterControls";
import { StarIcon } from "../building/FavoriteButton";
import { CloseIcon } from "../icons/CloseIcon";
import { Link } from "../Link";


/** Gaps shorter than this aren't worth walking to. */
const MIN_FREE_MINUTES = 20;
const MAX_RESULTS = 30;

type FreeRoom = {
  building: string;
  room: string;
  /** Next listed class today, or null if there isn't one. */
  until: RoomMeeting | null;
  freeMinutes: number;
  distance: number | null;
  /** Largest class scheduled in the room, as a rough size. */
  seats: number | null;
};

export function findFreeRooms(
  termBuildings: TermBuildings,
  moment: TermMoment,
  location: [number, number] | null,
  minSeats = 0,
  /** Only rooms in this part of campus (see `AREAS`); empty for anywhere. */
  area = ""
): FreeRoom[] {
  const now = +moment.time;
  const rooms: FreeRoom[] = [];
  for (const [code, termRooms] of Object.entries(termBuildings)) {
    const building = buildings[code];
    if (!building || (area && building.college !== area)) {
      continue;
    }
    const distance = location ? distanceMeters(location, building.location) : null;
    for (const [room, meetings] of Object.entries(termRooms)) {
      if (getRoomActivity(meetings, moment).type !== "inactive") {
        continue;
      }
      const seats = estimateSeats(meetings);
      if (!fitsSeatFilter(seats, minSeats)) {
        continue;
      }
      const until = nextMeetingToday(meetings, moment);
      const freeMinutes = until ? +until.time.start - now : 24 * 60 - now;
      if (freeMinutes >= MIN_FREE_MINUTES) {
        rooms.push({ building: code, room, until, freeMinutes, distance, seats });
      }
    }
  }
  return rooms.sort(
    (a, b) =>
      (a.distance !== null && b.distance !== null ? a.distance - b.distance : 0) ||
      b.freeMinutes - a.freeMinutes ||
      a.building.localeCompare(b.building) ||
      compareRoomNums(a.room, b.room)
  );
}

/** What the schedule says about a saved room at the selected time. */
function SavedRoomStatus({
  meetings,
  moment,
}: {
  meetings: RoomMeeting[] | undefined;
  moment: TermMoment;
}) {
  const t = useT();
  if (!meetings) {
    return <span className="saved-room-status">{t("No classes listed")}</span>;
  }
  const activity = getRoomActivity(meetings, moment);
  if (activity.type === "active") {
    return (
      <span className="saved-room-status saved-room-busy">
        {t("{course} until {time}", {
          course: activity.meeting.course,
          time: activity.meeting.time.end.toString(),
        })}
      </span>
    );
  }
  if (activity.type === "soon") {
    return (
      <span className="saved-room-status saved-room-soon">
        {t("{course} at {time}", {
          course: activity.meeting.course,
          time: activity.meeting.time.start.toString(),
        })}
      </span>
    );
  }
  const until = nextMeetingToday(meetings, moment);
  return (
    <span className="saved-room-status saved-room-free">
      {until
        ? t("Free until {time}", { time: until.time.start.toString() })
        : t("Free rest of day")}
    </span>
  );
}

function SavedRooms({
  favorites,
  termBuildings,
  moment,
  datedMoment,
}: {
  favorites: FavoriteRoom[];
  termBuildings: TermBuildings;
  moment: TermMoment;
  datedMoment: boolean;
}) {
  const t = useT();
  return (
    <section className="saved-rooms" aria-label={t("Saved rooms")}>
      <h3 className="saved-rooms-title">{t("Saved rooms")}</h3>
      <ul className="saved-rooms-list">
        {favorites.map(({ building, room }) => (
          <li key={`${building} ${room}`}>
            <Link view={{ type: "building", building, room }} className="saved-room">
              <span className="free-room-name">
                {building} {room}
              </span>
              {datedMoment && (
                <SavedRoomStatus
                  meetings={termBuildings[building]?.[room]}
                  moment={moment}
                />
              )}
            </Link>
            <button
              type="button"
              className="saved-room-remove"
              onClick={() => toggleFavorite(building, room)}
              aria-label={t("Remove {room} from saved rooms", { room: `${building} ${room}` })}
              title={t("Remove from saved rooms")}
            >
              <StarIcon filled />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export type FreeRoomsPanelProps = {
  termBuildings?: TermBuildings;
  open: boolean;
  onClose: () => void;
};

/** Classrooms with no class listed at the selected time, nearest first. */
export function FreeRoomsPanel({ termBuildings, open, onClose }: FreeRoomsPanelProps) {
  const moment = useMoment();
  const t = useT();
  const userLocation = useUserLocation();
  const location = userLocation.type === "located" ? userLocation.location : null;
  const datedMoment = moment.type !== "term";
  const favorites = useFavorites();
  const filters = useRoomFilters();
  const areas = useMemo(
    () => (termBuildings ? availableAreas(termBuildings) : []),
    [termBuildings]
  );
  // A remembered area without classes this term counts as anywhere
  const area = areas.includes(filters.area) ? filters.area : "";
  const { minSeats } = filters;

  const rooms = useMemo(
    () =>
      open && termBuildings && datedMoment
        ? findFreeRooms(termBuildings, moment, location, minSeats, area).slice(0, MAX_RESULTS)
        : [],
    [open, termBuildings, datedMoment, moment, location, minSeats, area]
  );

  return (
    <aside
      className={`free-rooms ${open ? "" : "free-rooms-hidden"}`}
      aria-label={t("Free rooms")}
      aria-hidden={!open}
      inert={!open}
    >
      <header className="free-rooms-header">
        <div>
          <h2 className="free-rooms-title">{t("Free rooms")}</h2>
          <p className="free-rooms-subtitle">
            {t("No class listed for {minutes}+ min", { minutes: MIN_FREE_MINUTES })} ·{" "}
            {location ? t("nearest first") : t("longest gap first")}
          </p>
        </div>
        <button className="icon-btn free-rooms-close" onClick={onClose} aria-label={t("Close")}>
          <CloseIcon />
        </button>
      </header>
      {favorites.length > 0 && termBuildings && (
        <SavedRooms
          favorites={favorites}
          termBuildings={termBuildings}
          moment={moment}
          datedMoment={datedMoment}
        />
      )}
      {datedMoment && <div className="free-rooms-controls">
        {!location && (
          <button
            className="free-rooms-locate"
            onClick={startLocating}
            disabled={userLocation.type === "locating"}
          >
            <svg viewBox="0 0 24 24" className="icon" aria-hidden="true">
              <path d="M12 2a7 7 0 0 1 7 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 0 1 7-7zm0 4.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z" />
            </svg>
            {userLocation.type === "locating"
              ? t("Finding your location…")
              : userLocation.type === "error"
              ? t("{message} Try again", { message: t(userLocation.message) })
              : t("Show nearest first")}
          </button>
        )}
        <RoomFilterControls areas={areas} />
      </div>}
      {!datedMoment ? (
        <p className="free-rooms-empty">
          {t("Pick a specific date and time to see which rooms are free.")}
        </p>
      ) : rooms.length === 0 ? (
        <p className="free-rooms-empty">
          {area || minSeats > 0
            ? t("No free rooms match these filters right now. Try another area or size.")
            : t("No free rooms found for this time.")}
        </p>
      ) : (
        <ol className="free-rooms-list">
          {rooms.map(({ building, room, until, distance, seats }) => (
            <li key={`${building} ${room}`}>
              <Link
                view={{ type: "building", building, room }}
                className="free-room"
              >
                <span className="free-room-name">
                  {building} {room}
                </span>
                <span className="free-room-building">{buildings[building]?.name}</span>
                <span className="free-room-until">
                  {until
                    ? t("Free until {time}", { time: until.time.start.toString() })
                    : t("Free rest of day")}
                </span>
                {(seats !== null || distance !== null) && (
                  <span className="free-room-distance">
                    {[
                      seats !== null ? t("~{seats} seats", { seats }) : null,
                      distance !== null
                        ? `${formatDistance(distance)} · ${t("{minutes} min", {
                            minutes: walkingMinutes(distance),
                          })}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ol>
      )}
      <p className="free-rooms-disclaimer">
        {t(
          "From class schedules, not live occupancy. Rooms may be locked or booked for other events. Seats are estimated from the largest class held there."
        )}
      </p>
    </aside>
  );
}
