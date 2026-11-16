import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { RoomMeeting } from "../src/lib/coursesToClassrooms";
import { courseEvents, sectionChoices } from "../src/lib/courseCalendar";
import { Day } from "../src/lib/Day";
import { areaOf, AREAS, availableAreas } from "../src/lib/areas";
import { buildings } from "../src/lib/buildings";
import { getHolidays } from "../src/lib/holidays";
import { isFavorite, parseFavorites, toggledFavorites } from "../src/lib/favorites";
import { buildIcs, escapeText, foldLine } from "../src/lib/ics";
import { imageSrcSet, resizedImage } from "../src/lib/imgur";
import { estimateSeats, fitsSeatFilter } from "../src/lib/roomSize";
import { getTermDays } from "../src/lib/terms";
import { Time } from "../src/lib/Time";

describe("saved rooms", () => {
  it("ignores malformed storage and duplicates", () => {
    assert.deepEqual(parseFavorites(null), []);
    assert.deepEqual(parseFavorites("not json"), []);
    assert.deepEqual(parseFavorites('{"building":"CENTR"}'), []);
    assert.deepEqual(
      parseFavorites(
        JSON.stringify([
          { building: "CENTR", room: "115" },
          { building: "CENTR", room: "115" },
          { building: "", room: "1" },
          { building: "WLH", room: 2005 },
          null,
          { building: "WLH", room: "2005" },
        ])
      ),
      [
        { building: "CENTR", room: "115" },
        { building: "WLH", room: "2005" },
      ]
    );
  });

  it("adds new rooms first and removes saved ones", () => {
    const one = toggledFavorites([], "CENTR", "115");
    const two = toggledFavorites(one, "WLH", "2005");
    assert.deepEqual(two, [
      { building: "WLH", room: "2005" },
      { building: "CENTR", room: "115" },
    ]);
    assert.equal(isFavorite(two, "CENTR", "115"), true);
    const removed = toggledFavorites(two, "CENTR", "115");
    assert.deepEqual(removed, [{ building: "WLH", room: "2005" }]);
    assert.equal(isFavorite(removed, "CENTR", "115"), false);
  });
});

describe("room size estimate", () => {
  const meeting = (capacity: number) => ({ capacity }) as RoomMeeting;

  it("uses the largest finite class capacity", () => {
    assert.equal(estimateSeats([meeting(30), meeting(120), meeting(Infinity)]), 120);
    assert.equal(estimateSeats([meeting(0)]), null);
    assert.equal(estimateSeats([]), null);
  });

  it("only filters out unknown sizes when a minimum is chosen", () => {
    assert.equal(fitsSeatFilter(null, 0), true);
    assert.equal(fitsSeatFilter(null, 30), false);
    assert.equal(fitsSeatFilter(29, 30), false);
    assert.equal(fitsSeatFilter(30, 30), true);
  });
});

describe("calendar export", () => {
  const event = {
    uid: "CENTR-115@test",
    title: "Study · CENTR 115",
    location: "CENTR 115, Center Hall, UC San Diego",
    date: Day.from(2026, 11, 13),
    start: new Time(14, 0),
    end: new Time(15, 30),
  };

  it("writes Pacific local times with CRLF line endings", () => {
    const ics = buildIcs([event], new Date(Date.UTC(2026, 10, 13, 20, 5, 9)));
    assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\n"));
    assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
    assert.ok(ics.includes("DTSTART;TZID=America/Los_Angeles:20261113T140000\r\n"));
    assert.ok(ics.includes("DTEND;TZID=America/Los_Angeles:20261113T153000\r\n"));
    assert.ok(ics.includes("DTSTAMP:20261113T200509Z\r\n"));
    assert.ok(ics.includes("LOCATION:CENTR 115\\, Center Hall\\, UC San Diego\r\n"));
    assert.ok(!/[^\r]\n/.test(ics));
  });

  it("writes midnight as the start of the next day", () => {
    const ics = buildIcs([{ ...event, end: Time.from(1440) }]);
    assert.ok(ics.includes("DTEND;TZID=America/Los_Angeles:20261114T000000\r\n"));
  });

  it("escapes text and folds long lines by bytes", () => {
    assert.equal(escapeText("a,b;c\\d\ne"), "a\\,b\\;c\\\\d\\ne");
    const folded = foldLine("SUMMARY:" + "自习".repeat(40));
    const encoder = new TextEncoder();
    for (const line of folded.split("\r\n")) {
      assert.ok(encoder.encode(line).length <= 75);
    }
    assert.equal(folded.split("\r\n ").join(""), "SUMMARY:" + "自习".repeat(40));
  });
});

describe("Imgur photo sizes", () => {
  it("asks Imgur for a resized copy", () => {
    assert.equal(
      resizedImage("https://i.imgur.com/2DncCdV.jpeg", "l"),
      "https://i.imgur.com/2DncCdVl.jpeg"
    );
    assert.equal(
      imageSrcSet("https://i.imgur.com/2DncCdV.jpeg", ["m", "l"]),
      "https://i.imgur.com/2DncCdVm.jpeg 320w, https://i.imgur.com/2DncCdVl.jpeg 640w"
    );
  });

  it("leaves other photos unchanged", () => {
    assert.equal(resizedImage("https://example.com/a.jpg", "l"), "https://example.com/a.jpg");
    assert.equal(imageSrcSet("https://example.com/a.jpg", ["l"]), undefined);
  });
});

describe("course calendar export", () => {
  const time = (days: number[], start: number, end: number) => ({
    days,
    start: Time.from(start),
    end: Time.from(end),
  });
  const lecture = {
    kind: "meeting" as const,
    code: "A00",
    type: "LE",
    time: time([1, 3, 5], 10 * 60, 10 * 60 + 50),
    location: { building: "CENTR", room: "115" },
  };
  const section = (code: string, day: number) => ({
    kind: "section" as const,
    code,
    type: "DI",
    capacity: 30,
    time: time([day], 16 * 60, 16 * 60 + 50),
    location: { building: "WLH", room: "2005" },
  });
  const final = {
    kind: "exam" as const,
    type: "FI",
    date: Day.from(2026, 12, 9),
    time: time([3], 11 * 60 + 30, 14 * 60 + 29),
    location: { building: "CENTR", room: "115" },
  };
  const group = {
    code: "A00",
    sectionTitle: null,
    sections: [section("A01", 2), section("A02", 4)],
    meetings: [lecture],
    exams: [final],
    instructors: [{ first: "Ada", last: "Lovelace" }],
    coscheduled: [],
  };
  const course = { code: "CSE 100", title: "Advanced Data Structures", groups: [group] };
  const options = {
    termDays: getTermDays(2026, "FA"),
    season: "FA" as const,
    typeName: (type: string) => type,
    remote: "Remote",
    tba: "TBA",
  };

  it("includes the lecture, only the chosen section, and the final", () => {
    const events = courseEvents(course, group, group.sections[0], options);
    assert.ok(events.some((event) => event.title === "CSE 100 DI (A01)"));
    assert.ok(!events.some((event) => event.title.includes("A02")));
    const finals = events.filter((event) => event.title === "CSE 100 FI");
    assert.equal(finals.length, 1);
    assert.equal(finals[0].date.toString(), "2026-12-09");
    assert.equal(events[0].description, "Advanced Data Structures · Ada Lovelace");
  });

  it("skips holidays and stops before finals week", () => {
    const events = courseEvents(course, group, group.sections[0], options);
    const lectures = events.filter((event) => event.title === "CSE 100 LE");
    const dates = new Set(lectures.map((event) => event.date.toString()));
    // Veterans Day (Wednesday) and the day after Thanksgiving (Friday)
    assert.ok(!dates.has("2026-11-11"));
    assert.ok(!dates.has("2026-11-27"));
    assert.ok(dates.has("2026-11-13"));
    const finalsStart = options.termDays.finals;
    assert.ok(lectures.every((event) => event.date < finalsStart));
    assert.ok(lectures.every((event) => event.date >= options.termDays.start));
  });

  it("always includes a lecture listed as the group's own section", () => {
    const lectureSection = { ...section("A00", 1), type: "LE", time: time([1, 3, 5], 9 * 60, 9 * 60 + 50) };
    const withLecture = { ...group, meetings: [], sections: [lectureSection, section("A01", 1), section("A02", 4)] };
    assert.deepEqual(sectionChoices(withLecture).map((s) => s.code), ["A01", "A02"]);
    const titles = new Set(courseEvents(course, withLecture, withLecture.sections[1], options).map((e) => e.title));
    assert.ok(titles.has("CSE 100 LE"));
    assert.ok(titles.has("CSE 100 DI (A01)"));
    assert.ok(!titles.has("CSE 100 DI (A02)"));
  });

  it("gives every event a unique id", () => {
    const events = courseEvents(course, group, null, options);
    assert.equal(new Set(events.map((event) => event.uid)).size, events.length);
  });
});

describe("holidays", () => {
  it("puts Veterans Day on November 11, not September 11", () => {
    const holidays = getHolidays(2026);
    assert.equal(holidays[Day.from(2026, 11, 11).id], "Veterans Day");
    assert.equal(holidays[Day.from(2026, 9, 11).id], undefined);
  });
});

describe("campus areas", () => {
  it("knows which area a building is in", () => {
    assert.equal(areaOf("CENTR"), "universityCenter");
    assert.equal(areaOf("APM"), "muir");
    assert.equal(areaOf("NOPE"), null);
  });

  it("lists only areas with classes, in campus order", () => {
    const rooms = { "101": [] as never[] };
    assert.deepEqual(availableAreas({ CENTR: rooms, APM: rooms, WLH: {} }), ["muir", "universityCenter"]);
  });

  it("covers every group of buildings with classrooms except the library", () => {
    const groups = new Set(Object.values(buildings).map((b) => b.college));
    groups.delete("library");
    assert.deepEqual([...groups].sort(), AREAS.map((a) => a.id).sort());
  });
});

describe("shared room filters", () => {
  it("matches by area and estimated size", async () => {
    const { matchesRoomFilters } = await import("../src/lib/roomFilters");
    const areas = ["muir", "universityCenter"];
    assert.equal(matchesRoomFilters({ area: "", minSeats: 0 }, areas, "APM", null), true);
    assert.equal(matchesRoomFilters({ area: "muir", minSeats: 0 }, areas, "APM", 40), true);
    assert.equal(matchesRoomFilters({ area: "muir", minSeats: 0 }, areas, "CENTR", 196), false);
    assert.equal(matchesRoomFilters({ area: "", minSeats: 100 }, areas, "APM", 40), false);
    assert.equal(matchesRoomFilters({ area: "", minSeats: 100 }, areas, "CENTR", null), false);
  });

  it("treats a remembered area that isn't offered as anywhere", async () => {
    const { matchesRoomFilters } = await import("../src/lib/roomFilters");
    assert.equal(matchesRoomFilters({ area: "sio", minSeats: 0 }, ["muir"], "APM", null), true);
  });
});

describe("campus map tiles", () => {
  it("has a tile for every grid cell, cut with the same grid", async () => {
    const { existsSync, readFileSync } = await import("node:fs");
    const { MAP_TILE_GRID, mapTileUrl } = await import("../src/components/map/MapTiles");
    const script = readFileSync("tools/map-tiles.py", "utf8");
    assert.equal(Number(script.match(/^GRID = (\d+)$/m)?.[1]), MAP_TILE_GRID);
    for (let row = 0; row < MAP_TILE_GRID; row++) {
      for (let col = 0; col < MAP_TILE_GRID; col++) {
        const file = mapTileUrl(row, col).replace(/^\.\//, "static/");
        assert.ok(existsSync(file), `${file} is missing; run python3 tools/map-tiles.py`);
      }
    }
  });
});
