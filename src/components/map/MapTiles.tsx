import { RefObject, useEffect, useRef } from "react";
import { mapPosition } from "../../lib/locations";

/** Tiles per side; must match GRID in tools/map-tiles.py. */
export const MAP_TILE_GRID = 6;

/** URL of a map tile, served from static/map-tiles/. */
export function mapTileUrl(row: number, col: number): string {
  return `./map-tiles/${row}-${col}.webp`;
}

const TILES = Array.from({ length: MAP_TILE_GRID ** 2 }, (_, i) => ({
  row: Math.floor(i / MAP_TILE_GRID),
  col: i % MAP_TILE_GRID,
}));

/**
 * The full-detail campus map, cut into tiles that load once they come within
 * half a screen of the visible area. A phone's first view needs only a few of
 * the 36; the small preview under them fills in until they arrive.
 */
export function MapTiles({ scroller }: { scroller: RefObject<HTMLElement | null> }) {
  const layer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const images = [...(layer.current?.querySelectorAll("img") ?? [])];
    const load = (image: HTMLImageElement) => {
      image.src = image.dataset.src ?? "";
    };
    const root = scroller.current;
    if (!root || typeof IntersectionObserver === "undefined") {
      images.forEach(load);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            load(entry.target as HTMLImageElement);
            observer.unobserve(entry.target);
          }
        }
      },
      { root, rootMargin: "50%" }
    );
    images.forEach((image) => observer.observe(image));
    return () => observer.disconnect();
  }, [scroller]);

  return (
    <div
      className="map-tiles"
      ref={layer}
      style={{
        left: `calc(${mapPosition.x}px * var(--map-zoom))`,
        top: `calc(${mapPosition.y}px * var(--map-zoom))`,
        width: `calc(${mapPosition.width}px * var(--map-zoom))`,
        height: `calc(${mapPosition.width}px * var(--map-zoom))`,
      }}
    >
      {TILES.map(({ row, col }) => (
        <img
          key={`${row}-${col}`}
          data-src={mapTileUrl(row, col)}
          alt=""
          decoding="async"
          draggable={false}
          onLoad={(event) => event.currentTarget.classList.add("loaded")}
          style={{
            left: `${(col * 100) / MAP_TILE_GRID}%`,
            top: `${(row * 100) / MAP_TILE_GRID}%`,
            width: `${100 / MAP_TILE_GRID}%`,
            height: `${100 / MAP_TILE_GRID}%`,
          }}
        />
      ))}
    </div>
  );
}
