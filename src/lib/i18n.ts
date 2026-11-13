import { useSyncExternalStore } from "react";
import type { Quarter } from "./terms";

/** UI language. Data (building names, courses, instructors) is never translated. */
export type Lang = "en" | "zh";

/** Values for `{name}` placeholders. */
export type Vars = Record<string, string | number>;

/** Looks up an English UI string in the current language. */
export type Translate = (english: string, vars?: Vars) => string;

const KEY = "ucsd-classrooms:lang";

/**
 * Simplified Chinese UI text, keyed by the English source string. Keys missing
 * here fall back to English, so dynamic text (e.g. server errors) still shows.
 */
export const ZH: Readonly<Record<string, string>> = {
  // App notices and errors
  "Loading...": "加载中...",
  "Loading…": "加载中…",
  "Winter break.": "寒假中。",
  "Spring break.": "春假中。",
  "Summer break.": "暑假中。",
  "{holiday}!": "{holiday}！",
  "I couldn't load schedules for {terms}. Is ResNet failing you again?":
    "无法加载 {terms} 的课表。是不是 ResNet 又掉线了？",
  "Schedules aren't available for {terms}.": "{terms} 的课表暂不可用。",
  " and ": "、",
  " or ": " 或 ",
  ", ": "、",
  ".": "。",
  "Course not found": "未找到课程",

  // Term names
  "Fall {year}": "{year} 秋季学期",
  "Winter {year}": "{year} 冬季学期",
  "Spring {year}": "{year} 春季学期",
  "Summer Session I {year}": "{year} 暑期第一期",
  "Summer Session II {year}": "{year} 暑期第二期",
  "Special Summer Session {year}": "{year} 特别暑期课程",
  "Summer Med School {year}": "{year} 医学院暑期",

  // Holidays
  "New Year's Day": "元旦",
  "Martin Luther King Jr. Day": "马丁·路德·金纪念日",
  "Presidents' Day": "总统日",
  "César Chávez Day": "塞萨尔·查韦斯纪念日",
  "Memorial Day": "阵亡将士纪念日",
  Juneteenth: "六月节",
  "Independence Day": "独立日",
  "Labor Day": "劳动节",
  "Veterans Day": "退伍军人节",
  Thanksgiving: "感恩节",
  "Day after Thanksgiving": "感恩节翌日",
  "Christmas Eve": "平安夜",
  Christmas: "圣诞节",
  "New Year's Eve": "新年前夜",

  // Meeting types
  "Final Exam": "期末考试",
  Midterm: "期中考试",
  "Film Sessions": "影片放映",
  "Problem Sessions": "习题课",
  "Other Sessions": "其他课程",
  "Review Sessions": "复习课",
  "Make-up Sessions": "补课",
  Lecture: "讲座课",
  Discussion: "讨论课",
  Lab: "实验课",
  "Independent Study": "独立研究",
  Seminar: "研讨课",
  Activity: "活动",
  "Clinical Clerkship": "临床实习",
  Clinic: "临床实践",
  Conference: "研讨会",
  Fieldwork: "实地考察",
  Internship: "实习",
  "Outside Preparation": "课外准备",
  Practicum: "实践课",
  "Study Abroad": "海外学习",
  "Simultaneous Enrlmnt-Other UC": "同时注册其他 UC",
  Studio: "工作室课",
  Tutorial: "辅导课",

  // Room status (src/lib/indoor/roomStatus.ts)
  "Class scheduled now": "现在有课",
  "Class starts soon": "即将上课",
  "No class listed now": "现在没有课",
  "Has listed classes": "本学期有课",
  "No classes listed": "暂无排课",
  "Schedule data unavailable": "课表数据不可用",
  "Not a scheduled room": "非排课房间",
  "Free to book": "可预约",
  Booked: "已预约",
  "Not bookable": "不可预约",

  // Map toolbar
  Schedule: "课表",
  "Change the date, time, or quarter": "更改日期、时间或学期",
  Now: "现在",
  "Back to the current time": "回到当前时间",
  "Classrooms with no class listed at this time": "此时没有排课的教室",
  "Free rooms": "空教室",
  "Find classrooms and Geisel rooms for multiple time slots this week":
    "为本周多个时段查找空教室和 Geisel 自习室",
  "Plan this week": "本周规划",
  "This week": "本周",

  // Map
  "Your location": "你的位置",
  Map: "地图",
  "You seem to be off campus.": "你似乎不在校园内。",
  "You seem to be off campus": "你似乎不在校园内",
  "Zoom in": "放大",
  "Zoom out": "缩小",
  "Show my location": "显示我的位置",
  "{name}: {summary}": "{name}：{summary}",
  "{free} of {total} study rooms free to book": "{free}/{total} 间自习室可预约",
  "{total} bookable study rooms": "{total} 间可预约自习室",
  "{inUse} of {total} classrooms in use": "{inUse}/{total} 间教室正在使用",

  // Geolocation (src/lib/geolocation.ts)
  "Location isn't available in this browser.": "此浏览器不支持定位。",
  "Location permission was denied.": "定位权限被拒绝。",
  "Couldn't find your location.": "无法获取你的位置。",

  // Free rooms panel
  "{course} until {time}": "{course} 上课至 {time}",
  "{course} at {time}": "{course} {time} 开始",
  "Free until {time}": "空闲至 {time}",
  "Free rest of day": "今天剩余时间都空闲",
  "Saved rooms": "已收藏",
  "Remove {room} from saved rooms": "从已收藏中移除 {room}",
  "Remove from saved rooms": "从已收藏中移除",
  "No class listed for {minutes}+ min": "至少 {minutes} 分钟无课",
  "nearest first": "最近的在前",
  "longest gap first": "空闲最久的在前",
  Close: "关闭",
  "Finding your location…": "正在定位…",
  "{message} Try again": "{message} 重试",
  "Show nearest first": "按距离排序",
  "Rooms whose largest scheduled class is at least this size":
    "只显示最大排课人数不少于该值的教室",
  Seats: "座位",
  "Any size": "不限",
  "Pick a specific date and time to see which rooms are free.":
    "选择具体的日期和时间，查看哪些教室空闲。",
  "No free rooms with {seats}+ seats found for this time.":
    "此时没有找到 {seats} 座以上的空教室。",
  "No free rooms found for this time.": "此时没有找到空教室。",
  "~{seats} seats": "约 {seats} 座",
  "{minutes} min": "{minutes} 分钟",
  "From class schedules, not live occupancy. Rooms may be locked or booked for other events. Seats are estimated from the largest class held there.":
    "根据课表推算，并非实时占用情况。教室可能上锁或被其他活动占用。座位数按该教室最大的课程人数估算。",

  // Week planner
  midnight: "午夜",
  Midnight: "午夜",
  "Study · {place}": "自习 · {place}",
  "No class was scheduled here for this slot when you saved it. Check the room before you go.":
    "保存时这里在该时段没有排课。出发前请先确认教室情况。",
  "Add to calendar (.ics)": "添加到日历 (.ics)",
  "This time slot has started or passed. Choose a future slot to check again.":
    "该时段已开始或已过去。请选择未来的时段重新查询。",
  "{count} classrooms": "{count} 间教室",
  "Classrooms unavailable": "教室信息不可用",
  "{count} Geisel rooms": "{count} 间 Geisel 自习室",
  "Geisel unavailable": "Geisel 信息不可用",
  "Geisel · free for the whole slot": "Geisel · 整个时段空闲",
  "Reservations have not opened for this date.": "该日期尚未开放预约。",
  "No room is bookable for this entire time slot.": "没有自习室能预约整个时段。",
  "Floor {floor} · {seats} seats": "{floor} 楼 · {seats} 座",
  "Add {name} on {when} to calendar": "将 {name}（{when}）添加到日历",
  "Book {name} on {when} in LibCal": "在 LibCal 预约 {name}（{when}）",
  "Book ↗": "预约 ↗",
  "Classrooms · no class scheduled during the slot": "教室 · 该时段内无排课",
  "Complete schedules are unavailable for this date.": "该日期没有完整的课表。",
  "No classroom has this entire time slot clear in the loaded schedules.":
    "在已加载的课表中，没有教室整个时段都空闲。",
  "Show more ({count} remaining)": "显示更多（还有 {count} 个）",
  "This week's free spaces": "本周空闲空间",
  "San Diego time": "圣地亚哥时间",
  "Close weekly planner": "关闭本周规划",
  "Pick your time on the calendar. Find classrooms and Geisel rooms free for each entire slot.":
    "在日历上选择时间，查找每个时段全程空闲的教室和 Geisel 自习室。",
  "A new week has started. Clear all or choose dates in this week.":
    "新的一周已经开始。请全部清除，或选择本周的日期。",
  "Select a time slot on the calendar first.": "请先在日历上选择一个时段。",
  "Choose a valid date, start and end time.": "请选择有效的日期、开始和结束时间。",
  "Slot {n}: {issue}": "时段 {n}：{issue}",
  "You can select up to 10 time slots. Remove a slot to add another.":
    "最多可选择 10 个时段。请先移除一个再添加。",
  "Couldn't load classroom schedules. Try again.": "无法加载教室课表，请重试。",
  "Couldn't load Geisel reservations. Try again.": "无法加载 Geisel 预约信息，请重试。",
  "Selected times": "已选时间",
  "Clear all": "全部清除",
  "No times selected yet. Select a block on the calendar to get started.":
    "还没有选择时间。在日历上选择一个时间块开始吧。",
  "Remove slot {n}": "移除时段 {n}",
  "Adjust slot {n}": "调整时段 {n}",
  Day: "日期",
  "Selected slot day": "所选时段的日期",
  "{date} · outside this week": "{date} · 不在本周",
  Start: "开始",
  End: "结束",
  "Start 15 minutes earlier": "开始时间提前 15 分钟",
  "End 15 minutes earlier": "结束时间提前 15 分钟",
  "Start 15 minutes later": "开始时间推后 15 分钟",
  "End 15 minutes later": "结束时间推后 15 分钟",
  "Selected slot start": "所选时段的开始时间",
  "Selected slot end": "所选时段的结束时间",
  "Enter a time manually": "手动输入时间",
  "15-minute steps · up to 10 slots": "以 15 分钟为单位 · 最多 10 个时段",
  "Checking classroom schedules and Geisel reservations…": "正在查询教室课表和 Geisel 预约…",
  "{count} time slot checked at {time} PT · refreshes every minute":
    "已于太平洋时间 {time} 查询 {count} 个时段 · 每分钟刷新",
  "{count} time slots checked at {time} PT · refreshes every minute":
    "已于太平洋时间 {time} 查询 {count} 个时段 · 每分钟刷新",
  "Classrooms: no scheduled classes; access and other events are not tracked. Geisel: live reservation availability. Choose the same time slot in LibCal to book; booking rules still apply.":
    "教室：仅表示没有排课，不跟踪门禁和其他活动。Geisel：实时预约空闲情况。请在 LibCal 选择相同时段预约，预约规则仍然适用。",
  "Checking…": "查询中…",
  "Refresh availability": "刷新空闲情况",
  "Find free spaces": "查找空闲空间",
  "Find free spaces for {count} slot": "查找 {count} 个时段的空闲空间",
  "Find free spaces for {count} slots": "查找 {count} 个时段的空闲空间",

  // Week availability errors (src/lib/availabilityRanges.ts and friends)
  "Choose a valid date.": "请选择有效的日期。",
  "Choose valid start and end times.": "请选择有效的开始和结束时间。",
  "End time must be after start time on the same day.": "结束时间必须晚于同一天的开始时间。",
  "Choose a day in the current week (Monday–Sunday).": "请选择本周内的日期（周一至周日）。",
  "Choose a start time that has not passed.": "请选择尚未过去的开始时间。",
  "Some class schedules could not be loaded. Try again.": "部分课表加载失败，请重试。",
  "Complete class schedules are not available for these dates.": "这些日期没有完整的课表。",
  "No classroom schedule data is available for these dates.": "这些日期没有教室课表数据。",
  "Class schedules could not be loaded. Try again.": "课表加载失败，请重试。",
  "Choose a valid same-day time range.": "请选择同一天内的有效时间段。",
  "Classroom availability is not shown on campus holidays.": "校园假日不显示教室空闲情况。",
  "Classroom schedules are not available during this academic break.":
    "假期期间没有教室课表。",
  "Choose a valid date and a time range that ends after it starts, within the same day.":
    "请选择有效的日期，以及同一天内结束晚于开始的时间段。",
  "The library returned availability for a different date. Please try again.":
    "图书馆返回了其他日期的空闲信息，请重试。",
  "Could not load library availability. Please try again.": "无法加载图书馆空闲信息，请重试。",
  "Library availability request timed out. Please try again.": "图书馆空闲信息请求超时，请重试。",
  "Live library availability isn't configured for this site. Check the library's booking page directly.":
    "本站未配置图书馆实时空闲信息，请直接查看图书馆的预约页面。",

  // Week calendar
  "{hours} hr": "{hours} 小时",
  "{hours} hr {minutes} min": "{hours} 小时 {minutes} 分钟",
  "Select time slots on this week's calendar": "在本周日历上选择时段",
  "Click to add an hour, or drag to choose a range. Drag a slot or its edges to adjust.":
    "点击添加一小时，或拖动选择时间范围。拖动时段或其边缘可调整。",
  "Tap a time to add an hour, then drag its edges to adjust. Swipe to change days.":
    "点按时间添加一小时，再拖动边缘调整。左右滑动切换日期。",
  "Choose calendar day": "选择日历日期",
  "{date}, {count} slot": "{date}，{count} 个时段",
  "{date}, {count} slots": "{date}，{count} 个时段",
  "{date}, {time}. Add a 1-hour slot": "{date}，{time}。添加 1 小时时段",
  "Slot {n}: {start}–{end}": "时段 {n}：{start}–{end}",
  "{label}, {day}. Arrow keys move it, Shift+arrows change its end, Delete removes it":
    "{label}，{day}。方向键移动，Shift+方向键调整结束时间，Delete 键删除",
  "Slot {n}": "时段 {n}",
  Remove: "移除",
  "10 time slots selected. Remove one to add another.": "已选择 10 个时段。移除一个后才能再添加。",
  "Add as many as 10 slots across the week.": "本周最多可添加 10 个时段。",

  // Building panel
  "Back to room list": "返回教室列表",
  "Only show classrooms with no class listed now": "只显示现在没有排课的教室",
  "Walking directions in your maps app": "在地图应用中查看步行路线",
  Directions: "路线",
  "Free now": "现在空闲",
  "Room view": "教室视图",
  List: "列表",
  "from the room number": "根据房间号推断",
  "from the floor's room listing": "根据楼层的房间列表",
  "These rooms aren't placed on the floor plan.": "这些教室没有标在平面图上。",
  "{count} of these rooms aren't placed on the floor plan.": "其中 {count} 间教室没有标在平面图上。",
  "Floor unknown": "楼层未知",
  "Location not mapped yet": "位置尚未标注",
  "These room numbers don't say which floor they're on.": "这些房间号看不出所在楼层。",
  "These rooms are in the schedule, but no floor plan we have places them, so they aren't in the 3D view.":
    "这些教室出现在课表中，但现有平面图上找不到它们，所以不在 3D 视图中。",
  "Probably on {floor} ({basis}). Its position on the floor isn't mapped. Its schedule is below.":
    "可能在 {floor}（{basis}）。它在楼层中的位置尚未标注。课表见下方。",
  "On {floor} ({basis}). Its position on the floor isn't mapped. Its schedule is below.":
    "位于 {floor}（{basis}）。它在楼层中的位置尚未标注。课表见下方。",
  "This room's location inside {code} hasn't been mapped yet. Its schedule is below.":
    "这间教室在 {code} 内的位置尚未标注。课表见下方。",
  "No classes are listed for {room} in the loaded schedules. That doesn't necessarily mean the room is open or available.":
    "已加载的课表中没有 {room} 的课。但这不代表教室一定开放或可用。",
  "Some schedule data failed to load, so it's unknown whether classes meet in {room}.":
    "部分课表加载失败，无法确定 {room} 是否有课。",
  "Some schedule data failed to load, so this schedule may be incomplete.":
    "部分课表加载失败，此课表可能不完整。",
  "Shrink panel": "收起面板",
  "Expand panel": "展开面板",

  // Room list and schedule
  "No classes are listed for this building this week.": "本周这栋楼没有排课。",
  soon: "即将上课",
  "{type} with up to {count} student": "{type}，最多 {count} 名学生",
  "{type} with up to {count} students": "{type}，最多 {count} 名学生",
  "Every classroom here has a class now or soon.": "这里每间教室现在或即将有课。",
  "No classes are listed for this room this week.": "本周此教室没有排课。",
  "Search seat map for {room}": "搜索 {room} 的座位图",
  "Quarter begins tomorrow": "明天开学",
  "This meeting is from a Special Summer Session course.": "这是特别暑期课程（S3）的课。",
  "Note: some classes book rooms but don't meet.": "注意：有些课程预订了教室但实际不上课。",
  "Save to the top of Free rooms": "收藏到空教室列表顶部",
  Saved: "已收藏",
  "Save room": "收藏教室",

  // Geisel library
  "Floor 1 · West": "1 楼 · 西侧",
  "Floor 2 · East and Service Hub": "2 楼 · 东侧和 Service Hub",
  "Floor 5": "5 楼",
  "Floor 6": "6 楼",
  "Floor 7": "7 楼",
  "Floor {n}": "{n} 楼",
  "Reserve {name} on the library's LibCal (UCSD sign-in)": "在图书馆 LibCal 预约 {name}（需 UCSD 登录）",
  "Reserve {name}": "预约 {name}",
  Book: "预约",
  "+{count} booths": "+{count} 个视频隔间",
  "+{count} booths ({free} free)": "+{count} 个视频隔间（{free} 个空闲）",
  "{count} seats": "{count} 座",
  "{count} seat": "{count} 座",
  "{free} of {total} free": "{free}/{total} 间空闲",
  "{count} rooms": "{count} 间",
  ". Pick one in the list to book it.": "。在列表中选一间预约。",
  "Live reservations from the library's LibCal": "来自图书馆 LibCal 的实时预约",
  "Live reservations unavailable; rooms still link to LibCal": "实时预约不可用；房间仍可链接到 LibCal",
  "Tap a study room to see when it's free and book it.": "点按自习室查看空闲时间并预约。",
  "Reservations for {date} haven't opened yet. LibCal books about two weeks ahead.":
    "{date} 的预约尚未开放。LibCal 大约提前两周开放预约。",
  "Loading live reservations…": "正在加载实时预约…",
  "Couldn't load live reservations ({message}). Each room still links to LibCal.":
    "无法加载实时预约（{message}）。每个房间仍可链接到 LibCal。",
  "Reservations aren't shown for past dates.": "不显示过去日期的预约。",
  "Pick a date and time to see which study rooms are free.": "选择日期和时间，查看哪些自习室空闲。",
  "Live availability isn't set up for this copy of the site. Each room links to its LibCal page.":
    "本站副本未设置实时空闲信息。每个房间都链接到其 LibCal 页面。",
  "No bookable times on this day.": "这一天没有可预约的时间。",
  "{name} on {date}": "{name}，{date}",
  Free: "空闲",
  ". The library map shows it in the {block} block, not as its own room.":
    "。图书馆地图把它画在 {block} 区块中，而不是单独的房间。",
  "Booking opens LibCal, where you sign in with your UCSD account.":
    "预约会打开 LibCal，需要用 UCSD 账号登录。",
  "Updated {time}; refreshes every minute.": "更新于 {time}；每分钟刷新。",
  "{room} on {floor}. The library map draws these rooms as one block.":
    "{room} 位于 {floor}。图书馆地图将这些房间画成一个区块。",
  "{room} isn't a bookable room in Geisel.": "{room} 不是 Geisel 的可预约房间。",
  "Only show study rooms free to book now": "只显示现在可预约的自习室",
  "No study room is free to book at this time.": "此时没有可预约的自习室。",
  "Booked until {time}": "已被预约至 {time}",
  "Booked rest of day": "今天剩余时间已被预约",
  "Not bookable, free at {time}": "不可预约，{time} 起空闲",
  "No free times left": "今天没有空闲时间了",

  // 3D explorer
  "In use": "使用中",
  "Starts soon": "即将开始",
  "No classes": "无课",
  "Traced from floor maps": "根据楼层平面图描绘",
  "UCSD Facilities floor plans": "UCSD Facilities 平面图",
  "Exterior only, from the campus map": "仅外观，来自校园地图",
  "Schematic demo, not the real layout": "示意演示，非真实布局",
  "{count} classroom": "{count} 间教室",
  "{count} unplaced classroom": "{count} 间未定位教室",
  "{count} unplaced classrooms": "{count} 间未定位教室",
  " · ● {count} in use": " · ● {count} 间使用中",
  " · ○ none in use": " · ○ 无使用中",
  "{message} The room list still works.": "{message} 教室列表仍可使用。",
  "The 3D view isn't available on this device or browser (WebGL couldn't start). The room list and schedules still work.":
    "此设备或浏览器无法使用 3D 视图（WebGL 无法启动）。教室列表和课表仍可使用。",
  "The 3D viewer failed to load. Check your connection; the room list still works.":
    "3D 查看器加载失败。请检查网络连接；教室列表仍可使用。",
  "The 3D view was interrupted by the graphics driver. It will resume if the browser restores it; the room list still works.":
    "3D 视图被显卡驱动中断。浏览器恢复后会继续显示；教室列表仍可使用。",
  "{code} indoor map": "{code} 室内地图",
  "Close building and return to map": "关闭建筑并返回地图",
  Floors: "楼层",
  "Show all floors": "显示所有楼层",
  All: "全部",
  View: "视图",
  "Show the library's original floor map beneath the 3D details": "在 3D 细节下方显示图书馆原始楼层地图",
  "Floor map": "楼层地图",
  "Look straight down at this floor": "俯视此楼层",
  "Top view": "俯视图",
  "Separate floors vertically": "将楼层上下分开",
  Exploded: "分层",
  "Rotate left": "向左旋转",
  "Rotate right": "向右旋转",
  "Reset view": "重置视角",
  Reset: "重置",
  "Fewer view controls": "收起视图控件",
  "More view controls": "更多视图控件",
  "Rotate and zoom buttons": "旋转和缩放按钮",
  "Loading indoor map…": "正在加载室内地图…",
  "Loading indoor map": "正在加载室内地图",
  ": indoor location not mapped yet.": "：室内位置尚未标注。",
  " · probably {floor}; position on the floor not mapped": " · 可能在 {floor}；楼层中的位置尚未标注",
  " · {floor}; position on the floor not mapped": " · 位于 {floor}；楼层中的位置尚未标注",
  "Exterior from the campus map. Pick a floor or a room in the list.":
    "外观来自校园地图。请选择楼层或列表中的教室。",
  "Drag to rotate, pinch or scroll to zoom. Tap a room for its schedule.":
    "拖动旋转，双指或滚轮缩放。点按教室查看课表。",
  "Room color legend": "教室颜色图例",
  "From class schedules, not live occupancy": "根据课表推算，并非实时占用情况",
  "Some floor elevations and heights are estimated. ": "部分楼层标高和层高为估算值。",
  "Floor elevations and heights follow the cited sources. ": "楼层标高和层高依据所引用的资料。",
  "Exploded spacing, room and furniture heights, and access symbols are illustrative.":
    "分层间距、房间和家具高度以及通道符号仅作示意。",
  " North is about {deg}° clockwise from the top of the source maps.":
    "北方大约位于源地图顶部顺时针 {deg}° 方向。",
  "(accessed {date})": "（访问于 {date}）",

  // Date and time panel
  "Show schedules for": "查看课表时间",
  Live: "实时",
  "Follow the current time": "跟随当前时间",
  "Follow the current time in San Diego": "跟随圣地亚哥当前时间",
  Today: "今天",
  Date: "日期",
  Time: "时间",
  Quarter: "学期",
  Hour: "小时",
  Minute: "分钟",
  "AM or PM": "上午或下午",
  Wk: "周",
  "Show {year}": "显示 {year} 年",
  "Data updated": "数据更新于",
  "last updated": "最后更新于",
  "failed to load.": "加载失败。",
  "is unavailable.": "不可用。",

  // Search
  "Search courses, professors, buildings, and rooms.": "搜索课程、教授、建筑和教室。",
  "Press '/' to jump to the search box.": "按 “/” 跳到搜索框。",
  "Course, professor, building, or room": "课程、教授、建筑或教室",
  "Clear search": "清除搜索",
  "Recent searches": "最近搜索",
  Recent: "最近",
  Clear: "清除",
  "Only courses with a lecture now": "只显示现在正在上课的课程",
  "Loading courses and professors…": "正在加载课程和教授…",
  "No courses with ongoing lectures match your search.": "没有正在上课的课程符合搜索条件。",
  "Nothing matches “{query}” in {terms}. Try a course code (CSE 100), a building (WLH), or a room (CENTR 115).":
    "在 {terms} 中没有与“{query}”匹配的结果。试试课程代码（CSE 100）、建筑（WLH）或教室（CENTR 115）。",
  "Search results": "搜索结果",
  Rooms: "教室",
  Courses: "课程",
  Professors: "教授",
  Buildings: "建筑",
  "No limit": "不限人数",
  "Capacity:": "容量：",
  "Happening now": "正在进行",
  "(Happening now)": "（正在进行）",
  Remote: "线上",
  TBA: "待定",
  "Instructor TBA": "授课教师待定",

  // Info panel
  "UCSD Classroom Schedules": "UCSD 教室课表",
  "Select a building to view its rooms.": "选择一栋建筑查看其教室。",
  "Schedule data": "课表数据",
};

/** BCP 47 locale for dates and times in a language. */
export function locale(lang: Lang): string {
  return lang === "zh" ? "zh-CN" : "en-US";
}

/** Value for `<html lang>`. */
function htmlLang(lang: Lang): string {
  return lang === "zh" ? "zh-CN" : "en";
}

/**
 * Translates an English UI string, filling in `{name}` placeholders. Unknown
 * strings (and English) pass through unchanged.
 */
export function translate(lang: Lang, english: string, vars?: Vars): string {
  const template =
    lang === "zh" && Object.hasOwn(ZH, english) ? ZH[english] : english;
  if (!vars) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.hasOwn(vars, name) ? String(vars[name]) : match
  );
}

const TRANSLATORS: Record<Lang, Translate> = {
  en: (english, vars) => translate("en", english, vars),
  zh: (english, vars) => translate("zh", english, vars),
};

/** A translate function for `lang`; the same function each time, for hook deps. */
export function translator(lang: Lang): Translate {
  return TRANSLATORS[lang];
}

const TERM_NAMES: Record<Quarter, string> = {
  FA: "Fall {year}",
  WI: "Winter {year}",
  SP: "Spring {year}",
  S1: "Summer Session I {year}",
  S2: "Summer Session II {year}",
  S3: "Special Summer Session {year}",
  SU: "Summer Med School {year}",
};

/** Like `termName` in terms.ts, in the UI language. */
export function localTermName(t: Translate, year: number, quarter: Quarter): string {
  return t(TERM_NAMES[quarter], { year });
}

export function parseLang(raw: string | null): Lang | null {
  return raw === "en" || raw === "zh" ? raw : null;
}

function defaultLang(): Lang {
  try {
    return navigator.language?.toLowerCase().startsWith("zh") ? "zh" : "en";
  } catch {
    return "en";
  }
}

let cache: Lang | null = null;
const listeners = new Set<() => void>();

function applyDocumentLang(lang: Lang) {
  if (typeof document !== "undefined") {
    document.documentElement.lang = htmlLang(lang);
  }
}

function read(): Lang {
  if (cache === null) {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(KEY);
    } catch {
      // Storage may be unavailable (private mode)
    }
    cache = parseLang(stored) ?? defaultLang();
    applyDocumentLang(cache);
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
      read();
      listener();
    }
  };
  window.addEventListener("storage", handleStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

export function setLang(lang: Lang): void {
  cache = lang;
  try {
    window.localStorage.setItem(KEY, lang);
  } catch {
    // Storage may be unavailable (private mode); the choice lasts this session
  }
  applyDocumentLang(lang);
  notify();
}

/** The UI language chosen in this browser. */
export function useLang(): Lang {
  return useSyncExternalStore(subscribe, read, () => "en");
}

/** `t(english, vars)` in the current UI language. */
export function useT(): Translate {
  return translator(useLang());
}

/** Locale for formatting dates in the current UI language. */
export function useLocale(): string {
  return locale(useLang());
}
