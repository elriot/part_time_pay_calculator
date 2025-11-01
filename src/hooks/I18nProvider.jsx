import { useState, useEffect, useMemo, useCallback } from "react";
import { STRINGS } from "../i18n/strings";
import { I18nContext } from "./I18nContext";

const LANG_KEY = "ptpc_lang";
const SUPPORTED_LANGS = ["en", "ko", "ja"];

export function I18nProvider({ children }) {
  const getInitial = () => {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved && SUPPORTED_LANGS.includes(saved)) return saved;
    const nav = navigator.language?.toLowerCase() ?? "";
    if (nav.startsWith("ko")) return "ko";
    if (nav.startsWith("ja")) return "ja";
    return "en";
  };

  const [lang, setLang] = useState(getInitial);

  useEffect(() => {
    if (SUPPORTED_LANGS.includes(lang)) {
      localStorage.setItem(LANG_KEY, lang);
    }
  }, [lang]);

  const changeLang = useCallback(
    (next) => {
      if (SUPPORTED_LANGS.includes(next)) {
        setLang(next);
      }
    },
    [setLang]
  );

  const t = useMemo(() => {
    return (key, params = {}) => {
      const dict = STRINGS[lang] || STRINGS.en;
      const raw = dict[key] ?? key;
      return raw.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, p) => (params[p] ?? `{{${p}}}`));
    };
  }, [lang]);

  const value = useMemo(() => ({ t, lang, setLang: changeLang }), [t, lang, changeLang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
