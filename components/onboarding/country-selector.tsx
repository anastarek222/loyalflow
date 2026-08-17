"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { COUNTRY_OPTIONS } from "@/lib/onboarding/countries";
import {
  findCountryByCanonicalText,
  findCountryByIso2,
  getCountryDefaults,
  searchCountryOptions,
} from "@/lib/onboarding/country-search";

type Props = {
  value?: string;
  name?: string;
  required?: boolean;
  language?: "AR" | "EN";
  onChange: (country: {
    name: string;
    iso2: string;
    dialCode: string;
    currency: string;
    timezone: string;
    timezoneRequiresChoice: boolean;
  }) => void;
};

export type CountrySelectorHandle = {
  close: () => void;
};

export const CountrySelector = forwardRef<CountrySelectorHandle, Props>(
  function CountrySelector(
    { value = "", name, onChange, required, language },
    ref,
  ) {
    const id = useId();
    const rootRef = useRef<HTMLDivElement>(null);
    const [query, setQuery] = useState(value);
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [resolvedLanguage, setResolvedLanguage] = useState<"AR" | "EN">(
      language ?? "EN",
    );
    const results = useMemo(
      () => searchCountryOptions(COUNTRY_OPTIONS, query, 100),
      [query],
    );
    const copy =
      resolvedLanguage === "AR"
        ? {
            label: "الدولة",
            placeholder: "ابحث بالدولة أو رمز ISO أو كود الاتصال",
            empty: "لا توجد دول مطابقة لهذا البحث.",
          }
        : {
            label: "Country",
            placeholder: "Search country, ISO code, or dial code",
            empty: "No countries match that search.",
          };

    useEffect(() => {
      if (language) {
        setResolvedLanguage(language);
        return;
      }
      setResolvedLanguage(
        document.documentElement.lang.toLowerCase().startsWith("ar")
          ? "AR"
          : "EN",
      );
    }, [language]);

    useEffect(() => {
      if (!open || results.length === 0) {
        setActiveIndex(-1);
        return;
      }
      setActiveIndex((current) => {
        if (current >= 0 && current < results.length) return current;
        const selectedIndex = results.findIndex((country) => country.name === value);
        return selectedIndex >= 0 ? selectedIndex : 0;
      });
    }, [open, results, value]);

    const choose = useCallback(
      (iso2: string) => {
        const country = findCountryByIso2(COUNTRY_OPTIONS, iso2);
        if (!country) return;
        const defaults = getCountryDefaults(country);
        setQuery(country.name);
        setOpen(false);
        setActiveIndex(-1);
        onChange({ name: country.name, iso2: country.iso2, ...defaults });
      },
      [onChange],
    );

    const close = useCallback(() => {
      setQuery(value);
      setOpen(false);
      setActiveIndex(-1);
    }, [value]);

    const commitTypedValue = useCallback(
      (typedValue: string) => {
        const country = findCountryByCanonicalText(COUNTRY_OPTIONS, typedValue);
        if (country) {
          if (country.name === value) {
            close();
            return;
          }
          choose(country.iso2);
          return;
        }
        close();
      },
      [choose, close, value],
    );

    useImperativeHandle(ref, () => ({ close }), [close]);

    useEffect(() => {
      if (!open) setQuery(value);
    }, [open, value]);

    useEffect(() => {
      if (!open) return;
      const handleOutsideClick = (event: MouseEvent) => {
        if (rootRef.current?.contains(event.target as Node)) return;
        window.setTimeout(() => commitTypedValue(query), 0);
      };
      document.addEventListener("click", handleOutsideClick);
      return () => document.removeEventListener("click", handleOutsideClick);
    }, [commitTypedValue, open, query]);

    useEffect(() => {
      if (!open || activeIndex < 0) return;
      document
        .getElementById(`${id}-option-${activeIndex}`)
        ?.scrollIntoView({ block: "nearest" });
    }, [activeIndex, id, open]);

    return (
      <div
        ref={rootRef}
        className="relative"
        data-country-selector-open={open ? "true" : "false"}
      >
        <label htmlFor={id} className="sr-only">
          {copy.label}
        </label>
        {name ? <input type="hidden" name={name} value={value} /> : null}
        <input
          id={id}
          value={query}
          required={required && !value}
          autoComplete="country-name"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={
            open && activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined
          }
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={(event) => {
            const nextQuery = event.target.value;
            setQuery(nextQuery);
            setOpen(true);
            setActiveIndex(0);
            const exactCountry = findCountryByCanonicalText(
              COUNTRY_OPTIONS,
              nextQuery,
            );
            if (exactCountry) choose(exactCountry.iso2);
          }}
          onBlur={(event) => {
            if (rootRef.current?.contains(event.relatedTarget as Node)) return;
            window.setTimeout(() => commitTypedValue(query), 0);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              if (!open) return;
              event.preventDefault();
              close();
              return;
            }

            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              if (!open) setOpen(true);
              if (!results.length) return;
              setActiveIndex((current) => {
                if (event.key === "ArrowDown") {
                  return current < 0 ? 0 : (current + 1) % results.length;
                }
                return current <= 0 ? results.length - 1 : current - 1;
              });
              return;
            }

            if (event.key === "Home" && open && results.length) {
              event.preventDefault();
              setActiveIndex(0);
              return;
            }

            if (event.key === "End" && open && results.length) {
              event.preventDefault();
              setActiveIndex(results.length - 1);
              return;
            }

            if (event.key === "Enter" && open && activeIndex >= 0) {
              const activeCountry = results[activeIndex];
              if (!activeCountry) return;
              event.preventDefault();
              choose(activeCountry.iso2);
            }
          }}
          placeholder={copy.placeholder}
          className="min-h-12 w-full min-w-0 rounded-xl border border-border bg-surface px-4 py-3 text-foreground outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
        />
        {open ? (
          <div
            id={`${id}-list`}
            role="listbox"
            aria-label={copy.label}
            className="mt-1 max-h-[min(16rem,40vh)] w-full overflow-y-auto rounded-xl border border-border bg-surface shadow-lg"
          >
            {results.length ? (
              results.map((country, index) => (
                <button
                  id={`${id}-option-${index}`}
                  key={country.iso2}
                  type="button"
                  role="option"
                  tabIndex={-1}
                  aria-selected={index === activeIndex}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => choose(country.iso2)}
                  className={`flex min-h-11 w-full min-w-0 items-center gap-2 px-3 text-start text-sm text-foreground ${
                    index === activeIndex
                      ? "bg-primary-subtle text-primary"
                      : "hover:bg-surface-subtle"
                  }`}
                >
                  <span aria-hidden>{country.flag}</span>
                  <span className="min-w-0 flex-1 truncate">{country.name}</span>
                  <span className="shrink-0 text-foreground-subtle">
                    {country.iso2} · {country.dialCode}
                  </span>
                </button>
              ))
            ) : (
              <p className="px-3 py-3 text-sm text-foreground-subtle">
                {copy.empty}
              </p>
            )}
          </div>
        ) : null}
      </div>
    );
  },
);
