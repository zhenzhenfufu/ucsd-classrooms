import { Term } from "../lib/TermCache";
import { useLocale, useT } from "../lib/i18n";
import { termCode } from "../lib/terms";
import { useLast } from "../lib/useLast";

export type TermStatus = [Term, "unavailable" | "offline" | Date];

export type TermStatusProps = {
  statuses?: TermStatus[];
};
export function TermStatus({ statuses }: TermStatusProps) {
  const t = useT();
  const locale = useLocale();
  if (!statuses || statuses.length === 0) {
    return null;
  }
  const omitTerm = statuses.length === 1 && statuses[0][0].quarter !== "S3";
  return (
    <div className="term-statuses">
      {statuses.map(([term, status]) => (
        <p
          key={termCode(term.year, term.quarter)}
          className={`term-updated ${
            status === "offline"
              ? "term-offline"
              : status === "unavailable"
              ? "term-unavailable"
              : ""
          }`}
        >
          {!omitTerm && (
            <>
              <span className="term-code">
                {termCode(term.year, term.quarter)}
              </span>
              &nbsp;
            </>
          )}
          {status instanceof Date ? (
            <>
              {omitTerm ? t("Data updated") : t("last updated")}{" "}
              <span className="updated-date">
                {status.toLocaleDateString(locale)}
              </span>
              {t(".")}
            </>
          ) : status === "offline" ? (
            t("failed to load.")
          ) : (
            t("is unavailable.")
          )}
        </p>
      ))}
    </div>
  );
}
