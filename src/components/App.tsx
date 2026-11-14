import { useEffect, useMemo, useRef, useState } from "react";
import { buildings } from "../lib/buildings";
import { coursesToClassrooms, TermBuildings } from "../lib/coursesToClassrooms";
import { Day } from "../lib/Day";
import { getHolidays } from "../lib/holidays";
import { fromViewTerm, MomentContext } from "../lib/moment-context";
import { Course } from "../lib/section-types";
import { Term, TermCache, TermError } from "../lib/TermCache";
import { CurrentTerm, getTerm, Season, termCode } from "../lib/terms";
import { localTermName, Translate, useLang, useT } from "../lib/i18n";
import { useLast } from "../lib/useLast";
import {
  viewTermsEqual,
  OnView,
  viewFromUrl,
  viewToUrl,
  ViewWithTerm,
} from "../lib/View";
import { BuildingPanel } from "./building/BuildingPanel";
import { ExplorerIntro } from "./explorer/BuildingExplorer";
import { useExplorerPreference } from "../lib/explorerPreference";
import { hasIndoorLayout } from "../lib/indoor/manifest";
import { GEISEL, GEISEL_SPACES, isLibrary } from "../lib/library/geisel";
import { ScheduleAvailability } from "../lib/indoor/roomStatus";
import { DateTimePanel } from "./date-time/DateTimePanel";
import { TermButtons } from "./date-time/TermButtons";
import { navigate } from "./Link";
import { CampusMap } from "./map/CampusMap";
import { FreeRoomsPanel } from "./map/FreeRoomsPanel";
import { MapChips } from "./map/MapChips";
import { WeekAvailabilityPanel } from "./map/WeekAvailabilityPanel";
import { ModalView, ResultModal } from "./search/ResultModal";
import { SearchBar, State } from "./search/SearchBar";
import { TermStatus } from "./TermStatus";
import { CloseIcon } from "./icons/CloseIcon";
import { useStableCallback } from "../lib/useStable";

/**
 * Represents the state of the app:
 * - If the object is `null`, then the app is fetching classroom data.
 * - If `buildings` is defined, the object should not be empty. Show the
 *   classrooms, and display the errors in a corner if any.
 * - If there are no classes, show the errors in an overlay message.
 * - If there are no classes and no errors, then show that school is on break.
 */
type AppState = {
  /** If undefined, then that means there are no classes for this time. */
  buildings?: TermBuildings;
  status: TermStatus[];
  errors: TermError[];
  season: Season;
  holiday?: string;
};

/**
 * Displays errors. This won't mention if a term is unavailable if the other
 * term failed to load.
 * @param errors - Guaranteed to be nonempty.
 */
function displayError(errors: TermError[], t: Translate): string {
  const offlineErrors = errors
    .filter(({ type }) => type === "offline")
    .map(({ request: { year, quarter } }) => localTermName(t, year, quarter));
  if (offlineErrors.length > 0) {
    return t("I couldn't load schedules for {terms}. Is ResNet failing you again?", {
      terms: offlineErrors.join(t(" and ")),
    });
  } else {
    return t("Schedules aren't available for {terms}.", {
      terms: errors
        .map(({ request: { year, quarter } }) => localTermName(t, year, quarter))
        .join(t(" and ")),
    });
  }
}

function getTerms({ year, season, current }: CurrentTerm): Term[] {
  const terms: Term[][] = [
    current ? [{ year, quarter: season }] : [],
    season === "S1" || season === "S2" || (season === "FA" && !current)
      ? [{ year, quarter: "S3" }]
      : [],
  ];
  return terms.flat();
}

const GEISEL_ROOM_TITLES = Object.fromEntries(
  GEISEL_SPACES.filter((space) => space.title !== `Room ${space.key}`).map(
    (space) => [`${GEISEL} ${space.key}`, space.title]
  )
);

export type AppProps = {
  title: string;
};
export function App({ title }: AppProps) {
  const lang = useLang();
  const t = useT();
  const [realTime, setRealTime] = useState(true);
  const [moment, setMoment] = useState(() => fromViewTerm(null));
  useEffect(() => {
    if (realTime) {
      const intervalId = setInterval(() => {
        setMoment((moment) => {
          // Avoid unnecessary rerenders by returning original object if they have
          // the same values
          const newMoment = fromViewTerm(null);
          return newMoment.type !== "now" ||
            +moment.date !== +newMoment.date ||
            +moment.time !== +newMoment.time
            ? newMoment
            : moment;
        });
      }, 1000);
      return () => {
        clearInterval(intervalId);
      };
    }
  }, [realTime]);

  /**
   * What the tab title shows before the site name. Kept so the title can be
   * redrawn when the language changes; `translated` marks UI text (as opposed
   * to building, room, course or instructor names).
   */
  const titlePrefix = useRef<{ text: string; translated: boolean } | null>(null);
  const applyTitle = (translate: Translate) => {
    const prefix = titlePrefix.current;
    const site = translate(title);
    document.title = prefix
      ? `${prefix.translated ? translate(prefix.text) : prefix.text} · ${site}`
      : site;
  };
  const setTitle = (text: string | null, translated = false) => {
    titlePrefix.current = text === null ? null : { text, translated };
    applyTitle(t);
  };
  useEffect(() => {
    applyTitle(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  const termCache = useRef(new TermCache());
  const [state, setState] = useState<AppState | null>(null);

  const noticeVisible = !state?.buildings;
  /**
   * Terms that failed to download while another term loaded. Rooms can look
   * free when their classes are in the missing term, so say so. Terms that
   * aren't published yet are already listed by the term status.
   */
  const offlineTerms = state?.buildings
    ? state.errors.filter((error) => error.type === "offline")
    : [];
  const offlineKey = offlineTerms
    .map(({ request }) => termCode(request.year, request.quarter))
    .join(" ");
  const [dismissedOffline, setDismissedOffline] = useState<string | null>(null);
  const showOfflineAlert = offlineKey !== "" && dismissedOffline !== offlineKey;
  const notice = useLast(
    "",
    state === null
      ? t("Loading...")
      : state.buildings
      ? null
      : state && state.errors.length > 0
      ? displayError(state.errors, t)
      : state.holiday
      ? t("{holiday}!", { holiday: t(state.holiday) })
      : state.season === "WI"
      ? t("Winter break.")
      : state.season === "SP"
      ? t("Spring break.")
      : t("Summer break.")
  );

  const [showDatePanel, setShowDatePanel] = useState(false);
  const [buildingCode, setBuildingCode] = useState<string | null>(null);
  const lastBuilding = useLast("CENTR", buildingCode);
  const [scrollTo, setScrollTo] = useState({ building: "CENTR", init: true });
  const [room, setRoom] = useState<string | null>(null);
  const [explorerEnabled, setExplorerEnabled_s] = useExplorerPreference();
  const [explorerIntro, setExplorerIntro] = useState<ExplorerIntro>("fade");
  /**
   * How the next building view was reached: clicking in the app stacks the
   * floors up, while page loads and back/forward use a quick fade so a direct
   * link opens its schedule promptly.
   */
  const navigationSource = useRef<ExplorerIntro>("rise");

  const [showFreeRooms, setShowFreeRooms] = useState(false);
  const [showWeekPlanner, setShowWeekPlanner] = useState(false);

  const [showResults, setShowResults] = useState(false);
  const [searchState, setSearchState] = useState<State>({ type: "unloaded" });
  const [modal, setModal] = useState<ModalView | null>(null);
  const modalView = useLast<ModalView>(
    { type: "course", course: { code: "", title: "", groups: [] } },
    modal
  );

  const momentDateId = moment.date.id;

  const terms = useMemo(
    () => getTerms(getTerm(Day.fromId(momentDateId))),
    [momentDateId]
  );
  const termId = terms
    .map((term) => termCode(term.year, term.quarter))
    .join(" ");

  const datePanelVisible = !showWeekPlanner && (showDatePanel || (noticeVisible && state !== null));
  // The library's rooms don't depend on class schedules, so it opens on breaks
  const buildingPanelVisible =
    buildingCode !== null && (!noticeVisible || isLibrary(buildingCode));

  /** Only called by the `useEffect` below, whenever `moment.date` changes */
  async function handleDate(date: Day, skipHolidayCheck: boolean) {
    const currentTerm = getTerm(date);
    const { season, finals } = currentTerm;
    const terms = getTerms(currentTerm);
    const holiday = getHolidays(date.year)[date.id];
    if (!skipHolidayCheck && (holiday || terms.length === 0)) {
      // Have the date selector open for the user to select another day
      setState({ errors: [], status: [], season, holiday });
      return;
    }
    const maybePromise = termCache.current.requestTerms(terms);
    if (maybePromise instanceof Promise) {
      // Show "Loading..."
      setState(null);
    }
    const { successes, errors } =
      maybePromise instanceof Promise ? await maybePromise : maybePromise;
    const courses = successes.flatMap((result) => result.result.courses);
    // Summer sessions' finals week overlaps with classes, it seems like?
    const finalsWeek = finals && season !== "S1" && season !== "S2";
    const classrooms = coursesToClassrooms(courses);
    for (const building of Object.keys(classrooms)) {
      if (!buildings[building]) {
        console.warn(`${building} does not exist.`);
      }
    }
    // For future quarters, all finals are TBA, but that doesn't mean the week
    // is on break.
    const empty =
      Object.keys(classrooms).length === 0 &&
      !(finalsWeek && courses.length > 0);
    setState({
      buildings: empty ? undefined : classrooms,
      status: [
        ...successes.map(
          (result): TermStatus => [result.request, result.result.scraped]
        ),
        ...errors.map((error): TermStatus => [error.request, error.type]),
      ],
      errors,
      season,
    });
  }

  const viewingGenericDay = moment.currentTerm.week === -1;
  useEffect(() => {
    handleDate(Day.fromId(momentDateId), viewingGenericDay);
  }, [momentDateId, viewingGenericDay]);

  /**
   * Called whenever extra schedule data (e.g. remote classes) are needed, e.g.
   * the search bar.
   */
  async function loadTerms(terms: Term[], termId: string): Promise<Course[]> {
    const maybePromise = termCache.current.requestTerms(terms, true);
    if (maybePromise instanceof Promise) {
      // Show "Loading..."
      setSearchState({ type: "loading" });
    }
    const { successes, errors } =
      maybePromise instanceof Promise ? await maybePromise : maybePromise;
    const courses = successes.flatMap((result) => result.result.courses);
    setSearchState({
      type: "loaded",
      termId,
      data: {
        courses,
        professors: Array.from(
          new Set(
            courses.flatMap((course) =>
              course.groups.flatMap((group) =>
                group.instructors.map(({ first, last }) => `${last}, ${first}`)
              )
            )
          ),
          (name) => {
            const [last, first] = name.split(", ");
            return { first, last };
          }
        ),
      },
      // Don't show `unavailable` errors since it's already shown by the term
      // status
      offline: errors
        .filter((error) => error.type === "offline")
        .map((error) => error.request),
    });
    return courses;
  }

  const handleView_s = useStableCallback(async (view: ViewWithTerm) => {
    setRealTime(view.term === null);
    setMoment(fromViewTerm(view.term));
    setShowResults(!!view.searching);
    if (view.type === "default") {
      setModal(null);
      setBuildingCode(null);
      setTitle(null);
      return;
    }
    if (view.type === "building") {
      setShowWeekPlanner(false);
      setScrollTo({ building: view.building, init: false });
      // On phones, the building sheet takes the free room list's place
      if (window.matchMedia("(max-width: 690px)").matches) {
        setShowFreeRooms(false);
      }
      if (view.building !== buildingCode) {
        setExplorerIntro(navigationSource.current);
      }
      setBuildingCode(view.building);
      setModal(null);
      setRoom(view.room ?? null);
      setTitle(
        view.room
          ? `${view.building} ${view.room}`
          : buildings[view.building]?.name ?? view.building
      );
      return;
    }
    setBuildingCode(null);
    const courses =
      searchState.type === "loaded" && searchState.termId === termId
        ? searchState.data.courses
        : await loadTerms(terms, termId);
    if (view.type === "course") {
      const course = courses.find((course) => course.code === view.course);
      if (course) {
        setModal({ type: "course", course });
        setTitle(view.course);
      } else {
        setModal({
          type: "course",
          course: { code: view.course, title: view.course, groups: [] },
        });
        setTitle("Course not found", true);
      }
    } else {
      const [last, first] = view.name.split(", ");
      setModal({
        type: "professor",
        professor: {
          first,
          last,
          courses: courses.flatMap((course) => {
            const groups = course.groups.filter((group) =>
              group.instructors.some(
                (prof) => prof.first === first && prof.last === last
              )
            );
            return groups.length > 0 ? [{ ...course, groups }] : [];
          }),
        },
      });
      setTitle(`${first} ${last}`);
    }
  });

  useEffect(() => {
    const initView = viewFromUrl(window.location.href);
    if (initView.searching) {
      // On page load, if #search is in the URL, remove it
      window.history.replaceState(
        window.history.state,
        "",
        viewToUrl({ ...initView, searching: false })
      );
    }
  }, []);

  useEffect(() => {
    navigationSource.current = "fade";
    handleView_s(viewFromUrl(window.location.href));
    navigationSource.current = "rise";
    const handlePopstate = () => {
      navigationSource.current = "fade";
      handleView_s(viewFromUrl(window.location.href));
      navigationSource.current = "rise";
    };
    window.addEventListener("popstate", handlePopstate);
    return () => {
      window.removeEventListener("popstate", handlePopstate);
    };
    // Unintuitively, searchState is a dependency in handleView. Otherwise,
    // going back/forth will use courses from the wrong term
  }, [handleView_s, searchState]);

  // Every building on the map is searchable, even without classes this term
  const searchBuildings = useMemo(() => Object.keys(buildings), []);
  const searchRooms = useMemo(
    () => ({
      ...Object.fromEntries(
        Object.entries(state?.buildings ?? {}).map(([code, rooms]) => [
          code,
          Object.keys(rooms),
        ])
      ),
      [GEISEL]: GEISEL_SPACES.map((space) => space.key),
    }),
    [state?.buildings]
  );

  const availability: ScheduleAvailability = !state?.buildings
    ? "unavailable"
    : state.errors.length > 0
    ? "partial"
    : "complete";
  const explorerVisible =
    buildingPanelVisible &&
    explorerEnabled &&
    buildingCode !== null &&
    hasIndoorLayout(buildingCode);

  return (
    <OnView.Provider value={handleView_s}>
      <MomentContext.Provider value={moment}>
        <SearchBar
          state={searchState}
          terms={terms}
          termId={termId}
          buildings={searchBuildings}
          rooms={searchRooms}
          roomTitles={GEISEL_ROOM_TITLES}
          showResults={showResults}
          onSearch={(showResults) => {
            setShowResults(showResults);
            const currentView = viewFromUrl(window.location.href);
            navigate(handleView_s, {
              view: { ...currentView, searching: showResults },
              back: ([previous]) => {
                if (
                  showResults ||
                  !previous ||
                  previous.type !== currentView.type ||
                  !viewTermsEqual(previous.term, currentView.term)
                ) {
                  return null;
                }
                if (!previous.searching) {
                  return 0;
                } else {
                  return null;
                }
              },
            });
            if (
              searchState.type === "unloaded" ||
              (searchState.type === "loaded" && searchState.termId !== termId)
            ) {
              loadTerms(terms, termId);
            }
          }}
          visible={!noticeVisible}
        />
        <ResultModal view={modalView} open={modal !== null} />
        <MapChips
          termBuildings={state?.buildings}
          datePanelOpen={datePanelVisible}
          onOpenDatePanel={() => {
            setShowWeekPlanner(false);
            setShowDatePanel((show) => !show);
            // On phones, the time sheet takes the free room list's place
            if (window.matchMedia("(max-width: 690px)").matches) {
              setShowFreeRooms(false);
            }
          }}
          onUseNow={() => {
            navigate(handleView_s, {
              view: { ...viewFromUrl(window.location.href), term: null },
            });
          }}
          freeRoomsOpen={showFreeRooms && !!state?.buildings}
          onToggleFreeRooms={() => {
            setShowWeekPlanner(false);
            setShowFreeRooms((show) => !show);
            if (window.matchMedia("(max-width: 690px)").matches) {
              setShowDatePanel(false);
            }
          }}
          weekPlannerOpen={showWeekPlanner}
          onToggleWeekPlanner={() => {
            setShowWeekPlanner((show) => !show);
            setShowFreeRooms(false);
            setShowDatePanel(false);
          }}
          visible={true}
        />
        <DateTimePanel
          date={moment.date}
          onDate={(date: Day) => {
            navigate(handleView_s, {
              view: {
                ...viewFromUrl(window.location.href),
                term: { ...moment, date },
              },
            });
          }}
          time={moment.time}
          onTime={(time) => {
            navigate(handleView_s, {
              view: {
                ...viewFromUrl(window.location.href),
                term: { ...moment, time },
              },
            });
          }}
          useNow={realTime}
          onUseNow={(useNow) => {
            if (useNow === realTime) {
              return;
            }
            navigate(handleView_s, {
              view: {
                ...viewFromUrl(window.location.href),
                term: useNow ? null : moment,
              },
            });
          }}
          visible={datePanelVisible}
          closeable={!noticeVisible || state === null}
          className={`${
            buildingPanelVisible ? "date-time-panel-bottom-panel" : ""
          } ${noticeVisible ? "date-time-panel-notice-visible" : ""}`}
          onClose={() => setShowDatePanel(false)}
          terms={
            <TermButtons
              view={
                buildingCode !== null
                  ? { type: "building", building: buildingCode, room: room }
                  : { type: "default" }
              }
            />
          }
          footer={
            <>
              <TermStatus statuses={state?.status} />
              {lang === "zh" ? (
                <p className="credit">
                  由{" "}
                  <a href="https://github.com/zhenzhenfufu" className="link">
                    @zhenzhenfufu
                  </a>{" "}
                  制作，基于{" "}
                  <a href="https://github.com/wenhaoquestion/ucsd-classrooms" className="link">
                    wenhaoquestion
                  </a>{" "}
                  和{" "}
                  <a href="https://github.com/SheepTester/ucsd-classrooms" className="link">
                    SheepTester
                  </a>{" "}
                  的版本。{" "}
                  <a
                    href="https://github.com/zhenzhenfufu/ucsd-classrooms"
                    className="link"
                  >
                    GitHub
                  </a>
                </p>
              ) : (
                <p className="credit">
                  Made by{" "}
                  <a href="https://github.com/zhenzhenfufu" className="link">
                    @zhenzhenfufu
                  </a>
                  , based on{" "}
                  <a href="https://github.com/wenhaoquestion/ucsd-classrooms" className="link">
                    wenhaoquestion's
                  </a>{" "}
                  and{" "}
                  <a href="https://github.com/SheepTester/ucsd-classrooms" className="link">
                    SheepTester's
                  </a>
                  .{" "}
                  <a
                    href="https://github.com/zhenzhenfufu/ucsd-classrooms"
                    className="link"
                  >
                    GitHub
                  </a>
                </p>
              )}
            </>
          }
        />
        <div
          className={`buildings-wrapper ${
            explorerVisible ? "buildings-explorer-open" : ""
          }`}
        >
          <p
            className={`notice ${noticeVisible ? "notice-visible" : ""} ${
              datePanelVisible ? "notice-date-open" : ""
            }`}
          >
            <span className="notice-text">{notice}</span>
          </p>
          {showOfflineAlert && (
            <div className="load-alert" role="alert">
              <p className="load-alert-text">
                {t(
                  "Couldn't load {terms}, so some classes are missing and rooms may look free when they aren't.",
                  {
                    terms: offlineTerms
                      .map(({ request }) => localTermName(t, request.year, request.quarter))
                      .join(t(" and ")),
                  }
                )}
              </p>
              <button
                type="button"
                className="load-alert-retry"
                onClick={() => handleDate(Day.fromId(momentDateId), viewingGenericDay)}
              >
                {t("Retry")}
              </button>
              <button
                type="button"
                className="icon-btn load-alert-close"
                onClick={() => setDismissedOffline(offlineKey)}
                aria-label={t("Dismiss")}
              >
                <CloseIcon />
              </button>
            </div>
          )}
          <CampusMap
            termBuildings={state?.buildings}
            selected={buildingCode}
            scrollTo={scrollTo}
            explorerEnabled={explorerEnabled}
          />
        </div>
        <FreeRoomsPanel
          termBuildings={state?.buildings}
          open={showFreeRooms && !!state?.buildings}
          onClose={() => setShowFreeRooms(false)}
        />
        <WeekAvailabilityPanel open={showWeekPlanner} onClose={() => setShowWeekPlanner(false)} />
        <BuildingPanel
          building={
            buildings[lastBuilding] ?? {
              code: lastBuilding,
              college: "",
              images: "",
              location: [0, 0],
              name: lastBuilding,
            }
          }
          room={room}
          rooms={state?.buildings?.[lastBuilding] ?? {}}
          availability={availability}
          visible={buildingPanelVisible}
          rightPanelOpen={datePanelVisible}
          explorerIntro={explorerIntro}
          explorerEnabled={explorerEnabled}
          onExplorerEnabled_s={setExplorerEnabled_s}
        />
      </MomentContext.Provider>
    </OnView.Provider>
  );
}
