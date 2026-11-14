import { getHolidays } from "./holidays";
import { CalendarEvent } from "./ics";
import { Course, Exam, Group, Meeting, Section } from "./section-types";
import { Season, TermDays } from "./terms";

export type CourseCalendarOptions = {
  termDays: TermDays;
  season: Season;
  /** Display name for a meeting type code, e.g. "LE" -> "Lecture". */
  typeName: (type: string) => string;
  remote: string;
  tba: string;
};

function place(
  meeting: Section | Meeting | Exam,
  options: CourseCalendarOptions
): string {
  if (!meeting.location) {
    return options.tba;
  }
  if (meeting.location.building === "RCLAS") {
    return options.remote;
  }
  return `${meeting.location.building} ${meeting.location.room}, UC San Diego`;
}

/**
 * Sections a student picks between, e.g. discussions A01, A02. A section with
 * the group's own code (usually the lecture, e.g. A00) is shared by everyone.
 */
export function sectionChoices(group: Group): Section[] {
  return group.sections.filter((section) => section.code !== group.code);
}

/**
 * Every class meeting of a course this term, as calendar events: the group's
 * shared meetings and lecture, the chosen section (every section when
 * `choice` is null, for groups with at most one to choose from), and exams.
 *
 * Weekly meetings run from the start of the term until finals week (or the
 * last day of a summer session), skipping university holidays. Each
 * occurrence is its own event so holidays need no exception rules.
 */
export function courseEvents(
  course: Course,
  group: Group,
  choice: Section | null,
  options: CourseCalendarOptions
): CalendarEvent[] {
  const shared = group.sections.filter((section) => section.code === group.code);
  const weekly: (Section | Meeting)[] = [
    ...group.meetings,
    ...shared,
    ...(choice ? [choice] : sectionChoices(group)),
  ];
  const summer = options.season === "S1" || options.season === "S2";
  const first = group.dateRange?.start ?? options.termDays.start;
  const last =
    group.dateRange?.end ??
    (summer ? options.termDays.end : options.termDays.finals.add(-1));
  const instructors = group.instructors
    .map(({ first, last }) => `${first} ${last}`)
    .join(", ");
  const description = [course.title, instructors].filter(Boolean).join(" · ");
  const id = (...parts: (string | number)[]) =>
    `${[course.code, group.code, ...parts].join("-").replace(/\s+/g, "")}@zhenzhenfufu.github.io`;

  const events: CalendarEvent[] = [];
  for (let day = first; day <= last; day = day.add(1)) {
    if (getHolidays(day.year)[day.id]) {
      continue;
    }
    for (const meeting of weekly) {
      if (!meeting.time || !meeting.time.days.includes(day.day)) {
        continue;
      }
      events.push({
        uid: id(meeting.code, meeting.type, day.toString()),
        title: `${course.code} ${options.typeName(meeting.type)}${
          meeting.code !== group.code ? ` (${meeting.code})` : ""
        }`,
        location: place(meeting, options),
        date: day,
        start: meeting.time.start,
        end: meeting.time.end,
        description,
      });
    }
  }
  for (const exam of group.exams) {
    if (!exam.time) {
      continue;
    }
    events.push({
      uid: id(exam.type, exam.date.toString()),
      title: `${course.code} ${options.typeName(exam.type)}`,
      location: place(exam, options),
      date: exam.date,
      start: exam.time.start,
      end: exam.time.end,
      description,
    });
  }
  return events.sort((a, b) => +a.date - +b.date || +a.start - +b.start);
}

/** A file name like "CSE 100 A01.ics". */
export function courseFileName(course: Course, group: Group, choice: Section | null): string {
  return `${course.code} ${choice?.code ?? group.code}`.replace(/[^\w .-]+/g, "-");
}
