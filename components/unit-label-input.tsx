"use client";

import {
  useId,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
} from "react";

import {
  STANDARD_CARD_UNIT_LABEL_MAX_LENGTH,
  standardCardGraphemeLength,
} from "@/lib/cards/standard-card-text";

type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "maxLength" | "onChange"
> & {
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
};

function initialCount(value: Props["defaultValue"] | Props["value"]) {
  if (value === null || value === undefined) return 0;
  return standardCardGraphemeLength(String(value));
}

export function UnitLabelInput({
  defaultValue,
  value,
  onChange,
  "aria-describedby": describedBy,
  "aria-invalid": ariaInvalid,
  ...props
}: Props) {
  const counterId = useId();
  const [count, setCount] = useState(() =>
    initialCount(value ?? defaultValue),
  );
  const overLimit = count > STANDARD_CARD_UNIT_LABEL_MAX_LENGTH;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setCount(standardCardGraphemeLength(event.currentTarget.value));
    onChange?.(event);
  }

  return (
    <span className="block">
      <input
        {...props}
        value={value}
        defaultValue={defaultValue}
        aria-invalid={overLimit || ariaInvalid || undefined}
        aria-describedby={
          describedBy ? `${describedBy} ${counterId}` : counterId
        }
        onChange={handleChange}
      />
      <span
        id={counterId}
        data-unit-label-counter
        data-unit-label-over-limit={overLimit ? "true" : "false"}
        className={`mt-1 block text-end text-xs font-medium tabular-nums ${
          overLimit ? "text-danger" : "text-foreground-subtle"
        }`}
      >
        {count}/{STANDARD_CARD_UNIT_LABEL_MAX_LENGTH}
      </span>
    </span>
  );
}
