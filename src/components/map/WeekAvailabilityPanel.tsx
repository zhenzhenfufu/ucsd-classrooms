import { useEffect, useId, useRef, useState, useMemo } from "react";
import { AvailabilityRange, validateWeekRange } from "../../lib/availabilityRanges";
import { buildings } from "../../lib/buildings";
import { CampusRangeAvailability, findCampusWeekAvailability } from "../../lib/campusWeekAvailability";
import { Day } from "../../lib/Day";
import { Translate, useLocale, useT } from "../../lib/i18n";
import { downloadIcs } from "../../lib/ics";
import { bookingUrl } from "../../lib/library/geisel";
import { findWeekAvailability, WeekRangeResult } from "../../lib/library/weekAvailability";
import { Moment, now } from "../../lib/now";
import { Time } from "../../lib/Time";
import { AREAS, areaOf } from "../../lib/areas";
import { matchesRoomFilters, useRoomFilters } from "../../lib/roomFilters";
import { CalendarIcon } from "../icons/CalendarIcon";
import { CloseIcon } from "../icons/CloseIcon";
import { Link } from "../Link";
import { RoomFilterControls } from "./RoomFilterControls";
import { WeekTimeCalendar } from "./WeekTimeCalendar";
import "./weekAvailability.css";

type Draft = { id: number; date: string; start: string; end: string };
type Results = { campus: CampusRangeAvailability[]; library: WeekRangeResult[]; checkedAt: Date };
const MAX_RANGES = 10;
const TIMES = Array.from({ length: 97 }, (_, i) => Time.from(i * 15));

function initialDraft(id: number, clock: Moment): Draft {
  let date = clock.date;
  let start = Math.ceil(+clock.time / 15) * 15;
  if (start > 23 * 60 && date.day !== 0) {
    date = date.add(1);
    start = 10 * 60;
  }
  start = Math.min(start, 23 * 60 + 45);
  return { id, date: date.toString(), start: Time.from(start).toString(true),
    end: Time.from(Math.min(start + 60, 1440)).toString(true) };
}

function parseDraft(draft: Draft): AvailabilityRange | null {
  const date = Day.parse(draft.date);
  const start = Time.parse24(draft.start);
  const end = draft.end === "24:00" ? Time.from(1440) : Time.parse24(draft.end);
  return date && date.toString() === draft.date && start && end ? { date, start, end } : null;
}

function rangeTitle(range: AvailabilityRange, t: Translate, locale: string): string {
  const day = range.date.toString(locale, { weekday: "short", month: "short", day: "numeric" });
  return `${day} · ${range.start}–${+range.end === 1440 ? t("midnight") : range.end}`;
}

/** Saves the slot as a study session in the user's calendar app. */
function addToCalendar(range: AvailabilityRange, building: string, room: string, title: string, place: string, t: Translate) {
  const link = new URL(`?building=${encodeURIComponent(building)}&room=${encodeURIComponent(room)}`, window.location.href);
  downloadIcs(`study-${building}-${room}-${range.date.toString()}`.replace(/[^\w.-]+/g, "-"), [{
    uid: `${building}-${room}-${range.date.toString()}-${+range.start}-${+range.end}@zhenzhenfufu.github.io`,
    title, location: place, date: range.date, start: range.start, end: range.end,
    description: t("No class was scheduled here for this slot when you saved it. Check the room before you go."),
    url: link.toString(),
  }]);
}

function CalendarButton({ label, onClick }: { label: string; onClick: () => void }) {
  const t = useT();
  return (
    <button type="button" className="week-ics" onClick={onClick} aria-label={label} title={t("Add to calendar (.ics)")}>
      <CalendarIcon />
    </button>
  );
}

function RangeResults({ campus, library, expired, areas }: {
  campus: CampusRangeAvailability;
  library: WeekRangeResult;
  expired: boolean;
  /** Areas offered by the filter, for matching a remembered choice. */
  areas: readonly string[];
}) {
  const [limit, setLimit] = useState(20);
  const t = useT();
  const filters = useRoomFilters();
  const rooms = campus.rooms.filter(({ building, seats }) => matchesRoomFilters(filters, areas, building, seats));
  const locale = useLocale();
  const range = campus.range;
  const title = rangeTitle(range, t, locale);
  return (
    <section className="week-result" aria-label={title}>
      <h3>{title}</h3>
      {expired ? <p className="week-note">{t("This time slot has started or passed. Choose a future slot to check again.")}</p> : <>
        <div className="week-result-counts">
          <span>{campus.state === "ready" ? t("{count} classrooms", { count: rooms.length }) : t("Classrooms unavailable")}</span>
          <span>{library.state === "ready" ? t("{count} Geisel rooms", { count: library.spaces.length }) : t("Geisel unavailable")}</span>
        </div>
        <details className="week-source-results" open={library.state !== "ready" || library.spaces.length > 0}>
          <summary>{t("Geisel · free for the whole slot")}</summary>
          {library.state === "error" ? <p className="week-note">{library.error === undefined ? library.error : t(library.error)}</p>
            : library.state === "window-end" ? <p className="week-note">{t("Reservations have not opened for this date.")}</p>
            : library.spaces.length === 0 ? <p className="week-note">{t("No room is bookable for this entire time slot.")}</p>
            : <ul className="week-room-list">{library.spaces.map((space) => (
              <li key={space.key}>
                <Link view={{ type: "building", building: "GEISEL", room: space.key }}
                  term={{ date: range.date, time: range.start }}>
                  <strong>{space.title}</strong><small>{t("Floor {floor} · {seats} seats", { floor: space.floor.slice(1), seats: space.capacity })}</small>
                </Link>
                <CalendarButton label={t("Add {name} on {when} to calendar", { name: space.title, when: title })}
                  onClick={() => addToCalendar(range, "GEISEL", space.key, t("Study · {place}", { place: space.title }),
                    `${space.title}, Geisel Library, UC San Diego`, t)} />
                <a href={bookingUrl(space, range.date)} target="_blank" rel="noreferrer" className="week-book"
                  aria-label={t("Book {name} on {when} in LibCal", { name: space.title, when: title })}>{t("Book ↗")}</a>
              </li>
            ))}</ul>}
        </details>
        <details className="week-source-results" open>
          <summary>{t("Classrooms · no class scheduled during the slot")}</summary>
          {campus.state !== "ready" ? <p className="week-note">{t(campus.error ?? "Complete schedules are unavailable for this date.")}</p>
            : campus.rooms.length === 0 ? <p className="week-note">{t("No classroom has this entire time slot clear in the loaded schedules.")}</p>
            : rooms.length === 0 ? <p className="week-note">{t("No classroom in this area and size is free for the whole slot.")}</p>
            : <>
              <ul className="week-room-list">{rooms.slice(0, limit).map(({ building, room, seats }) => (
                <li key={`${building}/${room}`}>
                  <Link view={{ type: "building", building, room }} term={{ date: range.date, time: range.start }}>
                    <strong>{building} {room}</strong>
                    <small>{[buildings[building]?.name, seats !== null ? t("~{seats} seats", { seats }) : null].filter(Boolean).join(" · ")}</small>
                  </Link>
                  <CalendarButton label={t("Add {name} on {when} to calendar", { name: `${building} ${room}`, when: title })}
                    onClick={() => addToCalendar(range, building, room, t("Study · {place}", { place: `${building} ${room}` }),
                      `${building} ${room}${buildings[building] ? `, ${buildings[building].name}` : ""}, UC San Diego`, t)} />
                </li>
              ))}</ul>
              {limit < rooms.length && <button type="button" className="week-secondary"
                onClick={() => setLimit((n) => n + 20)}>{t("Show more ({count} remaining)", { count: rooms.length - limit })}</button>}
            </>}
        </details>
      </>}
    </section>
  );
}

export function WeekAvailabilityPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const locale = useLocale();
  const [clock, setClock] = useState(now);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [calendarVersion, setCalendarVersion] = useState(0);
  const formId = useId();
  const nextId = useRef(1);
  const progressRef = useRef<HTMLDivElement>(null);
  /** Set by a search, so its first results scroll into view; refreshes stay put. */
  const revealResults = useRef(false);
  const requestVersion = useRef(0);
  const [submitted, setSubmitted] = useState<AvailabilityRange[] | null>(null);
  const [results, setResults] = useState<Results | null>(null);
  // Areas with a free classroom in any checked slot, in campus order
  const resultAreas = useMemo(() => {
    const present = new Set(results?.campus.flatMap((c) => c.rooms.map((r) => areaOf(r.building))));
    return AREAS.map((area) => area.id).filter((id) => present.has(id));
  }, [results]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const week = clock.date.monday;
  const days = Array.from({ length: 7 }, (_, offset) => week.add(offset));
  const hasOldDates = drafts.some((draft) => !days.some((day) => day.toString() === draft.date));
  const activeDraft = drafts.find((draft) => draft.id === activeId);
  const calendarRanges = drafts.flatMap((draft, index) => {
    const range = parseDraft(draft);
    return range && range.start < range.end ? [{ id: draft.id, range, slot: index + 1 }] : [];
  });

  useEffect(() => {
    if (!open) return;
    setClock(now());
    const timer = setInterval(() => setClock(now()), 30_000);
    return () => clearInterval(timer);
  }, [open]);

  useEffect(() => {
    if (!open || !submitted) {
      setLoading(false);
      return;
    }
    let current = true;
    let running = false;
    const search = async () => {
      if (running) return;
      // Once a requested slot passes, its old result must not remain a free-room claim.
      if (submitted.every((range) => validateWeekRange(range, now()) !== null)) {
        setLoading(false);
        return;
      }
      running = true;
      const version = requestVersion.current;
      setLoading(true);
      const [campus, library] = await Promise.all([
        findCampusWeekAvailability(submitted).catch((): CampusRangeAvailability[] =>
          submitted.map((range) => ({ range, rooms: [], state: "error", error: "Couldn't load classroom schedules. Try again." }))),
        findWeekAvailability(submitted).catch((): WeekRangeResult[] =>
          submitted.map((range) => ({ range, spaces: [], state: "error", error: "Couldn't load Geisel reservations. Try again." }))),
      ]);
      if (current && version === requestVersion.current) {
        setResults({ campus, library, checkedAt: new Date() });
        setLoading(false);
      }
      running = false;
    };
    void search();
    const timer = setInterval(() => void search(), 60_000);
    return () => { current = false; clearInterval(timer); };
  }, [open, submitted]);

  useEffect(() => {
    if (!results || !revealResults.current) return;
    revealResults.current = false;
    progressRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [results]);

  const invalidate = () => {
    // Cancel synchronously in input events, before React commits effect cleanup.
    requestVersion.current++;
    setSubmitted(null);
    setResults(null);
    setLoading(false);
    setError(null);
  };
  const edit = (id: number, patch: Partial<Draft>) => {
    invalidate();
    setDrafts((rows) => rows.map((row) => row.id === id ? { ...row, ...patch } : row));
  };
  const reset = () => {
    setClock(now());
    setDrafts([]);
    setActiveId(null);
    setCalendarVersion((version) => version + 1);
    invalidate();
  };
  const addRange = (range: AvailabilityRange) => {
    const issue = validateWeekRange(range, now());
    if (issue) { setError(t(issue)); return; }
    const duplicate = drafts.find((draft) => draft.date === range.date.toString() &&
      draft.start === range.start.toString(true) && draft.end === range.end.toString(true));
    if (duplicate) { setActiveId(duplicate.id); return; }
    if (drafts.length >= MAX_RANGES) { setError(t("You can select up to 10 time slots. Remove a slot to add another.")); return; }
    const id = nextId.current++;
    invalidate();
    setDrafts((rows) => [...rows, { id, date: range.date.toString(), start: range.start.toString(true), end: range.end.toString(true) }]);
    setActiveId(id);
  };
  const changeRange = (id: number, range: AvailabilityRange) => {
    setError(null);
    edit(id, { date: range.date.toString(), start: range.start.toString(true), end: range.end.toString(true) });
    setActiveId(id);
  };
  /** Moves the active slot's start or end by 15 minutes. */
  const nudge = (draft: Draft, field: "start" | "end", delta: number) => {
    const range = parseDraft(draft);
    if (!range) return;
    const current = now();
    const first = range.date.id === current.date.id ? Math.ceil(+current.time / 15) * 15 : 0;
    let start = +range.start;
    let end = +range.end;
    if (field === "start") start = Math.max(first, Math.min(end - 15, start + delta));
    else end = Math.max(start + 15, Math.min(1440, end + delta));
    if (start === +range.start && end === +range.end) return;
    changeRange(draft.id, { date: range.date, start: Time.from(start), end: Time.from(end) });
  };
  const remove = (id: number) => {
    invalidate();
    setDrafts((rows) => rows.filter((row) => row.id !== id));
    if (activeId === id) setActiveId(drafts.find((row) => row.id !== id)?.id ?? null);
  };

  return (
    <aside id="week-availability-panel" className={`week-planner ${open ? "" : "week-planner-hidden"}`} aria-label={t("This week's free spaces")}
      aria-hidden={!open} inert={!open}>
      <header className="free-rooms-header">
        <div><h2 className="free-rooms-title">{t("Plan this week")}</h2>
          <p className="free-rooms-subtitle">{week.toString(locale, { month: "short", day: "numeric" })}–{week.add(6).toString(locale, { month: "short", day: "numeric" })} · {t("San Diego time")}</p>
        </div>
        <button className="icon-btn free-rooms-close" onClick={() => { requestVersion.current++; onClose(); }} aria-label={t("Close weekly planner")}><CloseIcon /></button>
      </header>
      <div className="week-scroll">
        <p className="week-intro">{t("Pick your time on the calendar. Find classrooms and Geisel rooms free for each entire slot.")}</p>
        {hasOldDates && <p className="week-error" role="status">{t("A new week has started. Clear all or choose dates in this week.")}</p>}
        <WeekTimeCalendar key={`${week.id}/${calendarVersion}`} days={days} clock={clock} ranges={calendarRanges} activeId={activeId}
          onSelect={addRange} onChange={changeRange} onRemove={remove} onActivate={setActiveId}
          disabled={drafts.length >= MAX_RANGES} open={open} />
        <form className="week-form" id={formId} onSubmit={(event) => {
          event.preventDefault();
          if (!drafts.length) { setError(t("Select a time slot on the calendar first.")); return; }
          const current = now();
          const ranges: AvailabilityRange[] = [];
          for (const [i, draft] of drafts.entries()) {
            const range = parseDraft(draft);
            const issue = range ? validateWeekRange(range, current) : "Choose a valid date, start and end time.";
            if (issue) { setError(t("Slot {n}: {issue}", { n: i + 1, issue: t(issue) })); return; }
            ranges.push(range!);
          }
          requestVersion.current++;
          setError(null); setResults(null); setSubmitted(ranges);
          revealResults.current = true;
        }}>
          <div className="week-selection-heading">
            <h3>{t("Selected times")} <span>{drafts.length}/{MAX_RANGES}</span></h3>
            {drafts.length > 0 && <button type="button" className="week-secondary" onClick={reset}>{t("Clear all")}</button>}
          </div>
          {drafts.length === 0 ? <p className="week-empty">{t("No times selected yet. Select a block on the calendar to get started.")}</p> :
            <ul className="week-selected-slots">{drafts.map((draft, i) => {
              const range = parseDraft(draft);
              return <li key={draft.id} data-color={i % 4} className={draft.id === activeId ? "week-selected-active" : ""}>
                <button type="button" className="week-selected-pick" onClick={() => setActiveId(draft.id)} aria-pressed={draft.id === activeId}>
                  <span className="week-slot-number">{i + 1}</span>
                  <span>{range ? rangeTitle(range, t, locale) : `${draft.date} · ${draft.start}–${draft.end}`}</span>
                </button>
                <button type="button" className="week-selected-remove" aria-label={t("Remove slot {n}", { n: i + 1 })} onClick={() => remove(draft.id)}><CloseIcon /></button>
              </li>;
            })}</ul>}
          {activeDraft && <fieldset className="week-slot" key={activeDraft.id}>
            <legend>{t("Adjust slot {n}", { n: drafts.indexOf(activeDraft) + 1 })}</legend>
            <div className="week-slot-date">
              <label><span>{t("Day")}</span><select aria-label={t("Selected slot day")} value={activeDraft.date}
                onChange={(event) => edit(activeDraft.id, { date: event.target.value })}>
                {!days.some((day) => day.toString() === activeDraft.date) && <option value={activeDraft.date} disabled>{t("{date} · outside this week", { date: activeDraft.date })}</option>}
                {days.map((day) => (
                  <option key={day.id} value={day.toString()} disabled={day < clock.date}>
                    {day.toString(locale, { weekday: "short", month: "short", day: "numeric" })}
                  </option>
                ))}
              </select></label>
            </div>
            <div className="week-times">{(["start", "end"] as const).map((field) => (
              <div className="week-time-field" key={field}>
                <label htmlFor={`week-slot-${field}`}>{field === "start" ? t("Start") : t("End")}</label>
                <div className="week-stepper">
                  <button type="button" aria-label={field === "start" ? t("Start 15 minutes earlier") : t("End 15 minutes earlier")}
                    onClick={() => nudge(activeDraft, field, -15)}>−</button>
                  <select id={`week-slot-${field}`} aria-label={field === "start" ? t("Selected slot start") : t("Selected slot end")} value={activeDraft[field]}
                    onChange={(event) => edit(activeDraft.id, { [field]: event.target.value })}>
                    {(field === "start" ? TIMES.slice(0, -1) : TIMES.slice(1)).map((time) => <option key={+time} value={time.toString(true)}>
                      {+time === 1440 ? t("Midnight") : time.toString()}
                    </option>)}
                  </select>
                  <button type="button" aria-label={field === "start" ? t("Start 15 minutes later") : t("End 15 minutes later")}
                    onClick={() => nudge(activeDraft, field, 15)}>+</button>
                </div>
              </div>
            ))}</div>
          </fieldset>}
          <div className="week-edit-actions">
            <button type="button" className="week-secondary" disabled={drafts.length >= MAX_RANGES}
              onClick={() => {
                const draft = initialDraft(nextId.current++, now());
                invalidate(); setDrafts((rows) => [...rows, draft]); setActiveId(draft.id);
              }}>{t("Enter a time manually")}</button>
            <span className="week-selection-note">{t("15-minute steps · up to 10 slots")}</span>
          </div>
        </form>
        <div className="week-progress" role="status" aria-live="polite" ref={progressRef}>
          {loading ? t("Checking classroom schedules and Geisel reservations…") : results ?
            t(results.campus.length === 1
              ? "{count} time slot checked at {time} PT · refreshes every minute"
              : "{count} time slots checked at {time} PT · refreshes every minute", {
              count: results.campus.length,
              time: results.checkedAt.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit", timeZone: "America/Los_Angeles" }),
            }) : ""}
        </div>
        {results && <div className="week-filters"><RoomFilterControls areas={resultAreas} /></div>}
        {results && <div className="week-results">{results.campus.map((campus, i) => (
          <RangeResults key={`${submitted?.map((r) => `${r.date}/${+r.start}/${+r.end}`).join(",")}:${i}`}
            campus={campus} library={results.library[i]} expired={validateWeekRange(campus.range, clock) !== null}
            areas={resultAreas} />
        ))}</div>}
        <p className="week-note week-disclaimer">{t("Classrooms: no scheduled classes; access and other events are not tracked. Geisel: live reservation availability. Choose the same time slot in LibCal to book; booking rules still apply.")}</p>
      </div>
      {/* Always in reach, however far the calendar and list are scrolled */}
      <footer className="week-footer">
        {error && <p className="week-error" role="alert">{error}</p>}
        <button className="week-submit" type="submit" form={formId} disabled={drafts.length === 0 || loading}>{loading ? t("Checking…") : results ? t("Refresh availability")
          : !drafts.length ? t("Find free spaces")
          : t(drafts.length === 1 ? "Find free spaces for {count} slot" : "Find free spaces for {count} slots", { count: drafts.length })}</button>
      </footer>
    </aside>
  );
}
