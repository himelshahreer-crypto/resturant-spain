import type { Locale } from "@/content/types";
import { Icon } from "@/components/icon/Icon";
import { ICON_PATHS, type IconName } from "@/components/icon/paths";
import { items } from "@/content/menu";
import { getMessages } from "@/i18n/messages";

/** Temporary page for Phase 1: proves fonts, icons, content and strings are wired. Replaced in Phase 2. */
export function Phase1Placeholder({ locale }: { locale: Locale }) {
  const m = getMessages(locale);
  return (
    <main style={{ maxWidth: 1240, margin: "0 auto", padding: "48px clamp(18px,4vw,40px)" }}>
      <h1 style={{ fontSize: "clamp(34px,4.4vw,54px)", margin: 0 }}>Kebab Factory</h1>
      <p style={{ color: "#8A7160" }}>
        Phase 1 foundation · {locale.toUpperCase()} · {m.menuNav}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, color: "#E63E00", margin: "24px 0" }}>
        {(Object.keys(ICON_PATHS) as IconName[]).map((n) => (
          <Icon key={n} name={n} size={22} />
        ))}
      </div>
      <ul>
        {items.map((it) => (
          <li key={it.id}>
            {it.name[locale]}: {(it.priceCents / 100).toFixed(2)} €
          </li>
        ))}
      </ul>
    </main>
  );
}
