import { isFavorite, toggleFavorite, useFavorites } from "../../lib/favorites";
import { useT } from "../../lib/i18n";

export function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="icon" aria-hidden="true">
      <path
        d={
          filled
            ? "M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
            : "M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z"
        }
      />
    </svg>
  );
}

/** Saves a classroom to the "Saved rooms" list in this browser. */
export function FavoriteButton({ building, room }: { building: string; room: string }) {
  const favorites = useFavorites();
  const t = useT();
  const saved = isFavorite(favorites, building, room);
  return (
    <button
      type="button"
      className={`favorite-button ${saved ? "favorite-button-on" : ""}`}
      aria-pressed={saved}
      onClick={() => toggleFavorite(building, room)}
      title={saved ? t("Remove from saved rooms") : t("Save to the top of Free rooms")}
    >
      <StarIcon filled={saved} />
      {saved ? t("Saved") : t("Save room")}
    </button>
  );
}
