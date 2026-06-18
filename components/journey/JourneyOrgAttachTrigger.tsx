"use client";

import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  ImagePlus,
  Link2Off,
  Plus,
  Search,
  Trash2,
  Users,
  X,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type {
  OrgAttachEvidence,
  OrgAttachOption,
  OrgMilestoneTagOwnerItem,
  OrgMilestoneTagStatus,
  OrgSearchHit,
} from "@/lib/journey/org-milestone-tag-types";
import {
  formatTaggedAt,
  notifyStatusLabel,
} from "@/lib/truong/milestone-tag-notify-mock";
import { truongRootPath } from "@/lib/truong/truong-routes";

const ORG_TAG_CHANGED = "journey-org-tag-changed";

export function dispatchJourneyOrgTagChanged(cotMocId: string) {
  window.dispatchEvent(
    new CustomEvent(ORG_TAG_CHANGED, { detail: { cotMocId } }),
  );
}

type Props = {
  tacPhamId: string;
  cotMocId: string;
  milestoneTitle: string;
  milestoneKind: string;
  ownerSlug: string;
  postSlug?: string | null;
  coverSrc?: string | null;
  coverAlt?: string | null;
  photoCount?: number | null;
  bodyExcerpt?: string | null;
};

type Step = "search" | "context" | "evidence" | "status";

const STEPS: { id: Step; label: string }[] = [
  { id: "search", label: "Tổ chức" },
  { id: "context", label: "Học tập" },
  { id: "evidence", label: "Bằng chứng" },
  { id: "status", label: "Trạng thái" },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - 1989 }, (_, i) => CURRENT_YEAR + 1 - i);

function orgTypeLabel(loai: OrgSearchHit["loaiToChuc"]): string {
  return loai === "co_so_dao_tao" ? "Cơ sở đào tạo" : "Trường đại học";
}

function ownerItemToOrgHit(item: OrgMilestoneTagOwnerItem): OrgSearchHit {
  return {
    id: item.orgId,
    ten: item.orgTen,
    slug: item.orgSlug,
    loaiToChuc: item.orgLoai,
    avatarUrl: item.orgAvatarUrl,
    dangTheoDoi: false,
  };
}

function OrgAttachEvidenceReadOnly({ rows }: { rows: OrgAttachEvidence[] }) {
  if (rows.length === 0) return null;
  return (
    <ul className="j-org-attach-evidence-readonly">
      {rows.map((row, index) => (
        <li key={`${row.label}-${index}`} className="j-org-attach-evidence-readonly-item">
          <strong>{row.label}</strong>
          {row.kind === "file" && row.href ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={row.href} alt={row.label} className="j-org-attach-evidence-readonly-img" />
          ) : row.href ? (
            <a href={row.href} target="_blank" rel="noopener noreferrer">
              {row.href}
            </a>
          ) : row.detail ? (
            <span>{row.detail}</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function emptyEvidence(): OrgAttachEvidence {
  return { label: "", kind: "text", href: null, detail: null };
}

function imageFileFromClipboard(data: DataTransfer | null): File | null {
  if (!data) return null;
  const fromFiles = data.files?.[0];
  if (fromFiles?.type.startsWith("image/")) return fromFiles;
  for (const entry of data.items) {
    if (entry.type.startsWith("image/")) {
      const file = entry.getAsFile();
      if (file) return file;
    }
  }
  return null;
}

async function uploadEvidenceImage(
  file: File,
): Promise<{ url: string; imageId: string } | null> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/post-image/upload", { method: "POST", body: form });
  const json = (await res.json()) as {
    url?: string;
    imageId?: string;
    error?: string;
  };
  if (!res.ok || !json.url || !json.imageId) return null;
  return { url: json.url, imageId: json.imageId };
}

function OrgAttachEvidenceImageField({
  row,
  isActive,
  uploading,
  onActivate,
  onUploadStart,
  onUploaded,
  onClear,
  onUploadError,
}: {
  row: OrgAttachEvidence;
  isActive: boolean;
  uploading: boolean;
  onActivate: () => void;
  onUploadStart: () => void;
  onUploaded: (url: string, imageId: string) => void;
  onClear: () => void;
  onUploadError: (msg: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasImage = row.kind === "file" && Boolean(row.href);

  const handleFile = useCallback(
    async (file: File | null) => {
      if (!file || uploading) return;
      onActivate();
      onUploadStart();
      const uploaded = await uploadEvidenceImage(file);
      if (!uploaded) {
        onUploadError("Không upload được ảnh (tối đa 8MB).");
        return;
      }
      onUploaded(uploaded.url, uploaded.imageId);
    },
    [onActivate, onUploadError, onUploaded, onUploadStart, uploading],
  );

  return (
    <div className="j-org-attach-field j-org-attach-field--compact">
      <span>Ảnh bằng chứng (tuỳ chọn)</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="j-org-attach-evidence-file-input"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          void handleFile(file);
          e.target.value = "";
        }}
      />
      {hasImage ? (
        <div className="j-org-attach-evidence-preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={row.href!} alt={row.label || "Bằng chứng"} />
          <div className="j-org-attach-evidence-preview-actions">
            <button
              type="button"
              className="j-org-attach-link-btn"
              onClick={() => inputRef.current?.click()}
            >
              Đổi ảnh
            </button>
            <button type="button" className="j-org-attach-link-btn" onClick={onClear}>
              Xóa ảnh
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className={`j-org-attach-evidence-drop${isActive ? " is-active" : ""}${uploading ? " is-busy" : ""}`}
          onClick={() => {
            onActivate();
            inputRef.current?.click();
          }}
          onFocus={onActivate}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <span className="j-org-attach-spinner" aria-hidden />
              Đang tải ảnh…
            </>
          ) : (
            <>
              <ImagePlus size={18} strokeWidth={2} aria-hidden />
              <span>Chọn ảnh hoặc dán (Ctrl+V)</span>
            </>
          )}
        </button>
      )}
      {!hasImage && isActive && !uploading ? (
        <p className="j-org-attach-evidence-paste-hint">
          Ô này đang nhận ảnh — dán từ clipboard hoặc chọn file.
        </p>
      ) : null}
    </div>
  );
}

function orgPublicPath(
  loai: OrgMilestoneTagOwnerItem["orgLoai"],
  slug: string,
): string {
  if (loai === "co_so_dao_tao") return `/co-so/${encodeURIComponent(slug)}`;
  return truongRootPath(slug);
}

function statusIcon(status: OrgMilestoneTagStatus) {
  switch (status) {
    case "approved":
      return <CheckCircle2 size={14} strokeWidth={2.4} aria-hidden />;
    case "rejected":
      return <XCircle size={14} strokeWidth={2.4} aria-hidden />;
    case "detached":
      return <Link2Off size={14} strokeWidth={2.4} aria-hidden />;
    default:
      return <Clock3 size={14} strokeWidth={2.4} aria-hidden />;
  }
}

function OrgAttachOrgAvatar({
  loai,
  avatarUrl,
}: {
  loai: OrgMilestoneTagOwnerItem["orgLoai"];
  avatarUrl: string | null;
}) {
  return (
    <span className="j-org-attach-status-org-icon" aria-hidden>
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" className="j-org-attach-org-avatar-img" />
      ) : loai === "co_so_dao_tao" ? (
        <Building2 size={16} strokeWidth={2} />
      ) : (
        <Users size={16} strokeWidth={2} />
      )}
    </span>
  );
}

function OrgAttachStatusRow({
  row,
  selected,
  onSelect,
}: {
  row: OrgMilestoneTagOwnerItem;
  selected: boolean;
  onSelect: () => void;
}) {
  const contextLabel = row.nganhLabel ?? row.khoaHocTen;
  const orgHref = orgPublicPath(row.orgLoai, row.orgSlug);

  return (
    <li
      className={`j-org-attach-status-card j-org-attach-status-card--${row.status}${selected ? " is-selected" : ""}`}
    >
      <button type="button" className="j-org-attach-status-card-btn" onClick={onSelect}>
        <header className="j-org-attach-status-card-hdr">
          <OrgAttachOrgAvatar loai={row.orgLoai} avatarUrl={row.orgAvatarUrl} />
          <div className="j-org-attach-status-card-meta">
            <strong>{row.orgTen}</strong>
            <small>{orgTypeLabel(row.orgLoai)}</small>
          </div>
          <span
            className={`j-org-attach-status-badge j-org-attach-status-badge--${row.status}`}
          >
            {statusIcon(row.status)}
            {notifyStatusLabel(row.status)}
          </span>
        </header>
        <dl className="j-org-attach-status-details">
          {contextLabel ? (
            <div className="j-org-attach-status-detail">
              <dt>{row.orgLoai === "co_so_dao_tao" ? "Khóa học" : "Ngành"}</dt>
              <dd>{contextLabel}</dd>
            </div>
          ) : null}
          <div className="j-org-attach-status-detail">
            <dt>Năm</dt>
            <dd>{row.nam}</dd>
          </div>
          <div className="j-org-attach-status-detail">
            <dt>Gửi lúc</dt>
            <dd>{formatTaggedAt(row.submittedAt)}</dd>
          </div>
          {row.reviewedAt ? (
            <div className="j-org-attach-status-detail">
              <dt>Xử lý lúc</dt>
              <dd>{formatTaggedAt(row.reviewedAt)}</dd>
            </div>
          ) : null}
        </dl>
      </button>
      {row.evidence.length > 0 ? (
        <div className="j-org-attach-status-evidence">
          <h4>Bằng chứng</h4>
          <OrgAttachEvidenceReadOnly rows={row.evidence} />
        </div>
      ) : null}
      {row.status === "approved" ? (
        <Link href={orgHref} className="j-org-attach-status-org-link">
          Xem trên trang tổ chức
          <ExternalLink size={13} strokeWidth={2.2} aria-hidden />
        </Link>
      ) : row.status === "pending" ? (
        <p className="j-org-attach-status-note">
          Tổ chức đang xem bằng chứng và sẽ phản hồi qua mục Thông báo của họ.
        </p>
      ) : (
        <p className="j-org-attach-status-note">
          Yêu cầu không được chấp nhận. Bạn có thể gửi lại với bằng chứng khác.
        </p>
      )}
    </li>
  );
}

function stepIndex(step: Step): number {
  return STEPS.findIndex((s) => s.id === step);
}

function OrgAttachStepper({
  step,
  hasStatusItems,
  canReviewSteps,
  onStepClick,
}: {
  step: Step;
  hasStatusItems: boolean;
  canReviewSteps: boolean;
  onStepClick: (step: Step) => void;
}) {
  const active = stepIndex(step);
  return (
    <ol className="j-org-attach-steps" aria-label="Tiến trình gắn tổ chức">
      {STEPS.map((item, index) => {
        const state =
          index < active
            ? "done"
            : index === active
              ? "active"
              : "todo";
        const clickable =
          (item.id === "status" && hasStatusItems) ||
          (canReviewSteps && item.id !== "status");
        const content = (
          <>
            <span className="j-org-attach-step-dot" aria-hidden>
              {state === "done" ? (
                <CheckCircle2 size={14} strokeWidth={2.4} />
              ) : (
                index + 1
              )}
            </span>
            <span className="j-org-attach-step-label">{item.label}</span>
          </>
        );
        return (
          <li
            key={item.id}
            className={`j-org-attach-step j-org-attach-step--${state}${clickable ? " j-org-attach-step--clickable" : ""}`}
            aria-current={state === "active" ? "step" : undefined}
          >
            {clickable ? (
              <button
                type="button"
                className="j-org-attach-step-btn"
                onClick={() => onStepClick(item.id)}
                aria-label={`Xem bước ${item.label}`}
              >
                {content}
              </button>
            ) : (
              content
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function JourneyOrgAttachTrigger({
  tacPhamId,
  cotMocId,
  milestoneTitle,
  milestoneKind,
  ownerSlug,
  postSlug,
  coverSrc,
  coverAlt,
  photoCount,
  bodyExcerpt,
}: Props) {
  const headingId = useId();
  const searchAbort = useRef<AbortController | null>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [statusItems, setStatusItems] = useState<OrgMilestoneTagOwnerItem[]>([]);
  const [step, setStep] = useState<Step>("search");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [orgs, setOrgs] = useState<OrgSearchHit[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<OrgSearchHit | null>(null);
  const [options, setOptions] = useState<OrgAttachOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState("");
  const [nam, setNam] = useState(String(CURRENT_YEAR));
  const [evidence, setEvidence] = useState<OrgAttachEvidence[]>([emptyEvidence()]);
  const [activeEvidenceIndex, setActiveEvidenceIndex] = useState(0);
  const [uploadingEvidenceIndex, setUploadingEvidenceIndex] = useState<number | null>(
    null,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [submitNotice, setSubmitNotice] = useState<string | null>(null);
  const [reviewItem, setReviewItem] = useState<OrgMilestoneTagOwnerItem | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);

  const isReviewing = reviewItem !== null && !creatingNew;

  const albumHref = useMemo(() => {
    if (postSlug?.trim()) return `/${ownerSlug}/p/${postSlug.trim()}`;
    return `/${ownerSlug}`;
  }, [ownerSlug, postSlug]);

  const selectedOptionLabel = useMemo(
    () => options.find((o) => o.id === selectedOptionId)?.label ?? null,
    [options, selectedOptionId],
  );

  const pendingCount = useMemo(
    () => statusItems.filter((item) => item.status === "pending").length,
    [statusItems],
  );

  const loadStatusItems = useCallback(async (): Promise<OrgMilestoneTagOwnerItem[]> => {
    setStatusLoading(true);
    try {
      const res = await fetch(`/api/milestone/${cotMocId}/org-tag`, {
        cache: "no-store",
      });
      const json = (await res.json()) as {
        items?: OrgMilestoneTagOwnerItem[];
      };
      if (!res.ok) {
        setStatusItems([]);
        return [];
      }
      const items = Array.isArray(json.items) ? json.items : [];
      setStatusItems(items);
      return items;
    } catch {
      setStatusItems([]);
      return [];
    } finally {
      setStatusLoading(false);
    }
  }, [cotMocId]);

  const hydrateFromRequest = useCallback((item: OrgMilestoneTagOwnerItem) => {
    setSelectedOrg(ownerItemToOrgHit(item));
    setNam(String(item.nam));
    setEvidence(item.evidence.length > 0 ? item.evidence : [emptyEvidence()]);
    const contextLabel = item.nganhLabel ?? item.khoaHocTen;
    const contextId = item.nganhId ?? item.khoaHocId;
    if (contextLabel && contextId) {
      setOptions([{ id: contextId, label: contextLabel }]);
      setSelectedOptionId(contextId);
    } else if (contextLabel) {
      setOptions([{ id: contextLabel, label: contextLabel }]);
      setSelectedOptionId(contextLabel);
    } else {
      setOptions([]);
      setSelectedOptionId("");
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  useEffect(() => {
    void loadStatusItems();
  }, [loadStatusItems]);

  useEffect(() => {
    if (!open || step !== "status") return;
    void loadStatusItems();
  }, [loadStatusItems, open, step]);

  useEffect(() => {
    const onChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ cotMocId?: string }>).detail;
      if (detail?.cotMocId && detail.cotMocId !== cotMocId) return;
      void loadStatusItems();
    };
    window.addEventListener(ORG_TAG_CHANGED, onChanged);
    return () => window.removeEventListener(ORG_TAG_CHANGED, onChanged);
  }, [cotMocId, loadStatusItems]);

  const resetWizard = useCallback(() => {
    searchAbort.current?.abort();
    setQuery("");
    setOrgs([]);
    setSelectedOrg(null);
    setOptions([]);
    setSelectedOptionId("");
    setNam(String(CURRENT_YEAR));
    setEvidence([emptyEvidence()]);
    setActiveEvidenceIndex(0);
    setUploadingEvidenceIndex(null);
    setMessage(null);
    setSubmitting(false);
    setSubmitNotice(null);
  }, []);

  const resetAll = useCallback(() => {
    resetWizard();
    setStep("search");
    setReviewItem(null);
    setCreatingNew(false);
  }, [resetWizard]);

  const goToStatus = useCallback(() => {
    setStep("status");
    void loadStatusItems();
  }, [loadStatusItems]);

  const handleStepClick = useCallback(
    (target: Step) => {
      if (target === "status") {
        if (statusItems.length === 0) return;
        goToStatus();
        return;
      }
      if (!reviewItem) return;
      hydrateFromRequest(reviewItem);
      setStep(target);
    },
    [goToStatus, hydrateFromRequest, reviewItem, statusItems.length],
  );

  const close = useCallback(() => {
    setOpen(false);
    resetAll();
  }, [resetAll]);

  const selectReviewItem = useCallback(
    (item: OrgMilestoneTagOwnerItem) => {
      setReviewItem(item);
      setCreatingNew(false);
      hydrateFromRequest(item);
    },
    [hydrateFromRequest],
  );

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  useEffect(() => {
    if (!open || step !== "search") return;
    const q = query.trim();
    if (q.length < 1) {
      setOrgs([]);
      return;
    }

    searchAbort.current?.abort();
    const controller = new AbortController();
    searchAbort.current = controller;
    setSearching(true);

    const timer = window.setTimeout(() => {
      void fetch(`/api/orgs/search?q=${encodeURIComponent(q)}`, {
        signal: controller.signal,
      })
        .then((res) => res.json())
        .then((json: { orgs?: OrgSearchHit[] }) => {
          if (controller.signal.aborted) return;
          setOrgs(Array.isArray(json.orgs) ? json.orgs : []);
        })
        .catch(() => {
          if (!controller.signal.aborted) setOrgs([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false);
        });
    }, 280);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, step, query]);

  useEffect(() => {
    if (!open || step !== "evidence" || uploadingEvidenceIndex !== null) return;

    const onPaste = (e: ClipboardEvent) => {
      const file = imageFileFromClipboard(e.clipboardData);
      if (!file) return;
      e.preventDefault();
      const index = activeEvidenceIndex;
      setUploadingEvidenceIndex(index);
      void uploadEvidenceImage(file)
        .then((uploaded) => {
          if (!uploaded) {
            setMessage("Không upload được ảnh (tối đa 8MB).");
            return;
          }
          setEvidence((prev) => {
            const next = [...prev];
            const row = next[index];
            if (!row) return prev;
            next[index] = {
              ...row,
              kind: "file",
              href: uploaded.url,
              detail: uploaded.imageId,
            };
            return next;
          });
          setMessage(null);
        })
        .finally(() => setUploadingEvidenceIndex(null));
    };

    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [activeEvidenceIndex, open, step, uploadingEvidenceIndex]);

  const applyEvidenceImage = useCallback(
    (index: number, url: string, imageId: string) => {
      setEvidence((prev) => {
        const next = [...prev];
        const row = next[index];
        if (!row) return prev;
        next[index] = { ...row, kind: "file", href: url, detail: imageId };
        return next;
      });
      setMessage(null);
    },
    [],
  );

  const clearEvidenceImage = useCallback((index: number) => {
    setEvidence((prev) => {
      const next = [...prev];
      const row = next[index];
      if (!row) return prev;
      next[index] = { ...row, kind: "text", href: null, detail: null };
      return next;
    });
  }, []);

  const pickOrg = useCallback(async (org: OrgSearchHit) => {
    setSelectedOrg(org);
    setMessage(null);
    setLoadingOptions(true);
    setStep("context");
    try {
      const res = await fetch(`/api/orgs/${org.id}/attach-options`);
      const json = (await res.json()) as {
        options?: OrgAttachOption[];
        error?: string;
      };
      if (!res.ok) {
        setMessage(json.error ?? "Không tải được danh sách.");
        setOptions([]);
        return;
      }
      setOptions(Array.isArray(json.options) ? json.options : []);
      setSelectedOptionId("");
    } catch {
      setMessage("Lỗi mạng.");
      setOptions([]);
    } finally {
      setLoadingOptions(false);
    }
  }, []);

  const goEvidence = useCallback(() => {
    if (!selectedOrg) return;
    if (!selectedOptionId) {
      setMessage(
        selectedOrg.loaiToChuc === "co_so_dao_tao"
          ? "Chọn khóa học."
          : "Chọn ngành / chương trình.",
      );
      return;
    }
    setMessage(null);
    setStep("evidence");
  }, [selectedOrg, selectedOptionId]);

  const submit = useCallback(async () => {
    if (!selectedOrg) return;
    const cleaned = evidence
      .map((row) => ({
        ...row,
        label: row.label.trim(),
        href: row.href?.trim() || null,
        detail: row.detail?.trim() || null,
      }))
      .filter((row) => row.label.length > 0);

    if (cleaned.length === 0) {
      setMessage("Thêm ít nhất một mục bằng chứng.");
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/milestone/${cotMocId}/org-tag`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: selectedOrg.id,
          tacPhamId,
          nam: Number(nam),
          khoaHocId:
            selectedOrg.loaiToChuc === "co_so_dao_tao" ? selectedOptionId : null,
          nganhId:
            selectedOrg.loaiToChuc === "truong_dai_hoc" ? selectedOptionId : null,
          milestoneTitle,
          milestoneKind,
          projectTitle: milestoneTitle,
          album: {
            title: milestoneTitle,
            href: albumHref,
            excerpt: bodyExcerpt ?? null,
            coverSrc: coverSrc ?? null,
            coverAlt: coverAlt ?? null,
            photoCount: photoCount ?? null,
          },
          evidence: cleaned,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMessage(typeof json.error === "string" ? json.error : "Không gửi được.");
        return;
      }
      setSubmitNotice(selectedOrg?.ten ?? "Tổ chức");
      const items = await loadStatusItems();
      if (items.length > 0) {
        setReviewItem(items[0]);
        hydrateFromRequest(items[0]);
      }
      setCreatingNew(false);
      setStep("status");
      dispatchJourneyOrgTagChanged(cotMocId);
    } catch {
      setMessage("Lỗi mạng khi gửi.");
    } finally {
      setSubmitting(false);
    }
  }, [
    albumHref,
    bodyExcerpt,
    cotMocId,
    coverAlt,
    coverSrc,
    evidence,
    milestoneKind,
    milestoneTitle,
    nam,
    photoCount,
    selectedOptionId,
    selectedOrg,
    tacPhamId,
    loadStatusItems,
    hydrateFromRequest,
  ]);

  const openModal = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      event.preventDefault();
      setMessage(null);
      setSubmitNotice(null);
      setCreatingNew(false);
      void (async () => {
        const items = await loadStatusItems();
        if (items.length > 0) {
          setReviewItem(items[0]);
          hydrateFromRequest(items[0]);
          setStep("status");
        } else {
          resetWizard();
          setReviewItem(null);
          setStep("search");
        }
        setOpen(true);
      })();
    },
    [hydrateFromRequest, loadStatusItems, resetWizard],
  );

  const modal = open ? (
    <div
      className="j-org-attach-modal-backdrop"
      role="presentation"
      onClick={close}
    >
      <div
        className="j-org-attach-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="j-org-attach-modal-head">
          <div className="j-org-attach-modal-head-main">
            <span className="j-org-attach-modal-icon" aria-hidden>
              <Users size={18} strokeWidth={2.2} />
            </span>
            <div className="j-org-attach-modal-head-text">
              <h2 id={headingId}>Gắn tổ chức</h2>
              <p className="j-org-attach-modal-post" title={milestoneTitle}>
                {milestoneTitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="j-org-attach-modal-close"
            aria-label="Đóng"
            onClick={close}
          >
            <X size={16} aria-hidden />
          </button>
        </header>

        <OrgAttachStepper
          step={step}
          hasStatusItems={statusItems.length > 0}
          canReviewSteps={Boolean(reviewItem)}
          onStepClick={handleStepClick}
        />

        <div className="j-org-attach-modal-body">
          {step === "search" ? (
            isReviewing && selectedOrg ? (
              <>
                <p className="j-org-attach-hint">
                  Tổ chức trong yêu cầu đã gửi — xem ở bước <strong>Trạng thái</strong>{" "}
                  để chọn yêu cầu khác.
                </p>
                <div className="j-org-attach-org-pill">
                  <span className="j-org-attach-org-pill-avatar" aria-hidden>
                    {selectedOrg.loaiToChuc === "co_so_dao_tao" ? (
                      <Building2 size={14} />
                    ) : (
                      <Users size={14} />
                    )}
                  </span>
                  <span className="j-org-attach-org-pill-text">
                    <strong>{selectedOrg.ten}</strong>
                    <small>{orgTypeLabel(selectedOrg.loaiToChuc)}</small>
                  </span>
                </div>
              </>
            ) : (
            <>
              <div className="j-org-attach-search">
                <Search size={16} strokeWidth={2.2} aria-hidden />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm trường hoặc cơ sở đào tạo…"
                  autoFocus
                  aria-label="Tìm tổ chức"
                />
              </div>
              <p className="j-org-attach-hint">
                Org bạn <strong>đang theo dõi</strong> được ưu tiên lên đầu.
              </p>
              <ul className="j-org-attach-org-list">
                {searching ? (
                  <li className="j-org-attach-org-empty">
                    <span className="j-org-attach-spinner" aria-hidden />
                    Đang tìm…
                  </li>
                ) : query.trim().length < 1 ? (
                  <li className="j-org-attach-org-empty j-org-attach-org-empty--idle">
                    <Building2 size={22} strokeWidth={1.8} aria-hidden />
                    <span>Nhập tên để tìm trường hoặc cơ sở đào tạo.</span>
                  </li>
                ) : orgs.length === 0 ? (
                  <li className="j-org-attach-org-empty">
                    Không thấy tổ chức phù hợp với &ldquo;{query.trim()}&rdquo;.
                  </li>
                ) : (
                  orgs.map((org) => (
                    <li key={org.id}>
                      <button
                        type="button"
                        className="j-org-attach-org-card"
                        onClick={() => void pickOrg(org)}
                      >
                        <span className="j-org-attach-org-avatar" aria-hidden>
                          {org.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={org.avatarUrl} alt="" />
                          ) : org.loaiToChuc === "co_so_dao_tao" ? (
                            <Building2 size={18} />
                          ) : (
                            <Users size={18} />
                          )}
                        </span>
                        <span className="j-org-attach-org-meta">
                          <strong>{org.ten}</strong>
                          <small>{orgTypeLabel(org.loaiToChuc)}</small>
                        </span>
                        {org.dangTheoDoi ? (
                          <span className="j-org-attach-org-badge">Theo dõi</span>
                        ) : null}
                        <ChevronRight size={16} className="j-org-attach-org-chevron" aria-hidden />
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </>
            )
          ) : step === "context" && selectedOrg ? (
            <>
              <div className="j-org-attach-org-pill">
                <span className="j-org-attach-org-pill-avatar" aria-hidden>
                  {selectedOrg.loaiToChuc === "co_so_dao_tao" ? (
                    <Building2 size={14} />
                  ) : (
                    <Users size={14} />
                  )}
                </span>
                <span className="j-org-attach-org-pill-text">
                  <strong>{selectedOrg.ten}</strong>
                  <small>{orgTypeLabel(selectedOrg.loaiToChuc)}</small>
                </span>
                {!isReviewing ? (
                  <button
                    type="button"
                    className="j-org-attach-link-btn"
                    onClick={() => {
                      setStep("search");
                      setMessage(null);
                    }}
                  >
                    Đổi
                  </button>
                ) : null}
              </div>

              {loadingOptions ? (
                <p className="j-org-attach-hint j-org-attach-hint--center">
                  <span className="j-org-attach-spinner" aria-hidden />
                  Đang tải danh sách…
                </p>
              ) : options.length === 0 ? (
                <div className="j-org-attach-callout">
                  Tổ chức chưa có{" "}
                  {selectedOrg.loaiToChuc === "co_so_dao_tao"
                    ? "khóa học"
                    : "ngành / chương trình"}{" "}
                  trên CINs.
                </div>
              ) : (
                <div className="j-org-attach-form-grid">
                  <label className="j-org-attach-field">
                    <span>
                      {selectedOrg.loaiToChuc === "co_so_dao_tao"
                        ? "Khóa học"
                        : "Ngành / chương trình"}
                    </span>
                    <select
                      value={selectedOptionId}
                      onChange={(e) => setSelectedOptionId(e.target.value)}
                      disabled={isReviewing}
                    >
                      <option value="">— Chọn —</option>
                      {options.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="j-org-attach-field">
                    <span>Năm</span>
                    <select
                      value={nam}
                      onChange={(e) => setNam(e.target.value)}
                      disabled={isReviewing}
                    >
                      {YEAR_OPTIONS.map((y) => (
                        <option key={y} value={String(y)}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}

              {message ? <p className="j-org-attach-error">{message}</p> : null}
            </>
          ) : step === "evidence" ? (
            <>
              <div className="j-org-attach-summary">
                <div className="j-org-attach-summary-row">
                  <span className="j-org-attach-summary-k">Tổ chức</span>
                  <span className="j-org-attach-summary-v">{selectedOrg?.ten}</span>
                </div>
                <div className="j-org-attach-summary-row">
                  <span className="j-org-attach-summary-k">
                    {selectedOrg?.loaiToChuc === "co_so_dao_tao"
                      ? "Khóa học"
                      : "Ngành"}
                  </span>
                  <span className="j-org-attach-summary-v">
                    {selectedOptionLabel ?? "—"}
                  </span>
                </div>
                <div className="j-org-attach-summary-row">
                  <span className="j-org-attach-summary-k">Năm</span>
                  <span className="j-org-attach-summary-v">{nam}</span>
                </div>
              </div>

              <div className="j-org-attach-evidence">
                <div className="j-org-attach-evidence-hdr">
                  <h3>Bằng chứng</h3>
                  {!isReviewing ? (
                    <p>
                      Thêm bằng chứng giúp tổ chức xác nhận được danh tính thực của bạn
                      tại tổ chức.
                    </p>
                  ) : null}
                </div>
                {isReviewing ? (
                  <OrgAttachEvidenceReadOnly rows={evidence} />
                ) : (
                  <>
                    <ul className="j-org-attach-evidence-list">
                      {evidence.map((row, index) => (
                        <li key={`ev-${index}`} className="j-org-attach-evidence-card">
                          <label className="j-org-attach-field j-org-attach-field--compact">
                            <span>Mô tả</span>
                            <input
                              type="text"
                              value={row.label}
                              placeholder="VD: Thẻ sinh viên 2025"
                              onChange={(e) => {
                                const next = [...evidence];
                                next[index] = { ...row, label: e.target.value };
                                setEvidence(next);
                              }}
                            />
                          </label>
                          <OrgAttachEvidenceImageField
                            row={row}
                            isActive={activeEvidenceIndex === index}
                            uploading={uploadingEvidenceIndex === index}
                            onActivate={() => setActiveEvidenceIndex(index)}
                            onUploadStart={() => setUploadingEvidenceIndex(index)}
                            onUploaded={(url, imageId) => {
                              setUploadingEvidenceIndex(null);
                              applyEvidenceImage(index, url, imageId);
                            }}
                            onClear={() => clearEvidenceImage(index)}
                            onUploadError={(msg) => {
                              setUploadingEvidenceIndex(null);
                              setMessage(msg);
                            }}
                          />
                          {evidence.length > 1 ? (
                            <button
                              type="button"
                              className="j-org-attach-evidence-remove"
                              aria-label="Xóa dòng bằng chứng"
                              onClick={() => {
                                setEvidence(evidence.filter((_, i) => i !== index));
                                setActiveEvidenceIndex((prev) =>
                                  prev >= index ? Math.max(0, prev - 1) : prev,
                                );
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      className="j-org-attach-evidence-add"
                      onClick={() => {
                        setEvidence([...evidence, emptyEvidence()]);
                        setActiveEvidenceIndex(evidence.length);
                      }}
                    >
                      <Plus size={14} aria-hidden />
                      Thêm bằng chứng
                    </button>
                  </>
                )}
              </div>

              {message ? <p className="j-org-attach-error">{message}</p> : null}
            </>
          ) : step === "status" ? (
            <>
              {submitNotice ? (
                <div className="j-org-attach-success j-org-attach-success--compact">
                  <span className="j-org-attach-success-icon" aria-hidden>
                    <CheckCircle2 size={22} strokeWidth={2} />
                  </span>
                  <p>
                    Đã gửi yêu cầu tới <strong>{submitNotice}</strong>. Tổ chức sẽ
                    duyệt qua mục Thông báo của họ.
                  </p>
                </div>
              ) : null}
              {statusLoading && statusItems.length === 0 ? (
                <p className="j-org-attach-hint j-org-attach-hint--center">
                  <span className="j-org-attach-spinner" aria-hidden />
                  Đang tải…
                </p>
              ) : statusItems.length === 0 ? (
                <p className="j-org-attach-hint j-org-attach-hint--center">
                  Chưa có yêu cầu gắn tổ chức nào.
                </p>
              ) : (
                <>
                  <p className="j-org-attach-hint">
                    Chọn yêu cầu để xem chi tiết ở các bước{" "}
                    <strong>Tổ chức</strong>, <strong>Học tập</strong>,{" "}
                    <strong>Bằng chứng</strong>.
                  </p>
                  <ul className="j-org-attach-status-list">
                    {statusItems.map((row) => (
                      <OrgAttachStatusRow
                        key={row.id}
                        row={row}
                        selected={reviewItem?.id === row.id}
                        onSelect={() => selectReviewItem(row)}
                      />
                    ))}
                  </ul>
                </>
              )}
            </>
          ) : null}
        </div>

        {step === "status" ? (
          <footer className="j-org-attach-modal-foot">
            <button
              type="button"
              className="j-org-attach-btn j-org-attach-btn--ghost"
              onClick={() => {
                setSubmitNotice(null);
                setReviewItem(null);
                setCreatingNew(true);
                resetWizard();
                setStep("search");
                setMessage(null);
              }}
            >
              Gửi yêu cầu mới
            </button>
            <button
              type="button"
              className="j-org-attach-btn j-org-attach-btn--primary"
              onClick={close}
            >
              Đóng
            </button>
          </footer>
        ) : isReviewing ? (
          <footer className="j-org-attach-modal-foot">
            <button
              type="button"
              className="j-org-attach-btn j-org-attach-btn--primary"
              onClick={() => setStep("status")}
            >
              Quay lại trạng thái
            </button>
          </footer>
        ) : step !== "search" ? (
          <footer className="j-org-attach-modal-foot">
            {step === "context" ? (
              <>
                <button
                  type="button"
                  className="j-org-attach-btn j-org-attach-btn--ghost"
                  onClick={() => {
                    setStep("search");
                    setMessage(null);
                  }}
                >
                  <ChevronLeft size={15} aria-hidden />
                  Quay lại
                </button>
                <button
                  type="button"
                  className="j-org-attach-btn j-org-attach-btn--primary"
                  disabled={options.length === 0 || loadingOptions}
                  onClick={goEvidence}
                >
                  Tiếp tục
                  <ChevronRight size={15} aria-hidden />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="j-org-attach-btn j-org-attach-btn--ghost"
                  onClick={() => setStep("context")}
                >
                  <ChevronLeft size={15} aria-hidden />
                  Quay lại
                </button>
                <button
                  type="button"
                  className="j-org-attach-btn j-org-attach-btn--primary"
                  disabled={submitting}
                  onClick={() => void submit()}
                >
                  {submitting ? "Đang gửi…" : "Gửi duyệt"}
                </button>
              </>
            )}
          </footer>
        ) : null}
      </div>
    </div>
  ) : null;

  return (
    <div className="j-org-attach" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="j-org-attach-trigger"
        onClick={openModal}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={
          pendingCount > 0
            ? `Gắn tổ chức — ${pendingCount} yêu cầu đang chờ duyệt`
            : "Gắn tổ chức"
        }
        title={
          pendingCount > 0
            ? `${pendingCount} yêu cầu đang chờ org duyệt`
            : statusItems.length > 0
              ? "Gắn tổ chức — xem yêu cầu đã gửi"
              : "Gắn tổ chức"
        }
      >
        <Users size={15} strokeWidth={2} aria-hidden />
        {pendingCount > 0 ? (
          <span className="j-org-attach-pending-dot" aria-hidden />
        ) : null}
      </button>
      {mounted && modal ? createPortal(modal, document.body) : null}
    </div>
  );
}
