import { AREAS } from "../../lib/areas";
import { useT } from "../../lib/i18n";
import { setRoomFilters, useRoomFilters } from "../../lib/roomFilters";
import { SEAT_FILTERS } from "../../lib/roomSize";

/** Area and size menus; the choice applies everywhere rooms are listed. */
export function RoomFilterControls({ areas }: { areas: readonly string[] }) {
  const t = useT();
  const filters = useRoomFilters();
  const area = areas.includes(filters.area) ? filters.area : "";
  return (
    <>
      <label className="free-rooms-seats" title={t("Only show rooms in one part of campus")}>
        <span>{t("Area")}</span>
        <select value={area} onChange={(event) => setRoomFilters({ area: event.target.value })}>
          <option value="">{t("Anywhere")}</option>
          {AREAS.filter(({ id }) => areas.includes(id)).map(({ id, label }) => (
            <option key={id} value={id}>
              {t(label)}
            </option>
          ))}
        </select>
      </label>
      <label
        className="free-rooms-seats"
        title={t("Rooms whose largest scheduled class is at least this size")}
      >
        <span>{t("Seats")}</span>
        <select
          value={filters.minSeats}
          onChange={(event) => setRoomFilters({ minSeats: Number(event.target.value) })}
        >
          {SEAT_FILTERS.map((seats) => (
            <option key={seats} value={seats}>
              {seats === 0 ? t("Any size") : `${seats}+`}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
