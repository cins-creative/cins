import { CareerHubCardLabels } from "@/components/career/CareerHubCardLabels";
import { CareerHubCardLink } from "@/components/career/CareerHubCardLink";
import { CareerHubCardThumb } from "@/components/career/CareerHubCardThumb";
import type { DeptCardTheme } from "@/lib/career/hubRailTheme";
import type { NgheNghiepHubItem } from "@/lib/career/types";

type Props = {
  career: NgheNghiepHubItem;
  href: string;
  deptTheme: DeptCardTheme;
  showLinhVuc?: boolean;
};

export function CareerHubRoleCard({
  career,
  href,
  deptTheme,
  showLinhVuc = false,
}: Props) {
  return (
    <li>
      <CareerHubCardLink
        href={href}
        career={career}
        className="hn-role-card"
        data-dept={deptTheme}
      >
        <div className="hn-role-thumb">
          <CareerHubCardThumb
            careerId={career.id}
            thumbnailUrl={career.thumbnail_mascot}
            editorEnabled={false}
          />
        </div>
        <div className="hn-role-body">
          <CareerHubCardLabels career={career} showLinhVuc={showLinhVuc} />
          <footer className="hn-role-foot">
            <span className="hn-role-arrow" aria-hidden>
              →
            </span>
          </footer>
        </div>
      </CareerHubCardLink>
    </li>
  );
}
