// Converts the design's <x-dc> template (design/index.html) into JSX that
// renders the same DOM the design's runtime (design/support.js) produces.
//
// It mirrors the runtime's rules exactly (see "dc-runtime semantics" below):
// text interpolations render as <span class="sc-interp">, whitespace-only text
// is kept only if it contains a space, style strings are resolved first and
// then split with the runtime's naive cssToObj, style-hover/active/focus become
// generated classes with !important, sc-if is a truthiness check, sc-for maps
// over arrays (anything else renders nothing).
//
// Output (both generated, do not edit by hand):
//   src/legacy/DesignTemplate.tsx   the page markup as a component of `v` (the view model)
//   public/styles/pseudo.css        the hover/active/focus classes
//
// Run: node scripts/codemod/template-to-jsx.mjs   (also: pnpm codemod)
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { parseFragment } from "parse5";

const html = readFileSync("design/index.html", "utf8");
const open = html.indexOf("<x-dc>");
const close = html.lastIndexOf("</x-dc>");
let tpl = html.slice(open + "<x-dc>".length, close);
// The <helmet> block (fonts, title, the <style> sheet) is handled by the app layout and design.css.
tpl = tpl.replace(/<helmet>[\s\S]*?<\/helmet>/, "");

const fragment = parseFragment(tpl);

// ---------- dc-runtime semantics, mirrored ----------

/** Runtime cssToObj: split on ";", first ":" separates prop/value, kebab → camel except custom props. */
function cssToObj(css) {
  const o = {};
  for (const decl of css.split(";")) {
    const i = decl.indexOf(":");
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim();
    o[prop.startsWith("--") ? prop : prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = decl.slice(i + 1).trim();
  }
  return o;
}

/** Runtime importantify (pseudo-class rules get !important on every declaration). */
function importantify(css) {
  return css
    .split(";")
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => (/!\s*important$/i.test(d) ? d : d + " !important"))
    .join(";");
}

/** Relative asset URLs only worked at the design's single page; the port serves them from the site root. */
const absAssets = (s) => s.replace(/(^|[\s("'])assets\//g, "$1/assets/");

// ---------- expressions ----------

/** Compiles a template expression ({{ … }}) to JS. Only paths, !, literals are used by this design. */
function expr(src, scope) {
  const e = src.trim();
  if (e.startsWith("!")) return `!(${expr(e.slice(1), scope)})`;
  if (["true", "false", "null", "undefined"].includes(e) || /^-?\d+(\.\d+)?$/.test(e)) return e;
  if (/^(['"]).*\1$/.test(e)) return JSON.stringify(e.slice(1, -1));
  if (!/^[A-Za-z_$][\w$]*(\.[A-Za-z_$\d][\w$]*)*$/.test(e)) throw new Error(`Unsupported template expression: ${e}`);
  const [head, ...rest] = e.split(".");
  const base = scope.has(head) ? head : `v.${head}`;
  return rest.length ? `${base}?.${rest.join("?.")}` : base;
}

const INTERP = /\{\{([\s\S]+?)\}\}/g;
const hasInterp = (s) => s.includes("{{");

/** Mixed attribute: the runtime joins parts with `?? ""`. */
function templateLiteral(raw, scope) {
  const parts = raw.split(INTERP);
  return (
    "`" +
    parts.map((p, i) => (i & 1 ? "${" + `(${expr(p, scope)}) ?? ""` + "}" : p.replace(/[`\\$]/g, "\\$&"))).join("") +
    "`"
  );
}

/** Attribute value as JSX: whole interpolation keeps its raw value (functions, booleans…). */
function attrValue(raw, scope) {
  const whole = raw.match(/^\s*\{\{([\s\S]+?)\}\}\s*$/);
  if (whole) return `{${expr(whole[1], scope)}}`;
  if (hasInterp(raw)) return `{${templateLiteral(raw, scope)}}`;
  return JSON.stringify(raw);
}

// ---------- attributes ----------

const REACT_ATTR = {
  class: "className",
  for: "htmlFor",
  autocomplete: "autoComplete",
  tabindex: "tabIndex",
  "stroke-width": "strokeWidth",
  "stroke-linecap": "strokeLinecap",
  "stroke-linejoin": "strokeLinejoin",
  "stroke-dasharray": "strokeDasharray",
  "stroke-dashoffset": "strokeDashoffset",
};
const EVENTS = {
  onclick: "onClick",
  onchange: "onChange",
  oninput: "onInput",
  onkeydown: "onKeyDown",
  onmouseenter: "onMouseEnter",
  onfocus: "onFocus",
  onblur: "onBlur",
};
const DROP = (name) => name.startsWith("hint-");

const pseudoRules = new Map(); // className -> css rule

function pseudoClass(pseudo, css) {
  const cls =
    "kfp-" +
    createHash("sha1")
      .update(pseudo + "|" + css)
      .digest("hex")
      .slice(0, 8);
  const sel = pseudo === "before" || pseudo === "after" ? `.${cls}::${pseudo}` : `.${cls}:${pseudo}`;
  pseudoRules.set(cls, `${sel}{${pseudo === "before" || pseudo === "after" ? css : importantify(css)}}`);
  return cls;
}

function genAttrs(el, scope) {
  const out = [];
  const pseudo = [];
  let className = null;
  for (const { name, value } of el.attrs) {
    if (DROP(name)) continue;
    if (name.startsWith("style-")) {
      if (hasInterp(value)) throw new Error(`Interpolated ${name} is not supported`);
      pseudo.push(pseudoClass(name.slice(6), absAssets(value)));
      continue;
    }
    if (name === "style") {
      const raw = absAssets(value);
      if (hasInterp(raw)) {
        out.push(`style={cssToObj(${templateLiteral(raw, scope)})}`);
      } else {
        const obj = cssToObj(raw);
        const hasVars = Object.keys(obj).some((k) => k.startsWith("--"));
        out.push(`style={${JSON.stringify(obj)}${hasVars ? " as CSSProperties" : ""}}`);
      }
      continue;
    }
    if (name === "class") {
      className = value;
      continue;
    }
    if (EVENTS[name]) {
      out.push(`${EVENTS[name]}=${attrValue(value, scope)}`);
      continue;
    }
    const v = name === "src" || name === "href" ? absAssets(value) : value;
    out.push(`${REACT_ATTR[name] ?? name}=${attrValue(v, scope)}`);
  }
  if (className != null || pseudo.length) {
    if (className != null && hasInterp(className)) {
      out.unshift(
        `className={cx(${templateLiteral(className, scope)}${pseudo.map((p) => `, ${JSON.stringify(p)}`).join("")})}`,
      );
    } else {
      out.unshift(`className=${JSON.stringify([className, ...pseudo].filter(Boolean).join(" "))}`);
    }
  }
  return out;
}

// ---------- nodes ----------

const VOID = new Set([
  "img",
  "input",
  "br",
  "hr",
  "meta",
  "link",
  "source",
  "area",
  "col",
  "embed",
  "param",
  "track",
  "wbr",
]);

function genChildren(node, scope, depth) {
  return node.childNodes.map((c) => genNode(c, scope, depth)).filter((x) => x != null);
}

function genText(txt, scope) {
  if (!hasInterp(txt)) {
    if (!txt.trim() && !txt.includes(" ")) return null; // runtime drops whitespace-only text without a space
    return `{${JSON.stringify(txt)}}`;
  }
  const parts = txt.split(INTERP);
  return parts
    .map((p, i) => (i & 1 ? `{interp(${expr(p, scope)})}` : p === "" ? null : `{${JSON.stringify(p)}}`))
    .filter(Boolean)
    .join("");
}

function genNode(node, scope, depth) {
  const pad = "  ".repeat(depth);
  if (node.nodeName === "#text") return genText(node.value, scope);
  if (node.nodeName === "#comment") return null;
  const tag = node.tagName;
  const attr = (n) => node.attrs.find((a) => a.name === n)?.value;

  if (tag === "sc-if") {
    const kids = genChildren(node, scope, depth + 1);
    return `{${expr(attr("value").match(/\{\{([\s\S]+?)\}\}/)[1], scope)} ? (\n${pad}  <>\n${kids.map((k) => pad + "    " + k).join("\n")}\n${pad}  </>\n${pad}) : null}`;
  }
  if (tag === "sc-for") {
    const list = expr(attr("list").match(/\{\{([\s\S]+?)\}\}/)[1], scope);
    const as = attr("as") || "item";
    const inner = new Set(scope).add(as);
    const kids = genChildren(node, inner, depth + 2);
    return `{asArray(${list}).map((${as}, $index) => (\n${pad}  <Fragment key={$index}>\n${kids.map((k) => pad + "    " + k).join("\n")}\n${pad}  </Fragment>\n${pad}))}`;
  }
  if (tag === "kf-i") {
    const props = [];
    for (const { name, value } of node.attrs) {
      if (name === "n") props.push(`name=${attrValue(value, scope)}`);
      else if (name === "s") props.push(`size=${attrValue(value, scope)}`);
      else if (name === "w") props.push(`stroke=${attrValue(value, scope)}`);
      else if (name === "style")
        props.push(
          hasInterp(value)
            ? `style={cssToObj(${templateLiteral(value, scope)})}`
            : `style={${JSON.stringify(cssToObj(value))}}`,
        );
      else throw new Error(`Unexpected kf-i attribute ${name}`);
    }
    return `<Icon ${props.join(" ")} />`;
  }
  if (tag.includes("-")) throw new Error(`Unknown custom element <${tag}>`);

  const attrs = genAttrs(node, scope);
  const open = `<${tag}${attrs.length ? " " + attrs.join(" ") : ""}`;
  if (VOID.has(tag)) return `${open} />`;
  const kids = genChildren(tag === "template" ? node.content : node, scope, depth + 1);
  if (!kids.length) return `${open}></${tag}>`;
  return `${open}>\n${kids.map((k) => pad + "  " + k).join("\n")}\n${pad}</${tag}>`;
}

const roots = fragment.childNodes.filter((n) => n.nodeName !== "#text" || n.value.trim() || n.value.includes(" "));
const elements = roots.filter((n) => n.nodeName !== "#text" && n.nodeName !== "#comment");
if (elements.length !== 1) throw new Error(`Expected one root element, found ${elements.length}`);
const body = genNode(elements[0], new Set(), 2);

const out = `// Generated by scripts/codemod/template-to-jsx.mjs from design/index.html. Do not edit by hand.
// Renders the same DOM as the design's runtime. Faithful-port stage (Phase 2); refactored into
// components in Phase 6. The view model is typed loosely on purpose.
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element -- decorative <img>s as in the design; image pipeline in Phase 4 */
import { Fragment, type CSSProperties } from "react";
import { Icon } from "@/components/icon/Icon";
import { asArray, cssToObj, cx, interp } from "./runtime";

export function DesignTemplate({ v }: { v: any }) {
  return (
    ${body}
  );
}
`;
writeFileSync("src/legacy/DesignTemplate.tsx", out);

const css =
  "/* Generated by scripts/codemod/template-to-jsx.mjs from the design's style-hover/style-active/style-focus\n" +
  "   attributes. Same !important semantics as the design runtime. Do not edit by hand. */\n" +
  [...pseudoRules.values()].join("\n") +
  "\n";
writeFileSync("public/styles/pseudo.css", css);
console.log(`DesignTemplate.tsx: ${out.split("\n").length} lines; pseudo.css: ${pseudoRules.size} rules`);
