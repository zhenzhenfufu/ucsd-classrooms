import { useMemo } from "react";
import { TermBuildings } from "../../lib/coursesToClassrooms";
import { useMoment } from "../../lib/moment-context";
import { locale, localTermName, setLang, translator, useLang } from "../../lib/i18n";
import { CloseIcon } from "../icons/CloseIcon";
import { findFreeRooms } from "./FreeRoomsPanel";

type ChipFormats = {
  date: Intl.DateTimeFormat;
  shortDate: Intl.DateTimeFormat;
};
const formatsByLocale = new Map<string, ChipFormats>();

/**
 * Date formatters for a locale, created once each. Times use `Time#toString`
 * ("3:25 pm") so the chip matches room lists in both languages.
 */
function chipFormats(locale: string): ChipFormats {
  let formats = formatsByLocale.get(locale);
  if (!formats) {
    formats = {
      date: new Intl.DateTimeFormat(locale, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
      shortDate: new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
      }),
    };
    formatsByLocale.set(locale, formats);
  }
  return formats;
}

export type MapChipsProps = {
  termBuildings?: TermBuildings;
  datePanelOpen: boolean;
  onOpenDatePanel: () => void;
  onUseNow: () => void;
  freeRoomsOpen: boolean;
  onToggleFreeRooms: () => void;
  weekPlannerOpen: boolean;
  onToggleWeekPlanner: () => void;
  visible: boolean;
};

/** Quick actions under the search bar: the schedule time and free rooms. */
export function MapChips({
  termBuildings,
  datePanelOpen,
  onOpenDatePanel,
  onUseNow,
  freeRoomsOpen,
  onToggleFreeRooms,
  weekPlannerOpen,
  onToggleWeekPlanner,
  visible,
}: MapChipsProps) {
  const moment = useMoment();
  const lang = useLang();
  const t = translator(lang);
  const {
    date: dateFormat,
    shortDate: shortDateFormat,
  } = chipFormats(locale(lang));
  const { date, time, type, currentTerm } = moment;
  const local = date.toLocal(time.hour, time.minute);

  const freeCount = useMemo(
    () =>
      termBuildings && type !== "term"
        ? findFreeRooms(termBuildings, moment, null).length
        : null,
    [termBuildings, type, moment]
  );

  return (
    <div
      className={`map-chips ${visible ? "" : "map-chips-hidden"}`}
      role="toolbar"
      aria-label={t("Schedule")}
    >
      <div className={`chip-group ${type === "now" ? "" : "chip-group-custom"}`}>
        <button
          className={`chip ${datePanelOpen ? "chip-on" : ""}`}
          onClick={onOpenDatePanel}
          aria-expanded={datePanelOpen}
          title={t("Change the date, time, or quarter")}
        >
          {type === "now" ? (
            <>
              <span className="live-dot" aria-hidden="true" />
              <span>
                <span className="chip-long">{t("Now")}</span>
                <span className="chip-dim">
                  <span className="chip-long"> · </span>
                  {time.toString()}
                </span>
              </span>
            </>
          ) : type === "date-time" ? (
            <span>
              <span className="chip-long">{dateFormat.format(local)}</span>
              <span className="chip-short">{shortDateFormat.format(local)}</span>
              <span className="chip-dim"> · {time.toString()}</span>
            </span>
          ) : (
            <span>{localTermName(t, currentTerm.year, currentTerm.season)}</span>
          )}
          <svg viewBox="0 0 24 24" className="icon chip-caret" aria-hidden="true">
            <path d="M7 10l5 5 5-5z" />
          </svg>
        </button>
        {type !== "now" && (
          <button
            className="chip chip-reset"
            onClick={onUseNow}
            aria-label={t("Back to the current time")}
            title={t("Back to the current time")}
          >
            <CloseIcon />
          </button>
        )}
      </div>
      <button
        className={`chip ${freeRoomsOpen ? "chip-on" : ""}`}
        onClick={onToggleFreeRooms}
        aria-pressed={freeRoomsOpen}
        disabled={!termBuildings}
        title={t("Classrooms with no class listed at this time")}
      >
        <svg viewBox="0 0 24 24" className="icon chip-icon" aria-hidden="true">
          <path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm4.3 4.3 1.4 1.4-6.7 6.7-3.7-3.7 1.4-1.4 2.3 2.3z" />
        </svg>
        <span>
          {lang === "en" ? (
            <>
              Free<span className="chip-long"> rooms</span>
            </>
          ) : (
            t("Free rooms")
          )}
        </span>
        {freeCount !== null && <span className="chip-count">{freeCount}</span>}
      </button>
      <button id="week-planner-toggle" className={`chip ${weekPlannerOpen ? "chip-on" : ""}`}
        onClick={onToggleWeekPlanner} aria-expanded={weekPlannerOpen} aria-controls="week-availability-panel"
        title={t("Find classrooms and Geisel rooms for multiple time slots this week")}
        aria-label={t("Plan this week")}>
        <svg viewBox="0 0 24 24" className="icon chip-icon" aria-hidden="true">
          <path d="M7 2h2v2h6V2h2v2h2a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2zM5 9v10h14V9zm2 2h4v4H7z" />
        </svg>
        <span>
          <span className="chip-long">{t("Plan this week")}</span>
          <span className="chip-short">{t("This week")}</span>
        </span>
      </button>
      <button
        className="chip"
        onClick={() => setLang(lang === "zh" ? "en" : "zh")}
        lang={lang === "zh" ? "en" : "zh-CN"}
        aria-label={lang === "zh" ? "Switch to English" : "切换到中文"}
        title={lang === "zh" ? "Switch to English" : "切换到中文"}
      >
        {lang === "zh" ? "EN" : "中文"}
      </button>
    </div>
  );
}
