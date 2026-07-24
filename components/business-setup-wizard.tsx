"use client";

import {
  useRef,
  useState,
} from "react";

import {
  MIN_PASSWORD_LENGTH,
} from "@/lib/auth/password-policy";

type Props = {
  action: (
    formData: FormData
  ) => void | Promise<void>;
};

const steps = [
  "Business",
  "Owner",
  "Loyalty",
  "Branding",
  "Review",
] as const;

type ReviewData = {
  name: string;
  contactPhone: string;
  industry: string;
  currency: string;
  timezone: string;
  employeeCount: string;
  email: string;
  country: string;
  city: string;
  website: string;
  taxNumber: string;

  ownerFirstName: string;
  ownerLastName: string;
  ownerEmail: string;
  ownerPhone: string;

  loyaltyMode: string;
  unitName: string;
  rewardName: string;
  rewardThreshold: string;
  earnAmount: string;

  primaryColor: string;
  secondaryColor: string;
  themePreset: string;
  cardStyle: string;
  fontFamily: string;
  logoPreview: string;
};

const loyaltyLabels: Record<
  string,
  string
> = {
  VISITS: "Visits",
  POINTS: "Points",
  SALES_AMOUNT: "Sales Amount",
};

const themeLabels: Record<
  string,
  string
> = {
  DEFAULT: "Default",
  MINIMAL: "Minimal",
  LUXURY: "Luxury",
  DARK: "Dark",
  MODERN: "Modern",
  GRADIENT: "Gradient",
};

const cardStyleLabels: Record<
  string,
  string
> = {
  CLASSIC: "Classic",
  COMPACT: "Compact",
  PREMIUM: "Premium",
};

const fontLabels: Record<
  string,
  string
> = {
  INTER: "Inter",
  CAIRO: "Cairo",
  POPPINS: "Poppins",
};

function getValue(
  formData: FormData,
  name: string
) {
  return String(
    formData.get(name) ?? ""
  ).trim();
}

function isValidEmail(
  value: string
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value
  );
}

function isValidHttpUrl(
  value: string
) {
  if (!value) {
    return true;
  }

  try {
    const url =
      new URL(value);

    return (
      url.protocol === "http:" ||
      url.protocol === "https:"
    );
  } catch {
    return false;
  }
}

function isValidHexColor(
  value: string
) {
  return /^#[0-9a-fA-F]{6}$/.test(
    value
  );
}

function getReviewData(
  formData: FormData,
  logoPreview: string
): ReviewData {
  return {
    name: getValue(
      formData,
      "name"
    ),
    contactPhone: getValue(
      formData,
      "contactPhone"
    ),
    industry: getValue(
      formData,
      "industry"
    ),
    currency: getValue(
      formData,
      "currency"
    ),
    timezone: getValue(
      formData,
      "timezone"
    ),
    employeeCount: getValue(
      formData,
      "employeeCount"
    ),
    email: getValue(
      formData,
      "email"
    ),
    country: getValue(
      formData,
      "country"
    ),
    city: getValue(
      formData,
      "city"
    ),
    website: getValue(
      formData,
      "website"
    ),
    taxNumber: getValue(
      formData,
      "taxNumber"
    ),

    ownerFirstName: getValue(
      formData,
      "ownerFirstName"
    ),
    ownerLastName: getValue(
      formData,
      "ownerLastName"
    ),
    ownerEmail: getValue(
      formData,
      "ownerEmail"
    ),
    ownerPhone: getValue(
      formData,
      "ownerPhone"
    ),

    loyaltyMode: getValue(
      formData,
      "loyaltyMode"
    ),
    unitName: getValue(
      formData,
      "unitName"
    ),
    rewardName: getValue(
      formData,
      "rewardName"
    ),
    rewardThreshold: getValue(
      formData,
      "rewardThreshold"
    ),
    earnAmount: getValue(
      formData,
      "earnAmount"
    ),

    primaryColor: getValue(
      formData,
      "primaryColor"
    ),
    secondaryColor: getValue(
      formData,
      "secondaryColor"
    ),
    themePreset: getValue(
      formData,
      "themePreset"
    ),
    cardStyle: getValue(
      formData,
      "cardStyle"
    ),
    fontFamily: getValue(
      formData,
      "fontFamily"
    ),
    logoPreview,
  };
}

export default function BusinessSetupWizard({
  action,
}: Props) {
  const formRef =
    useRef<HTMLFormElement>(
      null
    );

  const [step, setStep] =
    useState(0);

  const [
    validationError,
    setValidationError,
  ] = useState("");

  const [
    reviewData,
    setReviewData,
  ] =
    useState<ReviewData | null>(
      null
    );

  const [logoUrl, setLogoUrl] =
    useState("");

  const [logoPreview, setLogoPreview] =
    useState("");

  function validateStep(
    currentStep: number,
    formData: FormData
  ) {
    if (currentStep === 0) {
      const name =
        getValue(
          formData,
          "name"
        );

      const employeeCount =
        getValue(
          formData,
          "employeeCount"
        );

      const email =
        getValue(
          formData,
          "email"
        );

      const website =
        getValue(
          formData,
          "website"
        );

      if (name.length < 2) {
        return "Business name must contain at least 2 characters.";
      }

      if (
        employeeCount &&
        (
          !Number.isInteger(
            Number(
              employeeCount
            )
          ) ||
          Number(
            employeeCount
          ) < 0
        )
      ) {
        return "Number of employees must be a valid non-negative whole number.";
      }

      if (
        email &&
        !isValidEmail(
          email
        )
      ) {
        return "Enter a valid business email address.";
      }

      if (
        !isValidHttpUrl(
          website
        )
      ) {
        return "Website must be a valid http:// or https:// URL.";
      }
    }

    if (currentStep === 1) {
      const firstName =
        getValue(
          formData,
          "ownerFirstName"
        );

      const email =
        getValue(
          formData,
          "ownerEmail"
        );

      const password =
        getValue(
          formData,
          "ownerPassword"
        );

      if (
        firstName.length < 2
      ) {
        return "Owner first name must contain at least 2 characters.";
      }

      if (
        !isValidEmail(
          email
        )
      ) {
        return "Enter a valid owner email address.";
      }

      if (
        password.length <
        MIN_PASSWORD_LENGTH
      ) {
        return `Owner password must contain at least ${MIN_PASSWORD_LENGTH} characters.`;
      }

      if (
        password.length > 100
      ) {
        return "Owner password is too long.";
      }
    }

    if (currentStep === 2) {
      const unitName =
        getValue(
          formData,
          "unitName"
        );

      const rewardName =
        getValue(
          formData,
          "rewardName"
        );

      const rewardThreshold =
        Number(
          getValue(
            formData,
            "rewardThreshold"
          )
        );

      const earnAmount =
        Number(
          getValue(
            formData,
            "earnAmount"
          )
        );

      if (!unitName) {
        return "Loyalty unit name is required.";
      }

      if (
        rewardName.length < 2
      ) {
        return "Reward name must contain at least 2 characters.";
      }

      if (
        !Number.isInteger(
          rewardThreshold
        ) ||
        rewardThreshold < 1
      ) {
        return "Reward threshold must be a positive whole number.";
      }

      if (
        !Number.isInteger(
          earnAmount
        ) ||
        earnAmount < 1
      ) {
        return "Earn amount must be a positive whole number.";
      }
    }

    if (currentStep === 3) {
      const primaryColor =
        getValue(
          formData,
          "primaryColor"
        );

      const secondaryColor =
        getValue(
          formData,
          "secondaryColor"
        );

      if (
        !isValidHexColor(
          primaryColor
        ) ||
        !isValidHexColor(
          secondaryColor
        )
      ) {
        return "Brand colors must be valid hexadecimal colors.";
      }
    }

    return null;
  }

  function goNext() {
    if (
      !formRef.current
    ) {
      return;
    }

    const formData =
      new FormData(
        formRef.current
      );

    const error =
      validateStep(
        step,
        formData
      );

    if (error) {
      setValidationError(
        error
      );
      return;
    }

    setValidationError("");

    if (step === 3) {
      setReviewData(
        getReviewData(
          formData,
          logoPreview
        )
      );
    }

    setStep((current) =>
      Math.min(
        current + 1,
        steps.length - 1
      )
    );
  }

  function goBack() {
    setValidationError("");

    setStep((current) =>
      Math.max(
        current - 1,
        0
      )
    );
  }

  function editStep(
    nextStep: number
  ) {
    setValidationError("");
    setStep(nextStep);
  }

  return (
    <form
      ref={formRef}
      action={action}
      className="mt-6 space-y-5"
    >
      <div className="mb-6">
        <div className="flex items-center justify-between gap-2 overflow-x-auto">
          {steps.map(
            (item, index) => (
              <button
                key={item}
                type="button"
                disabled={
                  index > step
                }
                onClick={() => {
                  if (
                    index < step
                  ) {
                    editStep(
                      index
                    );
                  }
                }}
                className={`whitespace-nowrap text-xs font-bold ${
                  index === step
                    ? "text-violet-600"
                    : index < step
                      ? "text-slate-700"
                      : "cursor-default text-slate-400"
                }`}
              >
                {index + 1}.{" "}
                {item}
              </button>
            )
          )}
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-2 rounded-full bg-violet-600 transition-all"
            style={{
              width:
                `${
                  (
                    (step + 1) /
                    steps.length
                  ) * 100
                }%`,
            }}
          />
        </div>
      </div>

      {validationError ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
        >
          {validationError}
        </div>
      ) : null}

      <div
        className={
          step === 0
            ? "block"
            : "hidden"
        }
      >
        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-black">
              Business Information
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Basic information used to configure the business.
            </p>
          </div>

          <input
            name="name"
            required
            minLength={2}
            maxLength={80}
            placeholder="Business name"
            className="w-full rounded-xl border px-4 py-3"
          />

          <input
            name="contactPhone"
            placeholder="Business phone"
            maxLength={25}
            className="w-full rounded-xl border px-4 py-3"
          />

          <input
            name="industry"
            placeholder="Industry"
            maxLength={100}
            className="w-full rounded-xl border px-4 py-3"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <select
              name="currency"
              defaultValue="EGP"
              className="w-full rounded-xl border px-4 py-3"
            >
              <option value="EGP">
                EGP — Egyptian Pound
              </option>
              <option value="USD">
                USD — US Dollar
              </option>
              <option value="EUR">
                EUR — Euro
              </option>
              <option value="GBP">
                GBP — British Pound
              </option>
              <option value="SAR">
                SAR — Saudi Riyal
              </option>
              <option value="AED">
                AED — UAE Dirham
              </option>
            </select>

            <input
              name="timezone"
              defaultValue="Africa/Cairo"
              placeholder="Timezone"
              className="w-full rounded-xl border px-4 py-3"
            />
          </div>

          <input
            name="employeeCount"
            type="number"
            min="0"
            max="100000"
            step="1"
            placeholder="Number of employees"
            className="w-full rounded-xl border px-4 py-3"
          />

          <input
            name="email"
            type="email"
            placeholder="Business email"
            maxLength={255}
            className="w-full rounded-xl border px-4 py-3"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <input
              name="country"
              placeholder="Country"
              maxLength={100}
              className="w-full rounded-xl border px-4 py-3"
            />

            <input
              name="city"
              placeholder="City"
              maxLength={100}
              className="w-full rounded-xl border px-4 py-3"
            />
          </div>

          <input
            name="website"
            type="url"
            placeholder="https://example.com"
            maxLength={300}
            className="w-full rounded-xl border px-4 py-3"
          />

          <input
            name="taxNumber"
            placeholder="Tax number (optional)"
            maxLength={100}
            className="w-full rounded-xl border px-4 py-3"
          />
        </section>
      </div>

      <div
        className={
          step === 1
            ? "block"
            : "hidden"
        }
      >
        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-black">
              Owner Account
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              This account will become the business owner.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <input
              name="ownerFirstName"
              required
              minLength={2}
              maxLength={80}
              placeholder="First name"
              className="w-full rounded-xl border px-4 py-3"
            />

            <input
              name="ownerLastName"
              maxLength={80}
              placeholder="Last name"
              className="w-full rounded-xl border px-4 py-3"
            />
          </div>

          <input
            name="ownerEmail"
            type="email"
            required
            maxLength={255}
            placeholder="Owner email"
            className="w-full rounded-xl border px-4 py-3"
          />

          <input
            name="ownerPhone"
            type="tel"
            inputMode="tel"
            maxLength={25}
            placeholder="Owner phone (optional)"
            className="w-full rounded-xl border px-4 py-3"
          />

          <input
            name="ownerPassword"
            type="password"
            required
            minLength={
              MIN_PASSWORD_LENGTH
            }
            maxLength={100}
            autoComplete="new-password"
            placeholder={`Password — minimum ${MIN_PASSWORD_LENGTH} characters`}
            className="w-full rounded-xl border px-4 py-3"
          />

          <p className="text-xs text-slate-500">
            Minimum{" "}
            {MIN_PASSWORD_LENGTH}{" "}
            characters. The password
            will never appear in the
            review step.
          </p>
        </section>
      </div>

      <div
        className={
          step === 2
            ? "block"
            : "hidden"
        }
      >
        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-black">
              Loyalty Setup
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Configure how customers earn and redeem rewards.
            </p>
          </div>

          <select
            name="loyaltyMode"
            defaultValue="VISITS"
            className="w-full rounded-xl border px-4 py-3"
          >
            <option value="VISITS">
              Visits
            </option>
            <option value="POINTS">
              Points
            </option>
            <option value="SALES_AMOUNT">
              Sales Amount
            </option>
          </select>

          <input
            name="unitName"
            required
            defaultValue="زيارة"
            maxLength={30}
            placeholder="Unit name"
            className="w-full rounded-xl border px-4 py-3"
          />

          <input
            name="rewardName"
            required
            minLength={2}
            maxLength={100}
            defaultValue="هدية مجانية"
            placeholder="Reward name"
            className="w-full rounded-xl border px-4 py-3"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <input
              name="rewardThreshold"
              type="number"
              min="1"
              max="1000000"
              step="1"
              required
              defaultValue="5"
              placeholder="Reward threshold"
              className="w-full rounded-xl border px-4 py-3"
            />

            <input
              name="earnAmount"
              type="number"
              min="1"
              max="1000000"
              step="1"
              required
              defaultValue="1"
              placeholder="Earn amount"
              className="w-full rounded-xl border px-4 py-3"
            />
          </div>

        </section>
      </div>

      <div
        className={
          step === 3
            ? "block"
            : "hidden"
        }
      >
        <section className="space-y-5">
          <div>
            <h3 className="text-lg font-black">
              Branding
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Choose the initial visual identity. It can be changed later.
            </p>
          </div>

          <div>
            <label
              htmlFor="logoFile"
              className="block text-sm font-semibold text-slate-700"
            >
              Logo (optional)
            </label>

            <input
              id="logoFile"
              name="logoFile"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0];

                if (!file) {
                  return;
                }

                if (
                  file.size > 500 * 1024 ||
                  !["image/png", "image/jpeg", "image/webp"].includes(file.type)
                ) {
                  setValidationError(
                    "Logo must be a PNG, JPEG, or WebP image smaller than 500KB."
                  );
                  event.target.value = "";
                  setLogoPreview("");
                  return;
                }

                setValidationError("");
                setLogoUrl("");

                const reader = new FileReader();
                reader.onload = () => {
                  setLogoPreview(
                    typeof reader.result === "string" ? reader.result : ""
                  );
                };
                reader.readAsDataURL(file);
              }}
              className="mt-2 w-full rounded-xl border bg-white px-4 py-3 text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:font-semibold file:text-white"
            />

            <p className="mt-1 text-xs text-slate-500">
              PNG, JPEG, or WebP — up to 500KB.
            </p>
          </div>

          <div>
            <label
              htmlFor="logoUrl"
              className="block text-sm font-semibold text-slate-700"
            >
              Or use a logo image URL
            </label>

            <input
              id="logoUrl"
              name="logoUrl"
              type="url"
              maxLength={500}
              value={logoUrl}
              onChange={(event) => {
                const value = event.target.value;
                setLogoUrl(value);
                setLogoPreview(isValidHttpUrl(value) ? value : "");

                const fileInput = document.getElementById("logoFile") as HTMLInputElement | null;
                if (value && fileInput) {
                  fileInput.value = "";
                }
              }}
              placeholder="https://example.com/logo.png"
              className="mt-2 w-full rounded-xl border px-4 py-3"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">
              Primary color
              <input
                name="primaryColor"
                type="color"
                defaultValue="#111827"
                className="mt-2 h-12 w-full rounded-xl border bg-white p-1"
              />
            </label>

            <label className="text-sm font-semibold text-slate-700">
              Secondary color
              <input
                name="secondaryColor"
                type="color"
                defaultValue="#ffffff"
                className="mt-2 h-12 w-full rounded-xl border bg-white p-1"
              />
            </label>
          </div>

          <label className="block text-sm font-semibold text-slate-700">
            Theme
            <select
              name="themePreset"
              defaultValue="DEFAULT"
              className="mt-2 w-full rounded-xl border px-4 py-3"
            >
              <option value="DEFAULT">
                Default
              </option>
              <option value="MINIMAL">
                Minimal
              </option>
              <option value="LUXURY">
                Luxury
              </option>
              <option value="DARK">
                Dark
              </option>
              <option value="MODERN">
                Modern
              </option>
              <option value="GRADIENT">
                Gradient
              </option>
            </select>
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            Card layout
            <select
              name="cardStyle"
              defaultValue="CLASSIC"
              className="mt-2 w-full rounded-xl border px-4 py-3"
            >
              <option value="CLASSIC">
                Classic
              </option>
              <option value="COMPACT">
                Compact
              </option>
              <option value="PREMIUM">
                Premium
              </option>
            </select>
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            Font
            <select
              name="fontFamily"
              defaultValue="INTER"
              className="mt-2 w-full rounded-xl border px-4 py-3"
            >
              <option value="INTER">
                Inter
              </option>
              <option value="CAIRO">
                Cairo
              </option>
              <option value="POPPINS">
                Poppins
              </option>
            </select>
          </label>
        </section>
      </div>

      <div
        className={
          step === 4
            ? "block"
            : "hidden"
        }
      >
        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-black">
              Review & Create
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Review the setup before creating the business.
            </p>
          </div>

          {reviewData ? (
            <div className="space-y-4">
              <ReviewSection
                title="Business"
                onEdit={() =>
                  editStep(0)
                }
                rows={[
                  [
                    "Name",
                    reviewData.name,
                  ],
                  [
                    "Industry",
                    reviewData.industry,
                  ],
                  [
                    "Phone",
                    reviewData.contactPhone,
                  ],
                  [
                    "Email",
                    reviewData.email,
                  ],
                  [
                    "Location",
                    [
                      reviewData.city,
                      reviewData.country,
                    ]
                      .filter(Boolean)
                      .join(", "),
                  ],
                  [
                    "Currency",
                    reviewData.currency,
                  ],
                  [
                    "Timezone",
                    reviewData.timezone,
                  ],
                  [
                    "Employees",
                    reviewData.employeeCount,
                  ],
                  [
                    "Website",
                    reviewData.website,
                  ],
                  [
                    "Tax number",
                    reviewData.taxNumber,
                  ],
                ]}
              />

              <ReviewSection
                title="Owner"
                onEdit={() =>
                  editStep(1)
                }
                rows={[
                  [
                    "Name",
                    [
                      reviewData.ownerFirstName,
                      reviewData.ownerLastName,
                    ]
                      .filter(Boolean)
                      .join(" "),
                  ],
                  [
                    "Email",
                    reviewData.ownerEmail,
                  ],
                  [
                    "Phone",
                    reviewData.ownerPhone,
                  ],
                  [
                    "Password",
                    "••••••••••",
                  ],
                ]}
              />

              <ReviewSection
                title="Loyalty"
                onEdit={() =>
                  editStep(2)
                }
                rows={[
                  [
                    "Mode",
                    loyaltyLabels[
                      reviewData.loyaltyMode
                    ] ??
                      reviewData.loyaltyMode,
                  ],
                  [
                    "Unit",
                    reviewData.unitName,
                  ],
                  [
                    "Reward",
                    reviewData.rewardName,
                  ],
                  [
                    "Threshold",
                    reviewData.rewardThreshold,
                  ],
                  [
                    "Earn amount",
                    reviewData.earnAmount,
                  ],
                ]}
              />

              <ReviewSection
                title="Branding"
                onEdit={() =>
                  editStep(3)
                }
                rows={[
                  [
                    "Theme",
                    themeLabels[
                      reviewData.themePreset
                    ] ??
                      reviewData.themePreset,
                  ],
                  [
                    "Card",
                    cardStyleLabels[
                      reviewData.cardStyle
                    ] ??
                      reviewData.cardStyle,
                  ],
                  [
                    "Font",
                    fontLabels[
                      reviewData.fontFamily
                    ] ??
                      reviewData.fontFamily,
                  ],
                  [
                    "Primary",
                    reviewData.primaryColor,
                  ],
                  [
                    "Secondary",
                    reviewData.secondaryColor,
                  ],
                  [
                    "Logo",
                    reviewData.logoPreview ? "Configured" : "Not set",
                  ],
                ]}
              />

              {reviewData.logoPreview ? (
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <img
                    src={reviewData.logoPreview}
                    alt="Business logo preview"
                    className="h-12 w-12 rounded-lg border border-slate-200 bg-white object-contain p-1"
                  />
                  <span className="text-sm font-medium text-slate-700">
                    Logo preview
                  </span>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
              Complete the previous steps to generate the review.
            </p>
          )}
        </section>
      </div>

      <div className="flex items-center justify-between gap-3 pt-2">
        {step > 0 ? (
          <button
            type="button"
            onClick={goBack}
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Back
          </button>
        ) : (
          <span />
        )}

        {step <
        steps.length - 1 ? (
          <button
            type="button"
            onClick={goNext}
            className="ml-auto rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white transition hover:bg-violet-700"
          >
            Next
          </button>
        ) : (
          <button
            type="submit"
            className="ml-auto rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white transition hover:bg-violet-700"
          >
            Create Business
          </button>
        )}
      </div>
    </form>
  );
}

function ReviewSection({
  title,
  rows,
  onEdit,
}: {
  title: string;
  rows: Array<
    [string, string]
  >;
  onEdit: () => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-4">
        <h4 className="font-black text-slate-950">
          {title}
        </h4>

        <button
          type="button"
          onClick={onEdit}
          className="text-sm font-bold text-violet-600 hover:text-violet-800"
        >
          Edit
        </button>
      </div>

      <dl className="mt-4 space-y-2">
        {rows.map(
          ([label, value]) => (
            <div
              key={label}
              className="flex items-start justify-between gap-5 border-b border-slate-100 pb-2 last:border-0 last:pb-0"
            >
              <dt className="text-sm text-slate-500">
                {label}
              </dt>

              <dd
                dir="auto"
                className="max-w-[65%] break-words text-right text-sm font-semibold text-slate-900"
              >
                {value || "—"}
              </dd>
            </div>
          )
        )}
      </dl>
    </section>
  );
}
