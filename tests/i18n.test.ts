import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Day } from "../src/lib/Day";
import { locale, localTermName, parseLang, translate, translator, ZH } from "../src/lib/i18n";
import { ROOM_STATUS_TEXT } from "../src/lib/indoor/roomStatus";
import { describeStatus, spaceStatus } from "../src/lib/library/geisel";
import { Quarter, termName } from "../src/lib/terms";
import { Time } from "../src/lib/Time";

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

describe("translate", () => {
  it("passes English through, filling placeholders", () => {
    assert.equal(translate("en", "Saved rooms"), "Saved rooms");
    assert.equal(translate("en", "Free until {time}", { time: "2:00 pm" }), "Free until 2:00 pm");
    assert.equal(translate("en", "~{seats} seats", { seats: 40 }), "~40 seats");
    assert.equal(
      translate("en", "Slot {n}: {start}–{end}", { n: 2, start: "9:00 am", end: "10:00 am" }),
      "Slot 2: 9:00 am–10:00 am"
    );
  });

  it("looks up Chinese text", () => {
    assert.equal(translate("zh", "Free rooms"), "空教室");
    assert.equal(translate("zh", "Plan this week"), "本周规划");
    assert.equal(translate("zh", "Saved rooms"), "已收藏");
    assert.equal(translate("zh", "Book"), "预约");
    assert.equal(translate("zh", "Free until {time}", { time: "2:00 PM" }), "空闲至 2:00 PM");
    assert.equal(translate("zh", "~{seats} seats", { seats: 40 }), "约 40 座");
  });

  it("falls back to English for unknown keys", () => {
    assert.equal(translate("zh", "HTTP 503"), "HTTP 503");
    assert.equal(translate("zh", "Geisel"), "Geisel");
    assert.equal(translate("zh", "No 3D data for {code}.", { code: "CENTR" }), "No 3D data for CENTR.");
    // Object.prototype keys aren't dictionary entries
    assert.equal(translate("zh", "constructor"), "constructor");
    assert.equal(translate("zh", "toString"), "toString");
  });

  it("leaves placeholders without a value alone", () => {
    assert.equal(translate("en", "Free until {time}", {}), "Free until {time}");
    assert.equal(translate("zh", "Free until {time}"), "空闲至 {time}");
  });

  it("reuses one translate function per language", () => {
    assert.equal(translator("zh"), translator("zh"));
    assert.equal(translator("en")("Book"), "Book");
    assert.equal(translator("zh")("Book"), "预约");
  });

  it("uses the same placeholders in every Chinese entry", () => {
    for (const [english, chinese] of Object.entries(ZH)) {
      assert.deepEqual(placeholders(chinese), placeholders(english), `placeholders differ for "${english}"`);
      assert.ok(chinese.length > 0, `empty translation for "${english}"`);
    }
  });

  it("translates every room status", () => {
    for (const text of Object.values(ROOM_STATUS_TEXT)) {
      assert.ok(Object.hasOwn(ZH, text), `missing translation for "${text}"`);
    }
  });
});

describe("language helpers", () => {
  it("maps languages to locales", () => {
    assert.equal(locale("en"), "en-US");
    assert.equal(locale("zh"), "zh-CN");
  });

  it("only accepts stored languages it knows", () => {
    assert.equal(parseLang("en"), "en");
    assert.equal(parseLang("zh"), "zh");
    assert.equal(parseLang(null), null);
    assert.equal(parseLang("fr"), null);
  });

  it("names terms like termName in English", () => {
    const quarters: Quarter[] = ["FA", "WI", "SP", "S1", "S2", "S3", "SU"];
    for (const quarter of quarters) {
      assert.equal(localTermName(translator("en"), 2026, quarter), termName(2026, quarter));
      assert.ok(localTermName(translator("zh"), 2026, quarter).startsWith("2026 "));
    }
    assert.equal(localTermName(translator("zh"), 2026, "FA"), "2026 秋季学期");
  });

  it("describes library rooms in either language", () => {
    const t = (hhmm: string) => {
      const [hour, minute] = hhmm.split(":").map(Number);
      return new Time(hour, minute);
    };
    const free = spaceStatus([{ start: t("10:00"), end: t("11:00"), status: "free" }], t("10:00"));
    assert.equal(describeStatus(free), "Free until 11:00 am");
    assert.equal(describeStatus(free, translator("en")), "Free until 11:00 am");
    assert.equal(describeStatus(free, translator("zh")), "空闲至 11:00 am");
  });

  it("formats weekdays with the language's locale", () => {
    const friday = Day.from(2026, 11, 13);
    assert.equal(friday.dayName("long", locale("en")), "Friday");
    assert.equal(friday.dayName("long", locale("zh")), "星期五");
  });
});
