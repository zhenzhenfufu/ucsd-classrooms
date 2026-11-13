import { useSyncExternalStore } from "react";

const KEY = "ucsd-classrooms:favorite-rooms";
const MAX_FAVORITES = 50;

export type FavoriteRoom = { building: string; room: string };

/** Reads a stored list, dropping anything malformed or repeated. */
export function parseFavorites(raw: string | null): FavoriteRoom[] {
  let value: unknown;
  try {
    value = JSON.parse(raw ?? "[]");
  } catch {
    return [];
  }
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set<string>();
  const favorites: FavoriteRoom[] = [];
  for (const item of value) {
    if (
      typeof item !== "object" ||
      item === null ||
      typeof item.building !== "string" ||
      typeof item.room !== "string" ||
      !item.building ||
      !item.room
    ) {
      continue;
    }
    const id = `${item.building} ${item.room}`;
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    favorites.push({ building: item.building, room: item.room });
    if (favorites.length >= MAX_FAVORITES) {
      break;
    }
  }
  return favorites;
}

export function isFavorite(
  favorites: FavoriteRoom[],
  building: string,
  room: string
): boolean {
  return favorites.some(
    (favorite) => favorite.building === building && favorite.room === room
  );
}

/** Adds the room to the front of the list, or removes it if already saved. */
export function toggledFavorites(
  favorites: FavoriteRoom[],
  building: string,
  room: string
): FavoriteRoom[] {
  return isFavorite(favorites, building, room)
    ? favorites.filter(
        (favorite) => favorite.building !== building || favorite.room !== room
      )
    : [{ building, room }, ...favorites].slice(0, MAX_FAVORITES);
}

const EMPTY: FavoriteRoom[] = [];
let cache: FavoriteRoom[] | null = null;
const listeners = new Set<() => void>();

function read(): FavoriteRoom[] {
  if (cache === null) {
    try {
      cache = parseFavorites(window.localStorage.getItem(KEY));
    } catch {
      cache = [];
    }
  }
  return cache;
}

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Keep other tabs in sync
  const handleStorage = (event: StorageEvent) => {
    if (event.key === KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", handleStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

export function toggleFavorite(building: string, room: string): void {
  cache = toggledFavorites(read(), building, room);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // Storage may be unavailable (private mode); the list lasts this session
  }
  notify();
}

/** Rooms saved in this browser, most recently saved first. */
export function useFavorites(): FavoriteRoom[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
