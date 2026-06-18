"use client";

import {
  BookOpen,
  Briefcase,
  ChevronLeft,
  Clock3,
  GraduationCap,
  ImagePlus,
  Loader2,
  Lock,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ComposePublishedDetail } from "@/lib/journey/compose-published-sync";
import {
  assembleMilestoneTitle,
  defaultMonthYear,
  dependentsOf,
  getEffectivePhraseRecipe,
  isRecipeComplete,
  isSlotEnabled,
  MILESTONE_PHRASE_RECIPES,
  PHRASE_CATEGORIES,
  slotPlaceholder,
  VITRI_SUGGESTIONS,
  type PhraseRecipe,
  type PhraseRecipeId,
} from "@/lib/journey/milestone-phrase-recipes";
import type {
  MembershipMilestoneSearchHit,
  MembershipMilestoneSlotValues,
} from "@/lib/journey/membership-milestone-types";
import type { OrgAttachEvidence } from "@/lib/journey/org-milestone-tag-types";
import type { OrgAttachOption } from "@/lib/journey/org-milestone-tag-types";

type Props = {
  ownerSlug: string;
  /** Chỉnh sửa yêu cầu chờ duyệt. */
  editCotMocId?: string;
  onClose: () => void;
  onPublished: (detail?: ComposePublishedDetail) => void;
};

type ComposerStep = "phrase" | "evidence" | "confirm";

const DRAFT_KEY = (slug: string) => `cins-milestone-phrase:${slug}`;

const CATEGORY_ICONS = {
  hoc: BookOpen,
  lam: Briefcase,
  xong: GraduationCap,
} as const;

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1989 }, (_, i) => CURRENT_YEAR + 1 - i);

function emptyEvidence(): OrgAttachEvidence {
  return { label: "Bằng chứng", kind: "text", href: null, detail: null };
}

function orgTypeLabel(loai: string): string {
  if (loai === "co_so_dao_tao") return "Cơ sở đào tạo";
  if (loai === "truong_dai_hoc") return "Trường đại học";
  if (loai === "studio") return "Studio";
  return loai;
}

async function uploadEvidenceImage(file: File): Promise<string | null> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/post-image/upload", { method: "POST", body: form });
  const json = (await res.json()) as { url?: string; error?: string };
  if (!res.ok || !json.url) return null;
  return json.url;
}

const VISIBILITY_LABELS: Record<"public" | "theo_nhom" | "chi_minh", string> = {
  public: "Công khai",
  theo_nhom: "Theo nhóm",
  chi_minh: "Chỉ mình tôi",
};

export function MilestonePhraseComposer({
  ownerSlug,
  editCotMocId,
  onClose,
  onPublished,
}: Props) {
  const isEdit = Boolean(editCotMocId);
  const [editLoading, setEditLoading] = useState(isEdit);
  const [recipeId, setRecipeId] = useState<PhraseRecipeId>("bat_dau_hoc");
  const [step, setStep] = useState<ComposerStep>("phrase");
  const [values, setValues] = useState<MembershipMilestoneSlotValues>(() => ({
    thoi_diem: defaultMonthYear(),
  }));
  const [activeSlot, setActiveSlot] = useState<keyof MembershipMilestoneSlotValues>("hanh_dong");
  const [orgQuery, setOrgQuery] = useState("");
  const [orgHits, setOrgHits] = useState<MembershipMilestoneSearchHit[]>([]);
  const [orgLoading, setOrgLoading] = useState(false);
  const [attachOptions, setAttachOptions] = useState<OrgAttachOption[]>([]);
  const [attachLoading, setAttachLoading] = useState(false);
  const [customViTri, setCustomViTri] = useState(false);
  const [viTriDraft, setViTriDraft] = useState("");
  const [evidence, setEvidence] = useState<OrgAttachEvidence[]>([emptyEvidence()]);
  const [visibilityAfterVerify, setVisibilityAfterVerify] = useState<
    "public" | "theo_nhom" | "chi_minh"
  >("public");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evidenceUploading, setEvidenceUploading] = useState(false);
  const orgDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const recipe = useMemo(
    () => getEffectivePhraseRecipe(recipeId, values),
    [recipeId, values],
  );

  const assembledTitle = useMemo(
    () => assembleMilestoneTitle(recipe, values),
    [recipe, values],
  );

  const phraseComplete = useMemo(
    () => isRecipeComplete(recipe, values),
    [recipe, values],
  );

  const setSlot = useCallback(
    (key: keyof MembershipMilestoneSlotValues, next: MembershipMilestoneSlotValues[typeof key]) => {
      setValues((prev) => {
        const updated = { ...prev, [key]: next };
        for (const dep of dependentsOf(recipe, key)) {
          delete updated[dep];
        }
        return updated;
      });
      const order = recipe.slotOrder;
      const idx = order.indexOf(key);
      if (idx >= 0 && idx < order.length - 1) {
        setActiveSlot(order[idx + 1]!);
      }
    },
    [recipe],
  );

  const switchRecipe = useCallback((id: PhraseRecipeId) => {
    setRecipeId(id);
    setValues({ thoi_diem: defaultMonthYear() });
    setActiveSlot("hanh_dong");
    setOrgQuery("");
    setOrgHits([]);
    setAttachOptions([]);
    setCustomViTri(false);
    setViTriDraft("");
    setStep("phrase");
    setError(null);
  }, []);

  useEffect(() => {
    if (!editCotMocId) return;
    let cancelled = false;
    setEditLoading(true);
    setError(null);
    void fetch(
      `/api/journey/${encodeURIComponent(ownerSlug)}/membership-milestone/${encodeURIComponent(editCotMocId)}`,
    )
      .then(async (res) => {
        if (!res.ok) {
          const json = (await res.json()) as { error?: string };
          throw new Error(json.error ?? "Không tải được yêu cầu.");
        }
        return res.json() as Promise<{
          recipeId: PhraseRecipeId;
          slots: MembershipMilestoneSlotValues;
          evidence: OrgAttachEvidence[];
          visibilityAfterVerify: "public" | "theo_nhom" | "chi_minh";
        }>;
      })
      .then((data) => {
        if (cancelled) return;
        if (MILESTONE_PHRASE_RECIPES[data.recipeId]) {
          setRecipeId(data.recipeId);
        }
        setValues({
          ...data.slots,
          thoi_diem: data.slots.thoi_diem ?? defaultMonthYear(),
        });
        setEvidence(
          data.evidence?.length ? data.evidence : [emptyEvidence()],
        );
        setVisibilityAfterVerify(data.visibilityAfterVerify ?? "public");
        setStep("phrase");
        setEditLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Không tải được yêu cầu.");
        setEditLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [editCotMocId, ownerSlug]);

  useEffect(() => {
    if (isEdit) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY(ownerSlug));
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        recipeId?: PhraseRecipeId;
        values?: MembershipMilestoneSlotValues;
      };
      if (parsed.recipeId && MILESTONE_PHRASE_RECIPES[parsed.recipeId]) {
        setRecipeId(parsed.recipeId);
      }
      if (parsed.values) {
        setValues({ ...parsed.values, thoi_diem: parsed.values.thoi_diem ?? defaultMonthYear() });
      }
    } catch {
      /* ignore */
    }
  }, [ownerSlug, isEdit]);

  useEffect(() => {
    if (isEdit) return;
    try {
      localStorage.setItem(
        DRAFT_KEY(ownerSlug),
        JSON.stringify({ recipeId, values }),
      );
    } catch {
      /* ignore */
    }
  }, [ownerSlug, recipeId, values, isEdit]);

  useEffect(() => {
    if (activeSlot !== "to_chuc") return;
    if (orgDebounceRef.current) clearTimeout(orgDebounceRef.current);
    orgDebounceRef.current = setTimeout(() => {
      void (async () => {
        setOrgLoading(true);
        try {
          const q = orgQuery.trim() || "a";
          const res = await fetch(
            `/api/journey/${encodeURIComponent(ownerSlug)}/membership-milestone?recipe=${encodeURIComponent(recipeId)}&q=${encodeURIComponent(q)}`,
          );
          const json = (await res.json()) as { orgs?: MembershipMilestoneSearchHit[] };
          setOrgHits(json.orgs ?? []);
        } catch {
          setOrgHits([]);
        } finally {
          setOrgLoading(false);
        }
      })();
    }, 300);
    return () => {
      if (orgDebounceRef.current) clearTimeout(orgDebounceRef.current);
    };
  }, [activeSlot, orgQuery, ownerSlug, recipeId]);

  useEffect(() => {
    const orgId = values.to_chuc?.id;
    if (!orgId || !recipe.slots.some((s) => s.key === "context" && s.input === "attach_option")) {
      setAttachOptions([]);
      return;
    }
    let cancelled = false;
    setAttachLoading(true);
    void fetch(`/api/orgs/${encodeURIComponent(orgId)}/attach-options`)
      .then(async (res) => {
        if (!res.ok) return { options: [] as OrgAttachOption[] };
        return res.json() as Promise<{ options: OrgAttachOption[] }>;
      })
      .then((data) => {
        if (!cancelled) setAttachOptions(data.options ?? []);
      })
      .catch(() => {
        if (!cancelled) setAttachOptions([]);
      })
      .finally(() => {
        if (!cancelled) setAttachLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [values.to_chuc?.id, recipe.slots]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    const payload = {
      recipeId,
      slots: values,
      evidence: evidence.filter(
        (e) => e.href?.trim() || e.detail?.trim() || e.label?.trim(),
      ),
      visibilityAfterVerify,
    };
    try {
      const url = isEdit
        ? `/api/journey/${encodeURIComponent(ownerSlug)}/membership-milestone/${encodeURIComponent(editCotMocId!)}`
        : `/api/journey/${encodeURIComponent(ownerSlug)}/membership-milestone`;
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? payload : { ownerSlug, ...payload }),
      });
      const json = (await res.json()) as {
        error?: string;
        cotMocId?: string;
        milestone?: ComposePublishedDetail["milestone"];
      };
      if (!res.ok) {
        setError(json.error ?? "Không gửi được yêu cầu.");
        return;
      }
      if (!isEdit) {
        localStorage.removeItem(DRAFT_KEY(ownerSlug));
      }
      onPublished({
        ownerSlug,
        cotMocId: json.cotMocId,
        milestone: json.milestone,
      });
    } catch {
      setError("Lỗi mạng. Thử lại sau.");
    } finally {
      setSubmitting(false);
    }
  };

  const stepIndex = step === "phrase" ? 1 : step === "evidence" ? 2 : 3;

  if (editLoading) {
    return (
      <div className="j-ms-compose">
        <header className="j-ms-compose-head">
          <button type="button" className="j-ms-compose-close" onClick={onClose} aria-label="Đóng">
            <X size={20} strokeWidth={2} aria-hidden />
          </button>
          <h2 className="j-ms-compose-title">Chỉnh sửa yêu cầu</h2>
        </header>
        <p className="j-ms-panel-hint j-ms-panel-hint--center">
          <Loader2 size={18} className="j-ms-spin" aria-hidden /> Đang tải…
        </p>
      </div>
    );
  }

  return (
    <div className="j-ms-compose">
      <header className="j-ms-compose-head">
        <button type="button" className="j-ms-compose-close" onClick={onClose} aria-label="Đóng">
          <X size={20} strokeWidth={2} aria-hidden />
        </button>
        <h2 className="j-ms-compose-title">
          {isEdit ? "Chỉnh sửa yêu cầu" : "Thêm cột mốc"}
        </h2>
        <span className="j-ms-compose-step">Bước {stepIndex} / 3</span>
      </header>

      {step === "phrase" ? (
        <>
          <div className="j-ms-categories" role="tablist" aria-label="Loại cột mốc">
            {PHRASE_CATEGORIES.map((cat) => {
              const Icon = CATEGORY_ICONS[cat.id];
              const active = recipeId === cat.recipeId;
              return (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`j-ms-category${active ? " is-active" : ""}`}
                  onClick={() => switchRecipe(cat.recipeId)}
                >
                  <Icon size={18} strokeWidth={1.8} aria-hidden />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          <div className="j-ms-sentence" aria-live="polite">
            <p className="j-ms-sentence-label">Cột mốc của bạn</p>
            <div className="j-ms-sentence-body">
              {recipe.fragments.map((frag, i) => {
                if (frag.kind === "text") {
                  return (
                    <span key={`t-${i}`} className="j-ms-sentence-text">
                      {frag.text}
                    </span>
                  );
                }
                const key = frag.key;
                const enabled = isSlotEnabled(recipe, key, values);
                const filled = Boolean(values[key]);
                const isActive = activeSlot === key && enabled;
                const display = filled
                  ? key === "to_chuc"
                    ? values.to_chuc!.ten
                    : key === "vi_tri"
                      ? values.vi_tri!.value
                      : key === "context"
                        ? values.context!.label
                        : key === "thoi_diem"
                          ? `${values.thoi_diem!.month}/${values.thoi_diem!.year}`
                          : key === "hanh_dong" || key === "vai_tro"
                            ? (values[key] as { label: string }).label
                            : slotPlaceholder(recipe, key, values)
                  : null;

                return (
                  <button
                    key={`s-${key}`}
                    type="button"
                    disabled={!enabled}
                    className={`j-ms-slot${filled ? " is-filled" : ""}${isActive ? " is-active" : ""}${!enabled ? " is-disabled" : ""}`}
                    onClick={() => enabled && setActiveSlot(key)}
                  >
                    {display ?? slotPlaceholder(recipe, key, values)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="j-ms-panel">
            <MilestoneSlotPanel
              recipe={recipe}
              activeSlot={activeSlot}
              values={values}
              orgQuery={orgQuery}
              orgHits={orgHits}
              orgLoading={orgLoading}
              attachOptions={attachOptions}
              attachLoading={attachLoading}
              customViTri={customViTri}
              viTriDraft={viTriDraft}
              onOrgQueryChange={setOrgQuery}
              onSetSlot={setSlot}
              onCustomViTri={() => setCustomViTri(true)}
              onViTriDraftChange={setViTriDraft}
              onConfirmCustomViTri={() => {
                const v = viTriDraft.trim();
                if (!v) return;
                setSlot("vi_tri", { value: v });
                setCustomViTri(false);
              }}
            />
          </div>

          <footer className="j-ms-compose-foot">
            <button
              type="button"
              className="j-ms-btn j-ms-btn--primary"
              disabled={!phraseComplete}
              onClick={() => setStep("evidence")}
            >
              Tiếp theo
            </button>
          </footer>
        </>
      ) : null}

      {step === "evidence" ? (
        <>
          <div className="j-ms-preview-card">
            <p className="j-ms-preview-title">{assembledTitle}</p>
            <p className="j-ms-preview-meta">{recipe.evidenceHint}</p>
          </div>

          <div className="j-ms-evidence">
            <h3 className="j-ms-evidence-heading">
              Bằng chứng để {values.to_chuc?.ten ?? "tổ chức"} duyệt
            </h3>
            {evidence.map((row, index) => (
              <div key={index} className="j-ms-evidence-row">
                <label className="j-ms-evidence-type">
                  <span>Loại</span>
                  <select
                    value={row.kind}
                    onChange={(e) => {
                      const kind = e.target.value as OrgAttachEvidence["kind"];
                      setEvidence((prev) =>
                        prev.map((r, i) =>
                          i === index ? { ...r, kind, href: null, detail: null } : r,
                        ),
                      );
                    }}
                  >
                    <option value="text">Ghi chú</option>
                    <option value="link">Link</option>
                    <option value="file">Ảnh</option>
                  </select>
                </label>
                {row.kind === "link" ? (
                  <input
                    type="url"
                    placeholder="https://…"
                    value={row.href ?? ""}
                    onChange={(e) =>
                      setEvidence((prev) =>
                        prev.map((r, i) =>
                          i === index ? { ...r, href: e.target.value, label: "Link" } : r,
                        ),
                      )
                    }
                  />
                ) : row.kind === "file" ? (
                  <div className="j-ms-evidence-file">
                    {row.href ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={row.href} alt="" className="j-ms-evidence-thumb" />
                    ) : (
                      <label className="j-ms-evidence-upload">
                        <ImagePlus size={18} aria-hidden />
                        <span>{evidenceUploading ? "Đang tải…" : "Chọn ảnh"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={evidenceUploading}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setEvidenceUploading(true);
                            void uploadEvidenceImage(file)
                              .then((url) => {
                                if (!url) {
                                  setError("Không upload được ảnh.");
                                  return;
                                }
                                setEvidence((prev) =>
                                  prev.map((r, i) =>
                                    i === index
                                      ? { ...r, href: url, label: "Ảnh bằng chứng" }
                                      : r,
                                  ),
                                );
                              })
                              .finally(() => setEvidenceUploading(false));
                            e.target.value = "";
                          }}
                        />
                      </label>
                    )}
                  </div>
                ) : (
                  <textarea
                    rows={2}
                    placeholder="Mô tả ngắn bằng chứng…"
                    value={row.detail ?? ""}
                    onChange={(e) =>
                      setEvidence((prev) =>
                        prev.map((r, i) =>
                          i === index
                            ? { ...r, detail: e.target.value, label: "Ghi chú" }
                            : r,
                        ),
                      )
                    }
                  />
                )}
              </div>
            ))}
            <button
              type="button"
              className="j-ms-evidence-add"
              onClick={() => setEvidence((prev) => [...prev, emptyEvidence()])}
            >
              + Thêm mục bằng chứng
            </button>
          </div>

          <fieldset className="j-ms-visibility">
            <legend>Hiển thị sau khi duyệt</legend>
            <p className="j-ms-vis-hint">
              <Lock size={13} strokeWidth={2.2} aria-hidden />
              Trong lúc chờ, cột mốc chỉ hiện trên Journey của bạn.
            </p>
            {(
              [
                ["public", VISIBILITY_LABELS.public],
                ["theo_nhom", VISIBILITY_LABELS.theo_nhom],
                ["chi_minh", VISIBILITY_LABELS.chi_minh],
              ] as const
            ).map(([val, label]) => (
              <label key={val} className="j-ms-vis-option">
                <input
                  type="radio"
                  name="ms-vis"
                  checked={visibilityAfterVerify === val}
                  onChange={() => setVisibilityAfterVerify(val)}
                />
                {label}
              </label>
            ))}
          </fieldset>

          <footer className="j-ms-compose-foot">
            <button type="button" className="j-ms-btn j-ms-btn--ghost" onClick={() => setStep("phrase")}>
              <ChevronLeft size={16} aria-hidden />
              Quay lại
            </button>
            <button
              type="button"
              className="j-ms-btn j-ms-btn--primary"
              onClick={() => setStep("confirm")}
            >
              Tiếp theo
            </button>
          </footer>
        </>
      ) : null}

      {step === "confirm" ? (
        <>
          <div className="j-ms-confirm-card j-ms-confirm-card--verify">
            <div className="j-ms-confirm-top">
              <div className="j-ms-confirm-badge">
                <ShieldCheck size={18} strokeWidth={2.2} aria-hidden />
                <span>Yêu cầu xác thực cột mốc</span>
              </div>
              <div className="j-ms-confirm-status">
                <Clock3 size={14} strokeWidth={2.2} aria-hidden />
                Chờ duyệt
              </div>
            </div>

            <div className="j-ms-confirm-org">
              {values.to_chuc?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={values.to_chuc.avatarUrl} alt="" className="j-ms-confirm-org-ava" />
              ) : (
                <span className="j-ms-confirm-org-ava j-ms-confirm-org-ava--empty">
                  {(values.to_chuc?.ten?.charAt(0) ?? "?").toUpperCase()}
                </span>
              )}
              <div className="j-ms-confirm-org-text">
                <span className="j-ms-confirm-label">Gửi tới</span>
                <strong>{values.to_chuc?.ten}</strong>
                <span className="j-ms-confirm-org-type">
                  {orgTypeLabel(values.to_chuc?.loaiToChuc ?? "")}
                </span>
              </div>
            </div>

            <p className="j-ms-confirm-title">{assembledTitle}</p>

            <ul className="j-ms-confirm-meta">
              <li>
                <Lock size={13} strokeWidth={2.2} aria-hidden />
                Chỉ bạn thấy trên Journey cho đến khi được duyệt
              </li>
              <li>
                Sau duyệt: {VISIBILITY_LABELS[visibilityAfterVerify]}
              </li>
            </ul>

            <p className="j-ms-confirm-note">
              Tổ chức sẽ xem bằng chứng và bấm duyệt. Đây là cột mốc danh tính — được gắn
              dấu xác thực khi org chấp nhận.
            </p>
          </div>

          {error ? <p className="j-ms-error">{error}</p> : null}

          <footer className="j-ms-compose-foot">
            <button type="button" className="j-ms-btn j-ms-btn--ghost" onClick={() => setStep("evidence")}>
              <ChevronLeft size={16} aria-hidden />
              Quay lại
            </button>
            <button
              type="button"
              className="j-ms-btn j-ms-btn--primary"
              disabled={submitting}
              onClick={() => void handleSubmit()}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="j-ms-spin" aria-hidden />
                  Đang gửi…
                </>
              ) : isEdit ? (
                "Lưu thay đổi"
              ) : (
                "Gửi yêu cầu xác thực"
              )}
            </button>
          </footer>
        </>
      ) : null}
    </div>
  );
}

type PanelProps = {
  recipe: PhraseRecipe;
  activeSlot: keyof MembershipMilestoneSlotValues;
  values: MembershipMilestoneSlotValues;
  orgQuery: string;
  orgHits: MembershipMilestoneSearchHit[];
  orgLoading: boolean;
  attachOptions: OrgAttachOption[];
  attachLoading: boolean;
  customViTri: boolean;
  viTriDraft: string;
  onOrgQueryChange: (q: string) => void;
  onSetSlot: (key: keyof MembershipMilestoneSlotValues, value: MembershipMilestoneSlotValues[keyof MembershipMilestoneSlotValues]) => void;
  onCustomViTri: () => void;
  onViTriDraftChange: (v: string) => void;
  onConfirmCustomViTri: () => void;
};

function MilestoneSlotPanel({
  recipe,
  activeSlot,
  values,
  orgQuery,
  orgHits,
  orgLoading,
  attachOptions,
  attachLoading,
  customViTri,
  viTriDraft,
  onOrgQueryChange,
  onSetSlot,
  onCustomViTri,
  onViTriDraftChange,
  onConfirmCustomViTri,
}: PanelProps) {
  const slotDef = recipe.slots.find((s) => s.key === activeSlot);
  if (!slotDef || !isSlotEnabled(recipe, activeSlot, values)) {
    return (
      <p className="j-ms-panel-hint">
        Chọn từng mảnh trên câu theo thứ tự — ô tiếp theo sẽ sáng lên sau khi bạn chọn xong.
      </p>
    );
  }

  if (slotDef.input === "enum" && slotDef.enumOptions) {
    return (
      <ul className="j-ms-option-list">
        {slotDef.enumOptions.map((opt) => {
          const selected =
            activeSlot === "hanh_dong"
              ? values.hanh_dong?.value === opt.value
              : activeSlot === "vai_tro"
                ? values.vai_tro?.value === opt.value
                : false;
          return (
          <li key={opt.value}>
            <button
              type="button"
              className={`j-ms-option${selected ? " is-selected" : ""}`}
              onClick={() =>
                onSetSlot(activeSlot, { value: opt.value, label: opt.label })
              }
            >
              {opt.label}
            </button>
          </li>
          );
        })}
      </ul>
    );
  }

  if (slotDef.input === "org_search") {
    return (
      <div className="j-ms-org-search">
        <div className="j-ms-org-search-field">
          <Search size={16} aria-hidden />
          <input
            type="search"
            placeholder="Tìm tổ chức…"
            value={orgQuery}
            onChange={(e) => onOrgQueryChange(e.target.value)}
            autoFocus
          />
        </div>
        {orgLoading ? (
          <p className="j-ms-panel-hint">
            <Loader2 size={14} className="j-ms-spin" aria-hidden /> Đang tìm…
          </p>
        ) : (
          <ul className="j-ms-org-list">
            {orgHits.map((org) => (
              <li key={org.id}>
                <button
                  type="button"
                  className="j-ms-org-hit"
                  onClick={() =>
                    onSetSlot("to_chuc", {
                      id: org.id,
                      ten: org.ten,
                      slug: org.slug,
                      loaiToChuc: org.loaiToChuc,
                      avatarUrl: org.avatarUrl,
                    })
                  }
                >
                  {org.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={org.avatarUrl} alt="" className="j-ms-org-hit-ava" />
                  ) : (
                    <span className="j-ms-org-hit-ava j-ms-org-hit-ava--empty" />
                  )}
                  <span className="j-ms-org-hit-body">
                    <strong>{org.ten}</strong>
                    <span>{orgTypeLabel(org.loaiToChuc)}</span>
                  </span>
                </button>
              </li>
            ))}
            {!orgLoading && orgHits.length === 0 ? (
              <li className="j-ms-panel-hint">Không thấy tổ chức — thử từ khóa khác.</li>
            ) : null}
          </ul>
        )}
      </div>
    );
  }

  if (slotDef.input === "attach_option") {
    if (attachLoading) {
      return (
        <p className="j-ms-panel-hint">
          <Loader2 size={14} className="j-ms-spin" aria-hidden /> Đang tải danh sách…
        </p>
      );
    }
    if (attachOptions.length === 0) {
      return (
        <p className="j-ms-panel-hint">
          Tổ chức chưa có {values.to_chuc?.loaiToChuc === "truong_dai_hoc" ? "ngành" : "khóa"} trên CINs.
        </p>
      );
    }
    return (
      <ul className="j-ms-option-list">
        {attachOptions.map((opt) => (
          <li key={opt.id}>
            <button
              type="button"
              className={`j-ms-option${values.context?.id === opt.id ? " is-selected" : ""}`}
              onClick={() => onSetSlot("context", { id: opt.id, label: opt.label })}
            >
              {opt.label}
            </button>
          </li>
        ))}
      </ul>
    );
  }

  if (slotDef.input === "role_text") {
    if (customViTri) {
      return (
        <div className="j-ms-vitri-custom">
          <input
            type="text"
            maxLength={80}
            placeholder="Nhập vị trí…"
            value={viTriDraft}
            onChange={(e) => onViTriDraftChange(e.target.value)}
            autoFocus
          />
          <button type="button" className="j-ms-btn j-ms-btn--primary j-ms-btn--sm" onClick={onConfirmCustomViTri}>
            Xong
          </button>
        </div>
      );
    }
    return (
      <ul className="j-ms-option-list">
        {VITRI_SUGGESTIONS.map((label) => (
          <li key={label}>
            <button
              type="button"
              className={`j-ms-option${values.vi_tri?.value === label ? " is-selected" : ""}`}
              onClick={() => onSetSlot("vi_tri", { value: label })}
            >
              {label}
            </button>
          </li>
        ))}
        <li>
          <button type="button" className="j-ms-option j-ms-option--muted" onClick={onCustomViTri}>
            Khác…
          </button>
        </li>
      </ul>
    );
  }

  if (slotDef.input === "month_year") {
    const my = values.thoi_diem ?? defaultMonthYear();
    const monthYear = my;
    return (
      <div className="j-ms-month-year">
        <label>
          <span>Tháng</span>
          <select
            value={monthYear.month}
            onChange={(e) =>
              onSetSlot("thoi_diem", {
                month: Number(e.target.value),
                year: monthYear.year,
              })
            }
          >
            {MONTHS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Năm</span>
          <select
            value={monthYear.year}
            onChange={(e) =>
              onSetSlot("thoi_diem", {
                month: monthYear.month,
                year: Number(e.target.value),
              })
            }
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="j-ms-btn j-ms-btn--primary j-ms-btn--sm"
          onClick={() => onSetSlot("thoi_diem", monthYear)}
        >
          Xong
        </button>
      </div>
    );
  }

  return null;
}
