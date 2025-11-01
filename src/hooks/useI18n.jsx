import { useState, useEffect, useMemo, createContext, useContext } from "react";
import { STRINGS } from "../i18n/strings";

const LANG_KEY = "ptpc_lang";
const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const getInitial = () =>
    localStorage.getItem(LANG_KEY) || (navigator.language?.startsWith("ko") ? "ko" : "en");

  const [lang, setLang] = useState(getInitial);

  useEffect(() => {
    localStorage.setItem(LANG_KEY, lang);
  }, [lang]);

  // very small template expander: t("jobRate", {k:"A"}) → "Job A hourly rate"
  const t = useMemo(() => {
    return (key, params = {}) => {
      const dict = STRINGS[lang] || STRINGS.en;
      const raw = dict[key] ?? key;
      return raw.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, p) => (params[p] ?? `{{${p}}}`));
    };
  }, [lang]);

  const value = useMemo(() => ({ t, lang, setLang }), [t, lang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}