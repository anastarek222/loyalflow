"use client";

import { useId, useMemo, useState } from "react";
import { COUNTRY_OPTIONS } from "@/lib/onboarding/countries";
import {
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

export function CountrySelector({
  value = "",
  name,
  onChange,
  required,
}: Props) {
  const id = useId();
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const results = useMemo(
    () => searchCountryOptions(COUNTRY_OPTIONS, query, 100),
    [query],
  );

  const choose = (iso2: string) => {
    const country = findCountryByIso2(COUNTRY_OPTIONS, iso2);
    if (!country) return;
    const defaults = getCountryDefaults(country);
    setQuery(country.name);
    setOpen(false);
    onChange({ name: country.name, iso2: country.iso2, ...defaults });
  };

  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        Country
      </label>
      <input
        id={id}
        name={name}
        value={query}
        required={required}
        autoComplete="country-name"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        placeholder="Search country, ISO code, or dial code"
        className="min-h-12 w-full min-w-0 rounded-xl border px-4 py-3"
      />
      {open ? (
        <div
          id={`${id}-list`}
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border bg-white shadow-lg"
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
}
