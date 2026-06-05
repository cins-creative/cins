"use client";



import { ChevronDown } from "lucide-react";

import {

  useEffect,

  useLayoutEffect,

  useMemo,

  useRef,

  useState,

} from "react";

import { createPortal } from "react-dom";



import { FeaturedFlagBadge } from "@/components/journey/FeaturedFlagBadge";

import { JourneyCoverImage } from "@/components/journey/JourneyCoverImage";

import type { GalleryMediaKind } from "@/lib/journey/post-media";



export type GalleryPinnedBanner = {

  id: string;

  /** URL ảnh nền 16:9. */

  src: string;

  srcSet?: string;

  width?: number;

  height?: number;

  /** Badge nhỏ góc trái-trên (Dự án / Motion / Brand…). */

  pin: string;

  title: string;

  meta: string;

  /** Link ngữ cảnh — VD /{slug}?mid=cins. */

  href?: string;

  mediaKind?: GalleryMediaKind;

};



export type GalleryGridItem = {

  id: string;

  /** URL ảnh vuông 1:1. */

  src: string;

  srcSet?: string;

  width?: number;

  height?: number;

  label: string;

  /** Có icon ✓ góc phải-trên không. */

  isVerified?: boolean;

  /** Có overlay ▶ giữa thumbnail không. */

  isVideo?: boolean;

  href?: string;

  mediaKind?: GalleryMediaKind;

};



export type GalleryAsideFilter = "all" | GalleryMediaKind;



type Props = {

  ownerSlug: string;

  /** Tổng số tác phẩm trong gallery (hiển thị trong title). */

  totalTacPham: number;

  /** Banner ghim nổi bật (0..N). 16:9. */

  pinned?: ReadonlyArray<GalleryPinnedBanner>;

  /** Grid item vuông (0..N). 1:1. */

  items?: ReadonlyArray<GalleryGridItem>;

};



const ASIDE_FILTER_OPTIONS: ReadonlyArray<{

  id: GalleryAsideFilter;

  label: string;

}> = [

  { id: "all", label: "Tất cả" },

  { id: "article", label: "Bài viết" },

  { id: "photo", label: "Ảnh" },

  { id: "video", label: "Video" },

];



const GALLERY_FILTER_MENU_MIN_WIDTH = 148;



function matchesAsideFilter(

  mediaKind: GalleryMediaKind | undefined,

  filter: GalleryAsideFilter,

): boolean {

  if (filter === "all") return true;

  return (mediaKind ?? "article") === filter;

}



function filterLabel(filter: GalleryAsideFilter): string {

  return ASIDE_FILTER_OPTIONS.find((o) => o.id === filter)?.label ?? "Tất cả";

}



/**

 * Gallery cột phải — tổng hợp visual từ cột mốc + tác phẩm.

 */

export function JourneyGalleryAside({

  ownerSlug,

  totalTacPham,

  pinned = [],

  items = [],

}: Props) {

  void ownerSlug;

  const [filter, setFilter] = useState<GalleryAsideFilter>("all");

  const [open, setOpen] = useState(false);

  const [portalReady, setPortalReady] = useState(false);

  const [menuStyle, setMenuStyle] = useState<{

    top: number;

    left: number;

  } | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);

  const btnRef = useRef<HTMLButtonElement>(null);

  const menuRef = useRef<HTMLDivElement>(null);



  const filteredPinned = useMemo(

    () => pinned.filter((b) => matchesAsideFilter(b.mediaKind, filter)),

    [pinned, filter],

  );

  const filteredItems = useMemo(

    () => items.filter((it) => matchesAsideFilter(it.mediaKind, filter)),

    [items, filter],

  );



  const empty = pinned.length === 0 && items.length === 0;

  const filteredEmpty =

    !empty && filteredPinned.length === 0 && filteredItems.length === 0;



  useEffect(() => {

    setPortalReady(true);

  }, []);



  const updateMenuPosition = () => {

    const btn = btnRef.current;

    if (!btn) {

      setMenuStyle(null);

      return;

    }

    const rect = btn.getBoundingClientRect();

    setMenuStyle({

      top: rect.bottom + 6,

      left: Math.max(8, rect.right - GALLERY_FILTER_MENU_MIN_WIDTH),

    });

  };



  useLayoutEffect(() => {

    if (!open) {

      setMenuStyle(null);

      return;

    }

    updateMenuPosition();

    window.addEventListener("resize", updateMenuPosition);

    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {

      window.removeEventListener("resize", updateMenuPosition);

      window.removeEventListener("scroll", updateMenuPosition, true);

    };

  }, [open]);



  useEffect(() => {

    if (!open) return;

    function onDocClick(e: MouseEvent) {

      const target = e.target as Node;

      if (wrapRef.current?.contains(target)) return;

      if (menuRef.current?.contains(target)) return;

      setOpen(false);

    }

    function onEsc(e: KeyboardEvent) {

      if (e.key === "Escape") setOpen(false);

    }

    const timerId = window.setTimeout(() => {

      document.addEventListener("click", onDocClick);

    }, 0);

    document.addEventListener("keydown", onEsc);

    return () => {

      window.clearTimeout(timerId);

      document.removeEventListener("click", onDocClick);

      document.removeEventListener("keydown", onEsc);

    };

  }, [open]);



  const menu =

    open && totalTacPham > 0 && menuStyle ? (

      <div

        ref={menuRef}

        className="j-tlb-dd-menu is-portal j-gallery-dd-menu"

        role="listbox"

        aria-label="Lọc tác phẩm theo loại"

        style={{

          position: "fixed",

          top: menuStyle.top,

          left: menuStyle.left,

          width: "max-content",

          minWidth: GALLERY_FILTER_MENU_MIN_WIDTH,

          maxWidth: "min(200px, calc(100vw - 16px))",

          display: "block",

        }}

      >

        {ASIDE_FILTER_OPTIONS.map((opt) => (

          <div

            key={opt.id}

            className={

              "j-dd-opt" + (filter === opt.id ? " is-active" : "")

            }

          >

            <button

              type="button"

              role="option"

              aria-selected={filter === opt.id}

              className="j-dd-opt-main j-gallery-dd-opt"

              onClick={() => {

                setFilter(opt.id);

                setOpen(false);

              }}

            >

              <span className="j-dd-lbl">{opt.label}</span>

            </button>

          </div>

        ))}

      </div>

    ) : null;



  return (

    <aside className="j-gallery" aria-label="Tác phẩm gần đây">

      <div className="j-gallery-head">

        <div className="j-gallery-title">

          Tác phẩm

          <span className="j-gallery-count">{totalTacPham}</span>

        </div>



        {totalTacPham > 0 ? (

          <div

            ref={wrapRef}

            className={"j-gallery-dd" + (open ? " is-open" : "")}

          >

            <button

              ref={btnRef}

              type="button"

              className="j-gallery-dd-btn"

              onClick={(e) => {

                e.stopPropagation();

                setOpen((v) => !v);

              }}

              aria-haspopup="listbox"

              aria-expanded={open}

              aria-label={`Lọc tác phẩm: ${filterLabel(filter)}`}

            >

              <span>{filterLabel(filter)}</span>

              <span className="j-gallery-dd-caret" aria-hidden>

                <ChevronDown size={12} strokeWidth={2} />

              </span>

            </button>

          </div>

        ) : null}

      </div>



      {portalReady && menu ? createPortal(menu, document.body) : null}



      {empty ? (

        <div className="j-gallery-empty">

          <span className="j-gallery-empty-ico" aria-hidden>

            ▢

          </span>

          Tác phẩm sẽ xuất hiện ở đây khi bạn đính ảnh vào cột mốc.

        </div>

      ) : filteredEmpty ? (

        <div className="j-gallery-empty j-gallery-empty--filter">

          Không có tác phẩm thuộc loại này.

        </div>

      ) : (

        <>

          {filteredPinned.length > 0 ? (

            <div className="j-g-pinned">

              {filteredPinned.map((b, index) => (

                <a

                  key={b.id}

                  href={b.href ?? "#"}

                  className="j-g-banner"

                  data-pinned-id={b.id}

                >

                  <span className="j-g-banner-bg">

                    <JourneyCoverImage

                      src={b.src}

                      srcSet={b.srcSet}

                      sizes={b.srcSet ? "280px" : undefined}

                      width={b.width}

                      height={b.height}

                      alt=""

                      priority={index === 0}

                    />

                  </span>

                  <FeaturedFlagBadge className="j-g-banner-pin" />

                  <span className="j-g-banner-info">

                    <span className="j-g-banner-title">{b.title}</span>

                    <span className="j-g-banner-meta">{b.meta}</span>

                  </span>

                </a>

              ))}

            </div>

          ) : null}



          {filteredItems.length > 0 ? (

            <div className="j-gallery-grid">

              {filteredItems.map((it) => (

                <a

                  key={it.id}

                  href={it.href ?? "#"}

                  className={"j-g-item" + (it.isVerified ? " is-verified" : "")}

                  data-item-id={it.id}

                  aria-label={it.label}

                >

                  <span className="j-g-thumb">

                    <JourneyCoverImage

                      src={it.src}

                      srcSet={it.srcSet}

                      sizes={it.srcSet ? "140px" : undefined}

                      width={it.width}

                      height={it.height}

                      alt={it.label}

                    />

                  </span>

                  {it.isVideo || it.mediaKind === "video" ? (

                    <span className="j-g-play" aria-hidden>

                      ▶

                    </span>

                  ) : null}

                  <span className="j-g-overlay">

                    <span className="j-g-label">{it.label}</span>

                  </span>

                </a>

              ))}

            </div>

          ) : null}

        </>

      )}

    </aside>

  );

}

