import { useT } from "../lib/i18n";

type InfoPanelProps = {
  className?: string;
};
export function InfoPanel({ className = "" }: InfoPanelProps) {
  const t = useT();
  return (
    <div className={`info-panel ${className}`}>
      <h1 className="title">{t("UCSD Classroom Schedules")}</h1>
      <p className="instructions">
        {t("Select a building to view its rooms.")}{" "}
        <a
          href="https://github.com/zhenzhenfufu/ucsd-classrooms/blob/main/docs/schedules.md"
          className="link"
        >
          {t("Schedule data")}
        </a>
      </p>
    </div>
  );
}
