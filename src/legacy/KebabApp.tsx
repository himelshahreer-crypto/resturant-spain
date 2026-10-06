"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
// Faithful port of the design's `Component` class (design/index.html, <script data-dc-script>).
// Logic is kept line-for-line so behaviour matches the design; it's typed loosely on purpose
// and gets split into hooks and components in Phase 6.
//
// Deliberate differences from the design (each needed for Next.js / static hosting):
// 1. The view (home/menu) comes from the URL, and go() navigates; language comes from the URL,
//    and setLang() loads the other locale's URL.
// 2. Saved state (localStorage "kf4") is restored after mount, not in the constructor, so the
//    server-rendered HTML and the first client render are identical (no hydration mismatch).
//    Window-dependent values (navWide, scrolled) and the clock (`now`) are also set after mount.
// 3. UI strings come from src/messages (extracted from the design; unit-tested identical).
// 4. Content arrives as a prop (MenuRepository seam) and orders go through OrderService.
// 5. The admin-prototype leftovers (seeded fake orders, HERO/heroDish, JOURNEY_AMBIENT) are dropped.
// 6. Asset URLs are absolute (/assets/…) so they work on /menu/ and /ca/.
import { Component, createElement, useEffect, useRef } from "react";
import type { Locale } from "@/content/types";
import { getMessages, format } from "@/i18n/messages";
import { markAppMounted } from "@/components/icon/mount-phase";
import { startOffscreenPause } from "./offscreen-pause";
import { DialogFocus, enhance, handleKey } from "./a11y";
import { DesignTemplate } from "./DesignTemplate";
import type { DesignData } from "./design-data";
import { getOrderService, type PlacedOrder } from "@/lib/orders/service";

export type View = "home" | "menu";

interface Props {
  /** Site content in the design's data shapes (loaded through the MenuRepository at build time). */
  data: DesignData;
  view: View;
  locale: Locale;
  /** Client-side navigation to the given view in the current locale. */
  navigate: (view: View) => void;
  /** Full navigation to the same view in another locale. */
  switchLocale: (locale: Locale, view: View) => void;
  heroVideos?: string;
  motion?: boolean;
}

const STORAGE_KEY = "kf4";
/** sessionStorage: scroll position to restore after a language switch (set by AppShell). */
export const SCROLL_KEY = "kf-scroll";

function Slider(p: { slides: any[]; idx: number }) {
  const ref = useRef<HTMLDivElement>(null),
    prev = useRef(-1);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const kids = [...root.children] as HTMLElement[],
      cur = kids[p.idx],
      old = prev.current;
    kids.forEach((k, i) => {
      k.style.zIndex = String(i === p.idx ? 2 : i === old ? 1 : 0);
      k.style.visibility = i === p.idx || i === old ? "visible" : "hidden";
    });
    if (old >= 0 && old !== p.idx && cur) {
      const O = ["78% 50%", "22% 78%", "60% 20%", "85% 85%", "30% 30%", "70% 60%"][p.idx % 6];
      cur.animate([{ clipPath: "circle(0% at " + O + ")" }, { clipPath: "circle(150% at " + O + ")" }], {
        duration: 1100,
        easing: "cubic-bezier(.77,0,.18,1)",
      });
      const ob = kids[old] && (kids[old].firstChild as HTMLElement | null);
      if (ob) ob.animate([{ filter: "none" }, { filter: "brightness(.6)" }], { duration: 1000, easing: "ease-in" });
    }
    prev.current = p.idx;
  }, [p.idx]);
  return (
    <div ref={ref} style={{ position: "absolute", inset: 0, isolation: "isolate" }}>
      {p.slides.map((s, i) => (
        // Initial stacking = what the effect below sets on its first run (current slide on top,
        // others hidden), so the static HTML already shows the right slide: the hero image can
        // paint before JavaScript loads. The design only got there after its script ran.
        <div
          key={i}
          style={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            zIndex: i === p.idx ? 2 : 0,
            visibility: i === p.idx ? "visible" : "hidden",
          }}
        >
          <div style={{ position: "absolute", inset: 0 }}>
            {s.video ? (
              <video
                src={s.video}
                autoPlay
                muted
                loop
                playsInline
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage: "url(/assets/food/" + s.img + ")",
                  backgroundSize: "cover",
                  backgroundPosition: s.pos,
                  willChange: "transform",
                  animation: "kfkb" + (i % 3) + " 13s ease-in-out " + -i * 3 + "s infinite alternate",
                }}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function SlideBg(p: { slides: any[]; idx: number; motion?: boolean }) {
  const e = createElement;
  return e(
    "div",
    { style: { position: "absolute", inset: 0, overflow: "hidden" } },
    p.slides.map((s, i) =>
      e("div", {
        key: i,
        style: {
          position: "absolute",
          inset: 0,
          transform: "translateX(" + (i - p.idx) * 100 + "%)",
          transition: p.motion === false ? "none" : "transform .65s cubic-bezier(.65,0,.35,1)",
          backgroundImage: "url(/assets/food/" + s.img + ")",
          backgroundSize: "cover",
          backgroundPosition: s.pos || "50% 50%",
        },
      }),
    ),
  );
}

export class KebabApp extends Component<Props, any> {
  [k: string]: any;

  fresh() {
    return {
      v: 1,
      view: this.props.view,
      lang: this.props.locale,
      cat: [],
      homeCat: [],
      q: "",
      cart: {},
      drawer: false,
      navMenu: false,
      step: "cart",
      faqOpen: [0],
      form: { name: "", email: "", phone: "", address: "", pay: "cash" },
      errs: {},
      confirm: null,
      ddOpen: false,
      heroIdx: 0,
      combosIdx: 0,
      eta: 45,
      seq: 1046,
      // Window-dependent: set in componentDidMount (the design read window here).
      scrolled: false,
      navWide: false,
      cats: this.props.data.CATS.map((c) => ({ ...c })),
      items: this.props.data.ITEMS.map((i) => ({ ...i })),
      orders: [] as any[],
      // Clock: set in componentDidMount so server and first client render agree.
      now: undefined as number | undefined,
    };
  }
  state: any = this.fresh();

  componentDidMount() {
    // After a language switch (a full page load), return to the same scroll position.
    try {
      const saved = JSON.parse(sessionStorage.getItem(SCROLL_KEY) || "null");
      sessionStorage.removeItem(SCROLL_KEY);
      if (saved && saved.path === location.pathname) window.scrollTo({ top: saved.y, behavior: "instant" });
    } catch {}
    // Restore saved state (the design did this in its state initializer).
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (s && s.v === 1)
        this.setState({
          ...s,
          cat: Array.isArray(s.cat) ? s.cat : [],
          homeCat: Array.isArray(s.homeCat) ? s.homeCat : [],
          drawer: false,
          navMenu: false,
          ddOpen: false,
          confirm: null,
          view: this.props.view,
          lang: this.props.locale,
        });
    } catch {}
    // A shared/bookmarked /menu/?cat=… link opens with that filter (wins over the saved one).
    const urlCats = this.catsFromUrl();
    if (this.props.view === "menu" && urlCats) this.setState({ cat: urlCats });
    this._scrolled = scrollY > 24;
    this._wide = innerWidth >= 900;
    // Once the real header state is rendered, hand over from prehydrate.css to the inline styles.
    this.setState({ now: Date.now(), scrolled: this._scrolled, navWide: this._wide }, () =>
      document.documentElement.removeAttribute("data-kf-pre"),
    );

    document.documentElement.lang = this.props.locale;
    this._revealed = new WeakSet();
    this.onScroll = () => {
      const sc = scrollY > 24,
        wide = innerWidth >= 900;
      if (sc !== this._scrolled || wide !== this._wide) {
        this._scrolled = sc;
        this._wide = wide;
        this.setState({ scrolled: sc, navWide: wide });
      }
      if (this.raf) return;
      this.raf = requestAnimationFrame(() => {
        this.raf = 0;
        this.parallax();
      });
    };
    window.addEventListener("scroll", this.onScroll, { passive: true });
    window.addEventListener("resize", this.onScroll);
    document.addEventListener("scroll", this.onScroll, { passive: true, capture: true });
    this.io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          const el = e.target as any,
            d = +el.getAttribute("data-reveal") || 0;
          if (e.isIntersecting) {
            if (el._revAnim) el._revAnim.cancel();
            el._revAnim = el.animate(
              [
                { opacity: 0, transform: "translateY(26px) scale(.96)" },
                { opacity: 1, transform: "none" },
              ],
              { duration: 520, delay: d * 45, easing: "cubic-bezier(.2,1.08,.3,1)", fill: "both" },
            );
            if (el.hasAttribute("data-wave")) setTimeout(() => this.sweep(el), d * 45 + 280);
            const countEl = el.hasAttribute("data-count") ? el : el.querySelector("[data-count]");
            const target = countEl && countEl.getAttribute("data-count");
            if (countEl && target != null) {
              const end = parseFloat(target),
                dur = 1400,
                start = performance.now(),
                token = (countEl._countTok = (countEl._countTok || 0) + 1);
              const locale = ({ es: "es-ES", ca: "ca-ES", en: "en-US" } as any)[this.state.lang] || "es-ES";
              const step = (now: number) => {
                if (countEl._countTok !== token) return;
                const p = Math.min(1, (now - start) / dur),
                  eased = 1 - Math.pow(1 - p, 3);
                countEl.textContent = Math.round(eased * end).toLocaleString(locale);
                if (p < 1) requestAnimationFrame(step);
                else countEl.textContent = end.toLocaleString(locale);
              };
              requestAnimationFrame(step);
            }
          } else {
            if (el._revAnim) {
              el._revAnim.cancel();
              el._revAnim = null;
            }
            el.style.opacity = "0";
            el.style.transform = "translateY(36px) scale(.94)";
            const resetEl = el.hasAttribute("data-count") ? el : el.querySelector("[data-count]");
            if (resetEl) {
              resetEl._countTok = (resetEl._countTok || 0) + 1;
              resetEl.textContent = "0";
            }
          }
        }),
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" },
    );
    this.tick = setInterval(() => this.setState({ now: Date.now() }), 15000);
    this.onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const s = JSON.parse(e.newValue);
          this.setState({ orders: s.orders, items: s.items, cats: s.cats, eta: s.eta });
        } catch {}
      }
    };
    window.addEventListener("storage", this.onStorage);
    setTimeout(() => this.reveal(), 30);
    this.parallax();
    this.restartSlides();
    this.restartCombos();
    this.onDown = (e: PointerEvent) => {
      const b = (e.target as any)?.closest && (e.target as any).closest("button");
      if (!b || b.dataset.noripple) return;
      const r = b.getBoundingClientRect();
      if (getComputedStyle(b).position === "static") b.style.position = "relative";
      b.style.overflow = "hidden";
      const d = Math.max(r.width, r.height) * 2.2,
        sp = document.createElement("span");
      sp.style.cssText =
        "position:absolute;pointer-events:none;border-radius:50%;background:rgba(255,255,255,.45);left:" +
        (e.clientX - r.left - d / 2) +
        "px;top:" +
        (e.clientY - r.top - d / 2) +
        "px;width:" +
        d +
        "px;height:" +
        d +
        "px";
      b.appendChild(sp);
      const a = sp.animate(
        [
          { transform: "scale(0)", opacity: 1 },
          { transform: "scale(1)", opacity: 0 },
        ],
        { duration: 480, easing: "cubic-bezier(.2,.7,.2,1)" },
      );
      a.onfinish = () => sp.remove();
    };
    document.addEventListener("pointerdown", this.onDown);
    this.onOver = (e: PointerEvent) => {
      const b = (e.target as any)?.closest && (e.target as any).closest("button,[data-wave]");
      if (!b || b.dataset.noripple || (e.relatedTarget && b.contains(e.relatedTarget))) return;
      this.sweep(b);
    };
    document.addEventListener("pointerover", this.onOver);
    this.onKey = (e: KeyboardEvent) => {
      if (this.state.view !== "home") return;
      const tag = (e.target && (e.target as HTMLElement).tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowLeft") this.stepCombo(-1);
      else if (e.key === "ArrowRight") this.stepCombo(1);
    };
    document.addEventListener("keydown", this.onKey);
    this.onGalleryClick = (e: MouseEvent) => {
      const it = (e.target as any)?.closest && (e.target as any).closest(".kf-gallery-item");
      if (!it) return;
      it.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    };
    document.addEventListener("click", this.onGalleryClick);
    const kfRoot = document.querySelector<HTMLElement>("#kf-root > .kf-host");
    if (kfRoot) this.stopOffscreenPause = startOffscreenPause(kfRoot);
    // Accessibility layer (no visual change): semantics, focus, keyboard. See a11y.ts.
    this.dialogFocus = new DialogFocus();
    this.applyA11y();
    this.onA11yKey = (e: KeyboardEvent) => handleKey(e, () => this.closeTopDialog());
    document.addEventListener("keydown", this.onA11yKey);
    // Icons mounted from now on render like the design's later-mounted <kf-i> (see Icon.tsx).
    markAppMounted();
    // Signals that effects are wired (used by the parity harness; no visual effect).
    document.documentElement.setAttribute("data-kf-ready", "");
  }
  componentWillUnmount() {
    document.removeEventListener("keydown", this.onA11yKey);
    if (this.stopOffscreenPause) this.stopOffscreenPause();
    clearInterval(this.tick);
    clearInterval(this.slideT);
    clearInterval(this.comboT);
    window.removeEventListener("scroll", this.onScroll);
    window.removeEventListener("resize", this.onScroll);
    document.removeEventListener("scroll", this.onScroll, { capture: true });
    document.removeEventListener("pointerdown", this.onDown);
    document.removeEventListener("pointerover", this.onOver);
    document.removeEventListener("keydown", this.onKey);
    document.removeEventListener("click", this.onGalleryClick);
    if (this.io) this.io.disconnect();
    window.removeEventListener("storage", this.onStorage);
  }
  /** Category ids from ?cat=a,b in the URL, or null when absent. Unknown ids are ignored. */
  catsFromUrl(): string[] | null {
    const raw = new URLSearchParams(location.search).get("cat");
    if (raw == null) return null;
    const known = new Set(this.props.data.CATS.map((c) => c.id));
    return raw.split(",").filter((id) => known.has(id));
  }
  /** Mirrors the menu filter into the URL (/menu/?cat=tacos) without adding history entries. */
  syncCatsToUrl() {
    if (this.props.view !== "menu" || this.state.view !== "menu") return;
    const cats: string[] = Array.isArray(this.state.cat) ? this.state.cat : [];
    const search = cats.length ? "?cat=" + cats.join(",") : "";
    if (location.search !== search) history.replaceState(history.state, "", location.pathname + search + location.hash);
  }
  componentDidUpdate(prevProps: Props) {
    this.applyA11y();
    // Arriving on /menu/ (incl. back/forward): a ?cat= in the URL wins; otherwise mirror the state.
    const urlCats = prevProps.view !== this.props.view && this.props.view === "menu" ? this.catsFromUrl() : null;
    if (urlCats && urlCats.join(",") !== (this.state.cat || []).join(",")) this.setState({ cat: urlCats });
    else this.syncCatsToUrl();
    // Browser back/forward between / and /menu/.
    if (prevProps.view !== this.props.view && this.state.view !== this.props.view)
      this.setState({ view: this.props.view });
    const s = this.state,
      ps = this._prev || { view: s.view, cat: s.cat, homeCat: s.homeCat, q: s.q, drawer: false, confirm: null };
    this._prev = { view: s.view, cat: s.cat, homeCat: s.homeCat, q: s.q, drawer: s.drawer, confirm: s.confirm };
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { now, drawer, ddOpen, confirm, ...keep } = s;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(keep));
    } catch {}
    if (ps.view !== s.view || ps.cat !== s.cat || ps.homeCat !== s.homeCat || ps.q !== s.q)
      setTimeout(() => this.reveal(), 30);
    if (!ps.drawer && s.drawer) {
      requestAnimationFrame(() => {
        const d = document.querySelector("[data-drawer]");
        if (d)
          d.animate([{ transform: "translateX(100%)" }, { transform: "none" }], {
            duration: 320,
            easing: "cubic-bezier(.2,.8,.2,1)",
          });
      });
    }
    if (!ps.confirm && s.confirm) {
      requestAnimationFrame(() => {
        const c = document.querySelector("[data-conf]");
        if (c)
          c.animate(
            [
              { opacity: 0, transform: "translateY(30px) scale(.96)" },
              { opacity: 1, transform: "none" },
            ],
            { duration: 380, easing: "cubic-bezier(.2,.8,.2,1)" },
          );
        const r = document.querySelector("[data-ring]");
        if (r) {
          r.animate([{ strokeDashoffset: 326.7 }, { strokeDashoffset: r.getAttribute("stroke-dashoffset") as any }], {
            duration: 1000,
            easing: "cubic-bezier(.3,.7,.2,1)",
          });
        }
      });
    }
  }
  applyA11y() {
    const root = document.querySelector("#kf-root > .kf-host");
    if (!root) return;
    enhance(root, { payTitle: getMessages(this.state.lang || "es").payTitle });
    this.dialogFocus?.update(root);
  }
  /** Esc: closes the dialog in front (confirmation, cart drawer, nav drawer). */
  closeTopDialog(): boolean {
    if (this.state.confirm) this.setState({ confirm: null });
    else if (this.state.drawer) this.setState({ drawer: false });
    else if (this.state.navMenu) this.setState({ navMenu: false });
    else return false;
    return true;
  }
  restartSlides() {
    clearInterval(this.slideT);
    this.slideT = setInterval(() => {
      if (this.state.view === "home" && this.props.motion !== false && !document.hidden)
        this.setState((st: any) => ({ heroIdx: ((st.heroIdx || 0) + 1) % this.props.data.SLIDES.length }));
    }, 5500);
  }
  restartCombos() {
    clearInterval(this.comboT);
    this.comboT = setInterval(() => {
      if (this.state.view === "home" && this.props.motion !== false && !document.hidden) {
        const n = this.state.items.filter((i: any) => i.cat === "combos").length || 1;
        this.setState((st: any) => ({ combosIdx: ((st.combosIdx || 0) + 1) % n }));
      }
    }, 6000);
  }
  stepCombo(delta: number) {
    const n = this.state.items.filter((i: any) => i.cat === "combos").length || 1;
    this.setState((st: any) => ({ combosIdx: ((((st.combosIdx || 0) + delta) % n) + n) % n }));
    this.restartCombos();
  }
  parallax() {
    if (this.props.motion === false) return;
    const hb = document.querySelector("[data-hero-bg]") as HTMLElement | null;
    if (hb) {
      const y = Math.min(scrollY * 0.18, 60);
      hb.style.transform = "translate3d(0," + y + "px,0)";
    }
    const jr = document.querySelector(".kf-journey");
    if (jr && !(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)) {
      const path = jr.querySelector(".kf-road-path") as SVGPathElement | null,
        rider = jr.querySelector(".kf-rider-wrap") as HTMLElement | null;
      if (path && rider) {
        const rect = jr.getBoundingClientRect(),
          vh = window.innerHeight || 800;
        let p = (vh - rect.top) / (rect.height + vh);
        p = Math.max(0, Math.min(1, p));
        if (this._roadLenEl !== path) {
          this._roadLen = path.getTotalLength();
          this._roadLenEl = path;
        }
        const pt = path.getPointAtLength(p * this._roadLen);
        rider.style.left = ((pt.x / 1000) * 100).toFixed(2) + "%";
        rider.style.top = ((pt.y / 900) * 100).toFixed(2) + "%";
      }
    }
    const gal = document.getElementById("kfGallery");
    if (gal) {
      const items = gal.querySelectorAll(".kf-gallery-item"),
        galRect = gal.getBoundingClientRect(),
        centerX = galRect.left + galRect.width / 2;
      items.forEach((it) => {
        const r = it.getBoundingClientRect(),
          itCenter = r.left + r.width / 2;
        const norm = Math.min(1, Math.abs(itCenter - centerX) / (galRect.width * 0.52));
        const img = it.querySelector(".kf-gallery-img") as HTMLElement | null,
          zoom = it.querySelector(".kf-gallery-zoom") as HTMLElement | null,
          nm = it.querySelector(".kf-gallery-name") as HTMLElement | null;
        if (img) img.style.filter = "brightness(" + (1 - norm * 0.6).toFixed(2) + ")";
        const focus = Math.max(0, 1 - norm * 2.4).toFixed(2);
        if (zoom) zoom.style.opacity = focus;
        if (nm) nm.style.opacity = focus;
      });
    }
  }
  reveal() {
    if (this.props.motion === false || !this.io) return;
    document.querySelectorAll("[data-reveal]").forEach((el) => {
      if (this._revealed.has(el)) return;
      this._revealed.add(el);
      this.io.observe(el);
    });
  }

  fmt(n: number) {
    return (Math.round(n * 100) / 100).toFixed(2) + " €";
  }
  go(view: View, extra?: any) {
    this._scrolled = false;
    this.setState({ view, ddOpen: false, drawer: false, navMenu: false, scrolled: false, ...(extra || {}) });
    if (view !== this.props.view) this.props.navigate(view);
    window.scrollTo({ top: 0, behavior: "instant" });
    this.parallax();
  }
  bump() {
    const b = document.querySelector("[data-cartbtn]");
    if (b)
      b.animate([{ transform: "scale(1)" }, { transform: "scale(1.12)" }, { transform: "scale(1)" }], {
        duration: 300,
        easing: "ease-out",
      });
  }
  sweep(b: any) {
    if (!b || b.dataset.noripple || this.props.motion === false) return;
    const t = Date.now();
    if (b._w && t - b._w < 1500) return;
    b._w = t;
    const isCard = b.hasAttribute("data-wave");
    const cs = getComputedStyle(b);
    if (cs.position === "static") b.style.position = "relative";
    b.style.overflow = "hidden";
    const m = (cs.backgroundColor.match(/[\d.]+/g) || [0, 0, 0, 0]).map(Number),
      al = m.length > 3 ? m[3] : 1,
      lum = (0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2]) / 255,
      light = al < 0.2 || lum > 0.72;
    const w = document.createElement("span");
    w.style.cssText =
      (isCard
        ? "position:absolute;top:0;bottom:0;left:0;width:55%;"
        : "position:absolute;top:-30%;bottom:-30%;left:0;width:90%;") +
      "pointer-events:none;background:linear-gradient(100deg,transparent 0%," +
      (light ? (isCard ? "rgba(255,77,28,.22)" : "rgba(255,77,28,.10)") : "rgba(255,255,255,.22)") +
      " 50%,transparent 100%);transform:translateX(-130%) skewX(-20deg)";
    b.appendChild(w);
    w.animate([{ transform: "translateX(-130%) skewX(-20deg)" }, { transform: "translateX(230%) skewX(-20deg)" }], {
      duration: isCard ? 1300 : 1100,
      easing: "cubic-bezier(.4,0,.2,1)",
    }).onfinish = () => w.remove();
  }
  add(id: string) {
    this.setState((s: any) => ({ cart: { ...s.cart, [id]: (s.cart[id] || 0) + 1 } }));
    this.bump();
  }
  dec(id: string) {
    this.setState((s: any) => {
      const c = { ...s.cart };
      c[id] = (c[id] || 0) - 1;
      if (c[id] <= 0) delete c[id];
      return { cart: c };
    });
  }
  vis(o: any) {
    const c = o.cat ? this.state.cats.find((x: any) => x.id === o.cat) : null;
    const img = o.img;
    const icon = o.icon || (c && c.icon) || (o.cat === "drinks" ? "cup" : o.cat === "tacos" ? "flame" : "utensils");
    return {
      bg: img ? `url(/assets/food/${img})` : "none",
      pos: o.pos || "50% 50%",
      noImg: !img,
      icon,
      tint: img ? "#FFEEE3" : "#FFF3D6",
    };
  }
  itemVM(it: any, i: number) {
    const q = this.state.cart[it.id] || 0;
    const alg = (it.alg || []).map((code: string) => ({
      code,
      name: this.L((this.props.data.ALLERGENS as any)[code]),
    }));
    const isHalal = !!it.halal;
    return {
      ...this.vis(it),
      id: it.id,
      name: this.L(it.name),
      desc: this.L(it.desc),
      priceTxt: this.fmt(it.price),
      badge: this.L(it.badge) || "",
      hasBadge: !!it.badge,
      qty: q,
      inCart: q > 0,
      notInCart: q === 0,
      d: String(i % 4),
      add: () => this.add(it.id),
      dec: () => this.dec(it.id),
      alg,
      hasAlg: alg.length > 0,
      isHalal,
      hasTags: alg.length > 0 || isHalal,
    };
  }
  validate(f: any) {
    const e: any = {};
    if (f.name.trim().length < 2)
      e.name = this.pick("Please enter your name.", "Introduce tu nombre.", "Introdueix el teu nom.");
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim()))
      e.email = this.pick("Please enter a valid email.", "Introduce un email válido.", "Introdueix un correu vàlid.");
    if (f.phone.replace(/\D/g, "").length < 9)
      e.phone = this.pick(
        "Please enter a phone number with at least 9 digits.",
        "Introduce un teléfono de al menos 9 dígitos.",
        "Introdueix un telèfon d’almenys 9 dígits.",
      );
    if (f.address.trim().length < 6)
      e.address = this.pick(
        "Please enter your street, number and floor.",
        "Introduce tu calle, número y piso.",
        "Introdueix el teu carrer, número i pis.",
      );
    return e;
  }
  place() {
    const s = this.state,
      e = this.validate(s.form);
    if (Object.keys(e).length) {
      this.setState({ errs: e });
      return;
    }
    const lines = Object.entries(s.cart)
      .map(([id, qty]: [string, any]) => {
        const it = s.items.find((x: any) => x.id === id);
        return it ? { qty, name: this.EN(it.name), price: it.price } : null;
      })
      .filter(Boolean) as any[];
    const total = lines.reduce((a, l) => a + l.qty * l.price, 0),
      seq = s.seq + 1;
    const o = {
      id: "o" + seq,
      ref: "KF-" + seq,
      status: "new",
      at: Date.now(),
      eta: s.eta,
      name: s.form.name.trim(),
      email: s.form.email.trim(),
      phone: s.form.phone.trim(),
      address: s.form.address.trim(),
      pay: s.form.pay,
      lines: lines.map((l) => ({ qty: l.qty, name: l.name })),
      total: Math.round(total * 100) / 100,
    };
    this.setState({
      orders: [o, ...s.orders],
      seq,
      cart: {},
      drawer: false,
      step: "cart",
      errs: {},
      confirm: o.id,
      now: Date.now(),
    });
    // Backend seam: today a no-op (the design keeps orders in the browser only).
    void getOrderService().submit(o as PlacedOrder);
  }
  setLang(l: Locale) {
    if (l === this.props.locale) return;
    this.setState({ lang: l }, () => this.props.switchLocale(l, this.state.view));
  }
  pick(en: string, es: string, ca?: string) {
    const l = this.state.lang || "es";
    return l === "es" ? es : l === "ca" ? (ca != null ? ca : es) : en;
  }
  L(o: any) {
    if (o == null) return o;
    if (typeof o !== "object") return o;
    const l = this.state.lang || "es";
    return o[l] != null ? o[l] : o.en;
  }
  EN(o: any) {
    return o && typeof o === "object" ? o.en : o;
  }

  renderVals() {
    const s = this.state,
      P = this.props,
      eta = s.eta,
      lang = s.lang || "es",
      pick = (en: string, es: string, ca?: string) => this.pick(en, es, ca),
      L = (o: any) => this.L(o);
    const view = s.view === "menu" ? "menu" : "home";
    const navOverlay = view === "home" && !s.scrolled && s.navWide;
    const cartLines = Object.entries(s.cart)
      .map(([id, qty]) => ({ it: s.items.find((x: any) => x.id === id), qty: qty as number }))
      .filter((l) => l.it);
    const count = cartLines.reduce((a, l) => a + l.qty, 0),
      total = cartLines.reduce((a, l) => a + l.qty * l.it.price, 0);
    const catCount = (id: string) => s.items.filter((i: any) => i.cat === id).length;
    const plural = (n: number) =>
      pick(
        n + (n === 1 ? " item" : " items"),
        n + (n === 1 ? " producto" : " productos"),
        n + (n === 1 ? " producte" : " productes"),
      );
    const day = new Date(s.now as number).getDay(),
      late = day === 5 || day === 6;
    const combosList = s.items.filter((i: any) => i.cat === "combos");
    const ci = (s.combosIdx || 0) % (combosList.length || 1);
    const combo = combosList[ci];
    const popularItems = this.props.data.POPULAR.map((p, i) => {
      const it = s.items.find((x: any) => x.id === p.id);
      if (!it) return null;
      return { ...this.itemVM(it, i), feats: p.feats.map((f) => L(f)) };
    }).filter(Boolean);

    // UI strings: extracted from the design's `t` (src/messages), ETA filled in.
    const msgs = getMessages(lang);
    const t: Record<string, any> = {};
    for (const [k, val] of Object.entries(msgs)) t[k] = typeof val === "string" ? format(val, { eta }) : val;

    const noResultsMsg = pick(
      "Nothing matches “" + s.q.trim() + "”. Try another word.",
      "No hay nada que coincida con “" + s.q.trim() + "”. Prueba con otra palabra.",
      "No hi ha res que coincideixi amb “" + s.q.trim() + "”. Prova amb una altra paraula.",
    );
    const openToday =
      pick("Open today · 12:30 – ", "Abierto hoy · 12:30 – ", "Obert avui · 12:30 – ") + (late ? "00:00" : "23:30");

    const q = s.q.trim().toLowerCase();
    const match = (i: any) => !q || (L(i.name) + " " + L(i.desc)).toLowerCase().includes(q);
    const selCats = Array.isArray(s.cat) ? s.cat : [];
    const showCats = selCats.length ? s.cats.filter((c: any) => selCats.includes(c.id)) : s.cats;
    const sections = showCats
      .map((c: any) => {
        const its = s.items.filter((i: any) => i.cat === c.id && match(i));
        return {
          name: L(c.name),
          isNew: !!c.isNew,
          count: plural(its.length),
          items: its.map((it: any, i: number) => this.itemVM(it, i)),
        };
      })
      .filter((x: any) => x.items.length);
    const allVis = { bg: "none", pos: "50% 50%", noImg: true, icon: "utensils", tint: "#FFF3D6" };
    const chips = [{ id: "all", name: { en: "All", es: "Todo", ca: "Tot" } } as any].concat(s.cats).map((c: any) => {
      const on = c.id === "all" ? selCats.length === 0 : selCats.includes(c.id);
      const v = c.id === "all" ? allVis : this.vis({ id: c.id, icon: c.icon });
      return {
        ...v,
        name: L(c.name),
        count: c.id === "all" ? String(s.items.length) : String(catCount(c.id)),
        on: String(on),
        pillBg: on ? "#FF4D1C" : "#ffffff",
        pillFg: on ? "#ffffff" : "#2C1D12",
        sel: on ? "on" : "off",
        toggle: () => {
          this.setState((st: any) => {
            const cur = Array.isArray(st.cat) ? st.cat : [];
            if (c.id === "all") return { cat: [] };
            const has = cur.includes(c.id);
            return { cat: has ? cur.filter((x: string) => x !== c.id) : [...cur, c.id] };
          });
          window.scrollTo({ top: 0, behavior: "smooth" });
        },
      };
    });

    const selHomeCats = Array.isArray(s.homeCat) ? s.homeCat : [];
    const homeChips = [{ id: "all", name: { en: "All", es: "Todo", ca: "Tot" } } as any]
      .concat(s.cats)
      .map((c: any) => {
        const on = c.id === "all" ? selHomeCats.length === 0 : selHomeCats.includes(c.id);
        const v = c.id === "all" ? allVis : this.vis({ id: c.id, icon: c.icon });
        return {
          ...v,
          name: L(c.name),
          count: c.id === "all" ? String(s.items.length) : String(catCount(c.id)),
          on: String(on),
          pillBg: on ? "#FF4D1C" : "#ffffff",
          pillFg: on ? "#ffffff" : "#2C1D12",
          sel: on ? "on" : "off",
          toggle: () =>
            this.setState((st: any) => {
              const cur = Array.isArray(st.homeCat) ? st.homeCat : [];
              if (c.id === "all") return { homeCat: [] };
              const has = cur.includes(c.id);
              return { homeCat: has ? cur.filter((x: string) => x !== c.id) : [...cur, c.id] };
            }),
        };
      });
    const showHomeCats = selHomeCats.length ? s.cats.filter((c: any) => selHomeCats.includes(c.id)) : s.cats;
    const homeSections = showHomeCats
      .map((c: any) => {
        const its = s.items.filter((i: any) => i.cat === c.id);
        return {
          name: L(c.name),
          isNew: !!c.isNew,
          count: plural(its.length),
          items: its.map((it: any, i: number) => this.itemVM(it, i)),
        };
      })
      .filter((x: any) => x.items.length);

    const F = s.form,
      setF = (k: string) => (e: any) => {
        const v = e.target.value;
        this.setState((st: any) => {
          const errs = { ...st.errs };
          delete errs[k];
          return { form: { ...st.form, [k]: v }, errs };
        });
      };
    const fieldDefs = [
      ["name", t.fName, "text", "name", "Laura Pérez"],
      ["email", t.fEmail, "email", "email", "you@email.com"],
      ["phone", t.fPhone, "tel", "tel", "+34 600 000 000"],
      ["address", t.fAddress, "text", "street-address", t.fAddressPh],
    ];
    const fields = fieldDefs.map(([k, label, type, ac, ph]) => ({
      label,
      type,
      ac,
      ph,
      value: F[k],
      onChange: setF(k),
      err: s.errs[k] || "",
      hasErr: !!s.errs[k],
      border: s.errs[k] ? "#D6362A" : "#A8917E",
    }));
    const pays = [
      ["cash", t.payCash, t.payCashNote, "cash"],
      ["card", t.payCard, t.payCardNote, "card"],
    ].map(([id, name, note, icon]) => {
      const on = F.pay === id;
      return {
        name,
        note,
        icon,
        on: String(on),
        border: on ? "#FF4D1C" : "rgba(32,30,29,.12)",
        bgc: on ? "#FFE4D6" : "#ffffff",
        dot: on ? "#FF4D1C" : "transparent",
        dotBorder: on ? "#FF4D1C" : "rgba(32,30,29,.3)",
        pick: () => this.setState((st: any) => ({ form: { ...st.form, pay: id } })),
      };
    });
    const isCheckout = s.step === "checkout" && count > 0;

    const co = s.confirm && s.orders.find((o: any) => o.id === s.confirm);
    let conf: any = { show: false };
    if (co) {
      const left = Math.max(0, Math.ceil((co.at + co.eta * 60000 - s.now) / 60000)),
        first = co.name.split(" ")[0];
      conf = {
        show: true,
        ref: co.ref,
        first,
        eta: co.eta,
        mins: String(left),
        offset: String(326.7 * (1 - left / co.eta)),
        address: co.address,
        email: co.email,
        payIcon: co.pay === "cash" ? "cash" : "card",
        payTxt: co.pay === "cash" ? t.payToRiderCash : t.payToRiderCard,
        total: this.fmt(co.total),
        thanksMsg: pick(
          "Thanks, " + first + "! Your order is in.",
          "¡Gracias, " + first + "! Hemos recibido tu pedido.",
          "Gràcies, " + first + "! Hem rebut la teva comanda.",
        ),
        etaPre: pick("Order ", "Tu pedido ", "La teva comanda "),
        etaMid: pick(
          " will be at your door in about ",
          " llegará a tu puerta en unos ",
          " arribarà a la teva porta en uns ",
        ),
        etaMinutes: co.eta + pick(" minutes.", " minutos.", " minuts."),
        sentMsg: t.weSent + " " + co.email + ".",
        // Design: setState({ confirm: null, view: "menu" }) without scrolling; here the view is a URL.
        close: () => {
          this.setState({ confirm: null, view: "menu" });
          if (this.props.view !== "menu") this.props.navigate("menu");
        },
      };
    }

    const vids = String(P.heroVideos || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    const SL = this.props.data.SLIDES.map((x, i) => ({ ...x, video: vids[i] || "" })),
      hi = (s.heroIdx || 0) % SL.length,
      curS = SL[hi],
      curIt = s.items.find((i: any) => i.id === curS.id);

    const langDefs: [Locale, string][] = [
      ["es", "ES"],
      ["ca", "CA"],
      ["en", "EN"],
    ];
    const langs = langDefs.map(([id, code]) => {
      const on = lang === id;
      return {
        code,
        pressed: String(on),
        bg: on ? "#FF4D1C" : "transparent",
        fg: on ? "#FFF8F2" : navOverlay ? "#ffffff" : "#2C1D12",
        navBg: on ? "#FF4D1C" : "transparent",
        navFg: on ? "#ffffff" : "#2C1D12",
        go: () => this.setLang(id),
      };
    });

    return {
      isHome: view === "home",
      isMenu: view === "menu",
      isSite: true,
      eta,
      t,
      langs,
      navOverlay,
      navWrapCls: (view === "home" ? "kf-nav-overlay" : "") + (navOverlay ? " kf-nav-transparent" : ""),
      utilBarBg: navOverlay ? "transparent" : "#2C1D12",
      utilBarColor: navOverlay ? "#FFEEE3" : "#D9C6B4",
      headerBg: navOverlay ? "transparent" : "rgba(255,248,242,.97)",
      navTextColor: navOverlay ? "#ffffff" : "#2C1D12",
      navMuted: navOverlay ? "rgba(255,255,255,.75)" : "#8A7160",
      navBorder: navOverlay ? "rgba(255,255,255,.4)" : "#FCE0CC",
      navSocialBg: navOverlay ? "rgba(255,255,255,.16)" : "rgba(255,255,255,.08)",
      headerBlur: navOverlay ? "none" : "blur(14px)",
      nav: {
        home: () => this.go("home"),
        menu: () => this.go("menu"),
        homeBg: view === "home" && !navOverlay ? "#FFEEE3" : "transparent",
        menuBg: view === "menu" && !navOverlay ? "#FFEEE3" : "transparent",
      },
      goCombos: () => {
        const el = document.getElementById("combos");
        if (el) window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 90, behavior: "smooth" });
      },
      cartCount: String(count),
      cartTotal: this.fmt(total),
      hasCart: count > 0,
      openCart: () => this.setState({ drawer: true, step: "cart" }),
      navMenuOpen: s.navMenu,
      toggleNavMenu: () => this.setState((st: any) => ({ navMenu: !st.navMenu })),
      closeNavMenu: () => this.setState({ navMenu: false }),
      navHomeCurrent: view === "home" ? "page" : "false",
      navMenuCurrent: view === "menu" ? "page" : "false",
      openToday,
      heroBg: createElement(Slider, { slides: SL, idx: hi }),
      heroDots: SL.map((x, i) => {
        const it = s.items.find((q: any) => q.id === x.id);
        return {
          label:
            pick("Show ", "Ver ", "Mostra ") +
            (it ? L(it.name) : pick("slide ", "diapositiva ", "diapositiva ") + (i + 1)),
          w: i === hi ? "44px" : "14px",
          bg: "rgba(255,255,255,.35)",
          anim: i === hi && this.props.motion !== false ? "kffill 5.5s linear forwards" : "none",
          go: () => {
            this.setState({ heroIdx: i });
            this.restartSlides();
          },
        };
      }),
      heroCount: String(hi + 1).padStart(2, "0") + " / " + String(SL.length).padStart(2, "0"),
      combosBg: createElement(SlideBg, {
        slides: combosList.map((c: any) => ({ img: c.img, pos: c.pos || "50% 50%" })),
        idx: ci,
        motion: this.props.motion,
      }),
      combosDots: combosList.map((c: any, i: number) => ({
        label: pick("Show ", "Ver ", "Mostra ") + L(c.name),
        w: i === ci ? "32px" : "8px",
        bg: i === ci ? "#C6FF3D" : "rgba(255,255,255,.4)",
        go: () => {
          this.setState({ combosIdx: i });
          this.restartCombos();
        },
      })),
      comboPrev: () => this.stepCombo(-1),
      comboNext: () => this.stepCombo(1),
      comboPrevAria: pick("Previous combo", "Combo anterior", "Combo anterior"),
      comboNextAria: pick("Next combo", "Siguiente combo", "Combo següent"),
      popularItems,
      slide: {
        name: curIt ? L(curIt.name) : "",
        price: curIt ? this.fmt(curIt.price) : "",
        bg: "url(/assets/food/" + curS.img + ")",
        pos: curS.pos,
        add: () => curIt && this.add(curIt.id),
        addAria: pick("Add ", "Añadir ", "Afegeix ") + (curIt ? L(curIt.name) : ""),
      },
      goTacos: () => this.go("menu", { cat: ["tacos"], q: "" }),
      marquee: [0, 1].flatMap(
        () =>
          pick(
            ["Dürüms", "Pizzas", "Burgers", "Fried Tacos", "Combo Menus", "Cold Drinks"] as any,
            ["Dürüms", "Pizzas", "Hamburguesas", "Tacos fritos", "Menús combo", "Bebidas frías"] as any,
            ["Dürüms", "Pizzes", "Hamburgueses", "Tacos fregits", "Menús combo", "Begudes fredes"] as any,
          ) as unknown as string[],
      ),
      cats: s.cats.map((c: any, i: number) => ({
        ...this.vis({ id: c.id, icon: c.icon }),
        name: L(c.name),
        isNew: !!c.isNew,
        count: plural(catCount(c.id)),
        d: String(i % 3),
        go: () => this.go("menu", { cat: [c.id], q: "" }),
      })),
      homeChips,
      homeSections,
      journeyStops: this.props.data.JOURNEY.map((st, i) => {
        const m = st.tIdx != null ? this.props.data.TIMELINE[st.tIdx] : null;
        const hxArr = [10, 36.7, 63.3, 90],
          hyArr = [51.5, 20, 80, 51.5],
          hDelays = [0, 3.2, 6.4, 9.6];
        return {
          xPct: st.x,
          yPct: st.y,
          side: st.side,
          icon: st.icon,
          bg: "url(/assets/food/" + st.img + ")",
          d: String(i % 4),
          pinBg: m ? (st.tIdx % 2 ? "#2E6B4C" : "#FF4D1C") : "#ffffff",
          pinFg: m ? "#fff" : "#E63E00",
          hasYear: !!m,
          year: m ? L(m.year) : "",
          title: m ? L(m.title) : L((st as any).title),
          text: m ? L(m.text) : "",
          hxPct: hxArr[i],
          hyPct: hyArr[i],
          hSide: i % 2 === 0 ? "top" : "bottom",
          hDelay: hDelays[i],
        };
      }),
      galleryItems: this.props.data.GALLERY.map((g: any) => {
        const it = g.itemId ? s.items.find((x: any) => x.id === g.itemId) : null;
        return { bg: "url(/assets/food/" + g.img + ")", name: it ? L(it.name) : L(g.name) };
      }),
      faq: this.props.data.FAQ.map((f, i) => {
        const faqOpen = s.faqOpen || [],
          open = faqOpen.includes(i);
        return {
          q: L(f.q),
          a: L(f.a),
          open: String(open),
          maxH: open ? "400px" : "0px",
          rot: open ? "rotate(180deg)" : "rotate(0deg)",
          d: String(i % 4),
          toggle: () =>
            this.setState((st: any) => {
              const cur = st.faqOpen || [];
              const has = cur.includes(i);
              return { faqOpen: has ? cur.filter((x: number) => x !== i) : [...cur, i] };
            }),
        };
      }),
      combo: combo
        ? {
            name: L(combo.name),
            desc: L(combo.desc),
            priceTxt: this.fmt(combo.price),
            btn: s.cart[combo.id] ? t.addAnother : t.addToOrder,
            add: () => this.add(combo.id),
            all: () => this.go("menu", { cat: ["combos"], q: "" }),
          }
        : { name: "", desc: "", priceTxt: "", btn: "", add: () => {}, all: () => {} },
      reviews: this.props.data.REVIEWS.map((r, i) => {
        const it = s.items.find((x: any) => x.id === r.itemId);
        return {
          name: r.name,
          text: r.text,
          stars: Array.from({ length: 5 }, (_, k) => ({ icon: k < r.stars ? "starf" : "star" })),
          itemName: it ? L(it.name) : "",
          photo: "url(/assets/people/" + r.photo + ")",
          d: String(i % 5),
        };
      }),
      q: s.q,
      onQ: (e: any) => this.setState({ q: e.target.value }),
      sections,
      noResults: !sections.length,
      noResultsMsg,
      chips,
      drawer: {
        open: s.drawer,
        close: () => this.setState({ drawer: false }),
        back: () => this.setState({ step: "cart" }),
        isEmpty: count === 0,
        isCart: count > 0 && !isCheckout,
        isCheckout,
        hasItems: count > 0,
        title: isCheckout ? t.deliveryDetails : t.yourOrder,
        primaryLabel: isCheckout ? t.placeOrder : t.continueBtn,
        primary: () => (isCheckout ? this.place() : this.setState({ step: "checkout" })),
      },
      lines: cartLines.map((l) => ({
        ...this.vis(l.it),
        name: L(l.it.name),
        qty: l.qty,
        priceTxt: this.fmt(l.it.price * l.qty),
        inc: () => this.add(l.it.id),
        dec: () => this.dec(l.it.id),
      })),
      fields,
      pays,
      conf,
    };
  }

  render() {
    return <DesignTemplate v={this.renderVals()} />;
  }
}
