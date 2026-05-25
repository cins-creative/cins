import { NctRemoveIcon } from "@/components/nganh/NctRemoveIcon";
import { TruongUniversityCard } from "@/components/truong/TruongUniversityCard";
import { truongDetailHref, type NganhTruongRow } from "@/lib/nganh/truong-shared";
import {
  buildTruongUniversityCardFoot,
  buildTruongUniversityCardTags,
  nganhTruongRowToCardSchool,
} from "@/lib/truong/university-card";

type Props = {
  rows: NganhTruongRow[];
  editing?: boolean;
  onRemove?: (programId: string) => void;
};

export function NctSchoolsGrid({ rows, editing = false, onRemove }: Props) {
  if (!rows.length) return null;

  return (
    <div className="nct-truong-cards tdh-page" id="truong-dao-tao">
      <div className="tdh-list-grid">
        {rows.map((row, i) => {
          const school = nganhTruongRowToCardSchool(row);
          const tags = buildTruongUniversityCardTags(
            row.nganhTags,
            row.nganhCount,
          );
          const foot = buildTruongUniversityCardFoot(row.nganhCount);
          const card = (
            <TruongUniversityCard
              school={school}
              index={i}
              href={truongDetailHref(row.slug)}
              tags={tags}
              foot={foot}
              dataType={row.loai_truong ?? ""}
            />
          );

          if (editing) {
            return (
              <div
                key={row.programId}
                className="nct-school-card-edit-wrap"
              >
                {card}
                {onRemove ? (
                  <button
                    type="button"
                    className="nct-mon-remove nct-school-remove"
                    onClick={(e) => {
                      e.preventDefault();
                      onRemove(row.programId);
                    }}
                    aria-label="Gỡ trường"
                  >
                    <NctRemoveIcon />
                  </button>
                ) : null}
              </div>
            );
          }

          return <div key={row.programId}>{card}</div>;
        })}
      </div>
    </div>
  );
}
