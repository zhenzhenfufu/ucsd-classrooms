import { Day } from "./Day";
import { Time } from "./Time";

export type CalendarEvent = {
  /** Stable for the same room and slot, so re-importing updates instead of duplicating. */
  uid: string;
  title: string;
  location: string;
  date: Day;
  start: Time;
  /** May be 24:00 (midnight at the end of the day). */
  end: Time;
  description?: string;
  url?: string;
};

const TZID = "America/Los_Angeles";

// Pacific time rules since 2007, so calendars without a built-in zone database
// still place the event correctly.
const VTIMEZONE = [
  "BEGIN:VTIMEZONE",
  `TZID:${TZID}`,
  "BEGIN:DAYLIGHT",
  "TZOFFSETFROM:-0800",
  "TZOFFSETTO:-0700",
  "TZNAME:PDT",
  "DTSTART:19700308T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU",
  "END:DAYLIGHT",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:-0700",
  "TZOFFSETTO:-0800",
  "TZNAME:PST",
  "DTSTART:19701101T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU",
  "END:STANDARD",
  "END:VTIMEZONE",
];

const pad = (n: number, length = 2) => String(n).padStart(length, "0");

/** Escapes TEXT values (RFC 5545 §3.3.11). */
export function escapeText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Folds lines longer than 75 bytes, without splitting a UTF-8 character. */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    // Continuation lines start with a space, which counts toward the limit
    const limit = parts.length === 0 ? 75 : 74;
    if (bytes + size > limit) {
      parts.push(current);
      current = "";
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

function localDateTime(date: Day, time: Time): string {
  // 24:00 is written as 00:00 the next day
  const day = +time >= 1440 ? date.add(1) : date;
  const minutes = +time % 1440;
  return `${day.year}${pad(day.month)}${pad(day.date)}T${pad(
    Math.floor(minutes / 60)
  )}${pad(minutes % 60)}00`;
}

function utcStamp(date: Date): string {
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(
    date.getUTCDate()
  )}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(
    date.getUTCSeconds()
  )}Z`;
}

/** Builds an iCalendar file that Google, Apple and Outlook calendars import. */
export function buildIcs(events: CalendarEvent[], now = new Date()): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//zhenzhenfufu//UCSD Classrooms//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...VTIMEZONE,
  ];
  for (const event of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${escapeText(event.uid)}`,
      `DTSTAMP:${utcStamp(now)}`,
      `DTSTART;TZID=${TZID}:${localDateTime(event.date, event.start)}`,
      `DTEND;TZID=${TZID}:${localDateTime(event.date, event.end)}`,
      `SUMMARY:${escapeText(event.title)}`,
      `LOCATION:${escapeText(event.location)}`
    );
    if (event.description) {
      lines.push(`DESCRIPTION:${escapeText(event.description)}`);
    }
    if (event.url) {
      lines.push(`URL:${event.url}`);
    }
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

/** Saves the events as an .ics file the browser hands to the calendar app. */
export function downloadIcs(filename: string, events: CalendarEvent[]): void {
  const blob = new Blob([buildIcs(events)], {
    type: "text/calendar;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".ics") ? filename : `${filename}.ics`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
