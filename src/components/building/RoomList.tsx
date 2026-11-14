import { compareRoomNums } from "../../lib/compareRoomNums";
import { RoomMeeting } from "../../lib/coursesToClassrooms";
import { isFavorite, useFavorites } from "../../lib/favorites";
import { Translate, useT } from "../../lib/i18n";
import { ROOM_STATUS_TEXT, RoomStatusKind } from "../../lib/indoor/roomStatus";
import { meetingTypes } from "../../lib/meeting-types";
import { useMoment } from "../../lib/moment-context";
import { getRoomActivity, nextMeetingToday } from "../../lib/roomActivity";
import { Link } from "../Link";
import { StarIcon } from "./FavoriteButton";

/** Room name, with a star when the room is in the user's saved rooms. */
function RoomName({ building, room, saved, t }: {
  building: string;
  room: string;
  saved: boolean;
  t: Translate;
}) {
  return (
    <div className="room-name">
      {building} {room}
      {saved && (
        <span className="room-saved-star" title={t("Saved")}>
          <StarIcon filled />
          <span className="visually-hidden">{t("Saved")}</span>
        </span>
      )}
    </div>
  );
}

function FreeUntil({ meetings }: { meetings: RoomMeeting[] }) {
  const moment = useMoment();
  const t = useT();
  const next = nextMeetingToday(meetings, moment);
  return (
    <>
      {next
        ? t("Free until {time}", { time: next.time.start.toString() })
        : t("Free rest of day")}
    </>
  );
}

/** A group of rooms, e.g. one floor when indoor geometry exists. */
export type RoomListSection = {
  id: string;
  title: string;
  note?: string;
  /** Room keys; keys without meetings show `emptyStatus`. */
  rooms: string[];
  emptyStatus?: RoomStatusKind;
};

export type RoomListProps = {
  building: string;
  rooms: Record<string, RoomMeeting[]>;
  sections?: RoomListSection[];
  /** Room highlighted from elsewhere (e.g. hovering it in the 3D view). */
  highlightedRoom?: string | null;
  onHoverRoom_s?: (room: string | null) => void;
  /** Only list rooms with classes this term but none at the selected time. */
  freeOnly?: boolean;
};
export function RoomList({
  building,
  rooms,
  sections,
  highlightedRoom = null,
  onHoverRoom_s,
  freeOnly = false,
}: RoomListProps) {
  const moment = useMoment();
  const t = useT();
  const favorites = useFavorites();
  const isShown = (room: string) =>
    !freeOnly ||
    (!!rooms[room] && getRoomActivity(rooms[room], moment).type === "inactive");

  if (!sections && Object.keys(rooms).length === 0) {
    return (
      <div className="empty">
        <p>
          {t("No classes are listed for this building this week.")}
        </p>
      </div>
    );
  }

  const renderRoom = (room: string, emptyStatus?: RoomStatusKind) => {
    const meetings = rooms[room] ?? [];
    const hover = onHoverRoom_s
      ? {
          onMouseEnter: () => onHoverRoom_s(room),
          onMouseLeave: () => onHoverRoom_s(null),
          onFocus: () => onHoverRoom_s(room),
          onBlur: () => onHoverRoom_s(null),
        }
      : {};
    const highlighted = room === highlightedRoom ? "room-highlighted" : "";
    if (meetings.length === 0) {
      return (
        <Link
          key={room}
          view={{ type: "building", building, room }}
          className={`room unlisted ${highlighted}`}
          {...hover}
        >
          <RoomName building={building} room={room} t={t}
            saved={isFavorite(favorites, building, room)} />
          <div className="current-meeting">
            {t(ROOM_STATUS_TEXT[emptyStatus ?? "none-listed"])}
          </div>
        </Link>
      );
    }
    const activity = getRoomActivity(meetings, moment);
    const activeMeeting = activity.type !== "inactive" ? activity.meeting : null;
    const soon = activity.type === "soon";
    return (
      <Link
        key={room}
        view={{ type: "building", building, room }}
        className={`room ${
          activeMeeting ? (soon ? "soon" : "active") : "inactive"
        } ${highlighted}`}
        {...hover}
      >
        <RoomName building={building} room={room} t={t}
          saved={isFavorite(favorites, building, room)} />
        {moment.type !== "term" ? (
          <div className="current-meeting">
            {activeMeeting ? (
              <>
                {activeMeeting.course}{" "}
                {soon ? (
                  t("soon")
                ) : (
                  <>
                    (
                    <abbr
                      title={t(
                        activeMeeting.capacity === 1
                          ? "{type} with up to {count} student"
                          : "{type} with up to {count} students",
                        {
                          type: t(`${meetingTypes[activeMeeting.type]}`),
                          count: activeMeeting.capacity,
                        }
                      )}
                    >
                      {activeMeeting.type}
                    </abbr>
                    )
                  </>
                )}
              </>
            ) : (
              <FreeUntil meetings={meetings} />
            )}
          </div>
        ) : null}
      </Link>
    );
  };

  const noneFree = (
    <div className="empty">
      <p>{t("Every classroom here has a class now or soon.")}</p>
    </div>
  );

  if (sections) {
    const shown = sections
      .map((section) => ({ ...section, rooms: section.rooms.filter(isShown) }))
      .filter((section) => section.rooms.length > 0);
    if (shown.length === 0) {
      return noneFree;
    }
    return (
      <div className="room-list">
        {shown.map((section) => (
          <section className="room-section" key={section.id}>
            <h3 className="room-section-title">{section.title}</h3>
            {section.note && !freeOnly && (
              <p className="room-section-note">{section.note}</p>
            )}
            <div className="rooms">
              {[...section.rooms]
                .sort(compareRoomNums)
                .map((room) => renderRoom(room, section.emptyStatus))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  const shown = Object.keys(rooms).filter(isShown);
  if (shown.length === 0) {
    return noneFree;
  }
  return (
    <div className="room-list">
      <div className="rooms">
        {shown
          // Can't pre-sort the rooms object entries because JS sorts numerical
          // properties differently
          .sort(compareRoomNums)
          .map((room) => renderRoom(room))}
      </div>
    </div>
  );
}
