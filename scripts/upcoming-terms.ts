// Prints the codes of the current (or upcoming) quarter and the one after it,
// e.g. "FA26 WI27", for the automatic schedule refresh. Summer sessions also
// include Special Summer Session (S3).
//
//   node upcoming-terms.mjs [YYYY-MM-DD]

import { Day } from "../src/lib/Day";
import { getTerm, seasons, termCode } from "../src/lib/terms";

const today = process.argv[2] ? Day.parse(process.argv[2]) : Day.today();
if (!today) {
  throw new Error("Usage: upcoming-terms [YYYY-MM-DD]");
}
const { year, season } = getTerm(today);
const index = seasons.indexOf(season);
const next = seasons[(index + 1) % seasons.length];
const nextYear = index + 1 === seasons.length ? year + 1 : year;
const codes = [termCode(year, season), termCode(nextYear, next)];
for (const [y, s] of [[year, season], [nextYear, next]] as const) {
  if (s === "S1" || s === "S2") {
    codes.push(termCode(y, "S3"));
  }
}
console.log([...new Set(codes)].join(" "));
