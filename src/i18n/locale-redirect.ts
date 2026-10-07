import { PREFIXED_LOCALES } from "./config";

/**
 * Inline <head> script for the Spanish (default) pages. The design remembers the visitor's
 * language (saved state "kf4"); with languages in the URL, a returning visitor who chose
 * Catalan or English is sent to /ca/… or /en/… before anything is painted. Visitors without
 * saved state (and crawlers) stay on the URL's language. Keep it tiny and dependency-free.
 */
export const LOCALE_REDIRECT_SCRIPT = `(function(){try{var s=JSON.parse(localStorage.getItem("kf4")||"null");var l=s&&s.v===1&&s.lang;if(${JSON.stringify(
  PREFIXED_LOCALES,
)}.indexOf(l)>-1)location.replace("/"+l+location.pathname+location.search+location.hash)}catch(e){}})()`;
