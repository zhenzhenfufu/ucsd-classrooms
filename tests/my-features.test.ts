import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { RoomMeeting } from "../src/lib/coursesToClassrooms";
import { Day } from "../src/lib/Day";
import { isFavorite, parseFavorites, toggledFavorites } from "../src/lib/favorites";
import { buildIcs, escapeText, foldLine } from "../src/lib/ics";
import { imageSrcSet, resizedImage } from "../src/lib/imgur";
import { estimateSeats, fitsSeatFilter } from "../src/lib/roomSize";
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
