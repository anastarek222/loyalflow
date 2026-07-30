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
function CountrySelector({
  value = "",
  name,
  onChange,
  required,
}, ref) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const results = useMemo(
    () => searchCountryOptions(COUNTRY_OPTIONS, query, 100),
    [query],
  );

  const choose = useCallback((iso2: string) => {
    const country = findCountryByIso2(COUNTRY_OPTIONS, iso2);
    if (!country) return;
    const defaults = getCountryDefaults(country);
    setQuery(country.name);
    setOpen(false);
    onChange({ name: country.name, iso2: country.iso2, ...defaults });
  }, [onChange]);

  const close = useCallback(() => {
    setQuery(value);
    setOpen(false);
  }, [value]);

  const commitTypedValue = useCallback((typedValue: string) => {
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
  }, [choose, close, value]);

  useImperativeHandle(ref, () => ({ close }), [close]);

  useEffect(() => {
    if (!open) setQuery(value);
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      // Let the clicked control (especially mobile navigation below this
      // disclosure) finish its own click before collapsing the list.
      window.setTimeout(() => commitTypedValue(query), 0);
    };
    document.addEventListener("click", handleOutsideClick);
    return () =>
      document.removeEventListener("click", handleOutsideClick);
  }, [commitTypedValue, open, query]);

  return (
    <div
      ref={rootRef}
      className="relative"
      data-country-selector-open={open ? "true" : "false"}
    >
      <label htmlFor={id} className="sr-only">
        Country
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
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onChange={(event) => {
          const nextQuery = event.target.value;
          setQuery(nextQuery);
          setOpen(true);
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
            event.preventDefault();
            close();
          }
        }}
        placeholder="Search country, ISO code, or dial code"
        className="min-h-12 w-full min-w-0 rounded-xl border px-4 py-3"
      />
      {open ? (
        <div
          id={`${id}-list`}
          role="listbox"
          className="mt-1 max-h-[min(16rem,40vh)] w-full overflow-y-auto rounded-xl border bg-white shadow-lg"
        >
          {results.length ? (
            results.map((country) => (
              <button
                key={country.iso2}
                type="button"
                role="option"
                aria-selected={query === country.name}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(country.iso2)}
                className="flex min-h-11 w-full min-w-0 items-center gap-2 px-3 text-left text-sm hover:bg-slate-50"
              >
                <span aria-hidden>{country.flag}</span>
                <span className="min-w-0 flex-1 truncate">{country.name}</span>
                <span className="shrink-0 text-slate-500">
                  {country.iso2} · {country.dialCode}
                </span>
              </button>
            ))
          ) : (
            <p className="px-3 py-3 text-sm text-slate-500">
              No countries match that search.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
});
