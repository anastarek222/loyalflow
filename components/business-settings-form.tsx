"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";

type LoyaltyMode = "VISITS" | "POINTS" | "SALES_AMOUNT";

type RewardType = "GIFT" | "PROMO_CODE" | "DISCOUNT" | "CUSTOM";

type CardLanguage = "AR" | "EN";

type StaffAttributionMode = "OFF" | "OPTIONAL" | "REQUIRED";

type BusinessSettingsFormProps = {
  language: "AR" | "EN";
  business: {
    name: string;
    slug: string;
    coverImageUrl: string | null;

    currency: string | null;
    timezone: string | null;


    industry: string | null;
    website: string | null;
    email: string | null;
    country: string | null;
    city: string | null;
    taxNumber: string | null;
    employeeCount: number | null;

    description: string | null;

    instagramUrl: string | null;
    facebookUrl: string | null;
    tiktokUrl: string | null;

    qrStyle: string;
    qrPosition: string;

    loyaltyProgramName: string | null;
    pointsName: string | null;
    membershipName: string | null;
    welcomeMessage: string | null;
   
    cardDefaultLanguage: CardLanguage;
   
    staffAttributionEnabled: boolean;
    staffAttributionRequired: boolean;
   
    loyaltyMode: LoyaltyMode;
    unitName: string;
    rewardName: string;
   
    rewardType: RewardType;
    rewardCode: string | null;
    rewardDescription: string | null;
   
    rewardThreshold: number;
    earnAmount: number;
   
    whatsappWelcomeMessage: string;
    whatsappBalanceMessage: string;
    whatsappRewardMessage: string;
  };

  saved: boolean;
  error: boolean;

  action: (formData: FormData) => void | Promise<void>;
};

export default function BusinessSettingsForm({
  language,
  business,
  saved,
  error,
  action,
}: BusinessSettingsFormProps) {
  const tr = (ar: string, en: string) => (language === "AR" ? ar : en);
  const [name, setName] = useState(business.name);

  const [currency, setCurrency] = useState(business.currency ?? "");

  const [timezone, setTimezone] = useState(business.timezone ?? "");

  const [industry, setIndustry] = useState(business.industry ?? "");

  const [website, setWebsite] = useState(business.website ?? "");

  const [email, setEmail] = useState(business.email ?? "");

  const [country, setCountry] = useState(business.country ?? "");

  const [city, setCity] = useState(business.city ?? "");

  const [taxNumber, setTaxNumber] = useState(business.taxNumber ?? "");

  const [employeeCount, setEmployeeCount] = useState(
    business.employeeCount?.toString() ?? ""
  );

  const [description, setDescription] = useState(
    business.description ?? "",
  );

  const [instagramUrl, setInstagramUrl] = useState(
    business.instagramUrl ?? "",
  );

  const [coverImageUrl, setCoverImageUrl] = useState(
    business.coverImageUrl?.startsWith("http") ? business.coverImageUrl : "",
  );

  const [coverImagePreview, setCoverImagePreview] = useState(
    business.coverImageUrl ?? "",
  );

  const [removeCoverImage, setRemoveCoverImage] = useState(false);

  const [loyaltyProgramName, setLoyaltyProgramName] = useState(
    business.loyaltyProgramName ?? "",
  );

  const [pointsName, setPointsName] = useState(business.pointsName ?? "");

  const [welcomeMessage, setWelcomeMessage] = useState(
    business.welcomeMessage ?? "",
  );

  const [cardDefaultLanguage, setCardDefaultLanguage] = useState<CardLanguage>(
    business.cardDefaultLanguage,
  );

  const [staffAttributionMode, setStaffAttributionMode] =
    useState<StaffAttributionMode>(
      !business.staffAttributionEnabled
        ? "OFF"
        : business.staffAttributionRequired
          ? "REQUIRED"
          : "OPTIONAL",
    );

  const [loyaltyMode, setLoyaltyMode] = useState<LoyaltyMode>(
    business.loyaltyMode,
  );

  const [unitName, setUnitName] = useState(business.unitName);

  const [rewardName, setRewardName] = useState(business.rewardName);

  const [rewardType, setRewardType] = useState<RewardType>(business.rewardType);

  const [rewardCode, setRewardCode] = useState(business.rewardCode ?? "");

  const [rewardDescription, setRewardDescription] = useState(
    business.rewardDescription ?? "",
  );

  const [rewardThreshold, setRewardThreshold] = useState(
    String(business.rewardThreshold),
  );

  const [earnAmount, setEarnAmount] = useState(String(business.earnAmount));

  const [whatsappWelcomeMessage, setWhatsappWelcomeMessage] = useState(
    business.whatsappWelcomeMessage,
  );

  const [whatsappBalanceMessage, setWhatsappBalanceMessage] = useState(
    business.whatsappBalanceMessage,
  );

  const [whatsappRewardMessage, setWhatsappRewardMessage] = useState(
    business.whatsappRewardMessage,
  );

  return (
    <>
      {saved && (
        <div className="mb-6 rounded-[var(--lf-radius-input)] border border-success/30 bg-success-subtle px-4 py-4 text-success">
          تم حفظ إعدادات النشاط بنجاح.
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-4 py-4 text-danger">
          راجع البيانات المدخلة.
        </div>
      )}

      <div>
        <form
          action={action}
          className="rounded-[var(--lf-radius-card)] border border-border bg-white p-6 shadow-sm sm:p-8"
        >
          <h2 className="text-xl font-bold text-foreground">بيانات النشاط</h2>

          <p className="mt-1 text-sm text-foreground-subtle">
            {tr("اجعل تجربة العمل اليومية بسيطة، وخصص هوية العميل عند الحاجة.", "Keep the daily experience simple, then customise the customer-facing brand when you need it.")}
          </p>
          <div className="mt-8 rounded-[var(--lf-radius-card)] border border-border p-6">
            <h3 className="text-lg font-black text-foreground">
              {tr("معلومات ظهور النشاط", "Customer-facing information")}
            </h3>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground-muted">
                  وصف النشاط
                </label>
                <textarea
                  name="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-[var(--lf-radius-input)] border border-border px-4 py-4"
                  placeholder="وصف قصير يظهر للعملاء"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground-muted">
                  Instagram URL
                </label>
                <input
                  name="instagramUrl"
                  value={instagramUrl}
                  onChange={(event) => setInstagramUrl(event.target.value)}
                  placeholder="https://instagram.com/example"
                  className="w-full rounded-[var(--lf-radius-input)] border border-border px-4 py-4"
                />
              </div>

              <input type="hidden" name="facebookUrl" value={business.facebookUrl ?? ""} />
              <input type="hidden" name="tiktokUrl" value={business.tiktokUrl ?? ""} />
              <input type="hidden" name="qrStyle" value={business.qrStyle ?? "CLASSIC"} />
              <input type="hidden" name="qrPosition" value={business.qrPosition ?? "CENTER"} />
              <input type="hidden" name="membershipName" value={business.membershipName ?? ""} />
            </div>
          </div>

          <div className="mt-8 space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground-muted">
                اسم النشاط
              </label>

              <input
                name="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                minLength={2}
                maxLength={80}
                className="w-full rounded-[var(--lf-radius-input)] border border-border px-4 py-4 text-foreground placeholder:text-foreground-subtle outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/20"
              />
            </div>

            <section className="rounded-[var(--lf-radius-card)] border border-border bg-surface-subtle p-4 sm:p-6">
  <div>
    <h3 className="font-black text-foreground">معلومات النشاط</h3>

    <p className="mt-1 text-sm leading-6 text-foreground-muted">
      أضف بيانات النشاط الأساسية ومعلومات التواصل والموقع.
    </p>
  </div>

  <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
    <div>
      <label className="mb-2 block text-sm font-medium text-foreground-muted">
        نوع النشاط
      </label>

      <input
        name="industry"
        value={industry}
        onChange={(event) => setIndustry(event.target.value)}
        maxLength={100}
        placeholder="مثال: مطعم، صالون، متجر ملابس"
        className="w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-4 text-foreground placeholder:text-foreground-subtle outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/20"
      />
    </div>

    <div>
      <label className="mb-2 block text-sm font-medium text-foreground-muted">
        البريد الإلكتروني
      </label>

      <input
        name="email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        maxLength={255}
        placeholder="info@example.com"
        className="w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-4 text-left text-foreground placeholder:text-foreground-subtle outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/20"
      />
    </div>

    <div className="sm:col-span-2">
      <label className="mb-2 block text-sm font-medium text-foreground-muted">
        الموقع الإلكتروني
      </label>

      <input
          name="website"
          type="text"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
          maxLength={300}
          placeholder="example.com"
          className="w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-4 text-left text-foreground placeholder:text-foreground-subtle outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/20"
        />
      </div>
  
      <div>
        <label className="mb-2 block text-sm font-medium text-foreground-muted">
          الدولة
        </label>

        <input
          name="country"
          value={country}
          onChange={(event) => setCountry(event.target.value)}
          maxLength={100}
          placeholder="مصر"
          className="w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-4 text-foreground placeholder:text-foreground-subtle outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/20"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-foreground-muted">
          المدينة
        </label>

        <input
          name="city"
          value={city}
          onChange={(event) => setCity(event.target.value)}
          maxLength={100}
          placeholder="القاهرة"
          className="w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-4 text-foreground placeholder:text-foreground-subtle outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/20"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-foreground-muted">
          الرقم الضريبي
        </label>

        <input
          name="taxNumber"
          value={taxNumber}
          onChange={(event) => setTaxNumber(event.target.value)}
          maxLength={100}
          placeholder="اختياري"
          className="w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-4 text-foreground placeholder:text-foreground-subtle outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/20"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-foreground-muted">
          عدد الموظفين
        </label>

        <input
          name="employeeCount"
          type="number"
          min="0"
          value={employeeCount}
          onChange={(event) => setEmployeeCount(event.target.value)}
          placeholder="مثال: 10"
          className="w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-4 text-foreground placeholder:text-foreground-subtle outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/20"
        />
      </div>
    </div>
  </section>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground-muted">
                  العملة
                </label>

                <select
                  name="currency"
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value)}
                  className="w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-4 text-foreground outline-none focus:border-primary/30"
                >
                  <option value="">بدون تحديد</option>
                  <option value="AED">AED</option>
                  <option value="EGP">EGP</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="KWD">KWD</option>
                  <option value="QAR">QAR</option>
                  <option value="SAR">SAR</option>
                  <option value="USD">USD</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground-muted">
                  المنطقة الزمنية
                </label>

                <input
                  name="timezone"
                  value={timezone}
                  onChange={(event) => setTimezone(event.target.value)}
                  maxLength={100}
                  placeholder="Africa/Cairo"
                  className="w-full rounded-[var(--lf-radius-input)] border border-border px-4 py-4 text-foreground placeholder:text-foreground-subtle outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/20"
                />
              </div>
            </div>

            <section className="rounded-[var(--lf-radius-card)] border border-border bg-surface-subtle p-4 sm:p-6">
              <h3 className="font-black text-foreground">
                تسجيل الموظف المسؤول
              </h3>

              <p className="mt-1 text-sm leading-6 text-foreground-muted">
                حدد هل يجب تسجيل الموظف الذي نفذ البيع أو الزيارة عند إضافة رصيد
                للعميل.
              </p>

              <div className="mt-4 grid gap-4">
                {[
                  {
                    value: "OFF",
                    title: "إيقاف",
                    description:
                      "لن يظهر اختيار الموظف ولن يتم تسجيله مع العملية.",
                  },
                  {
                    value: "OPTIONAL",
                    title: "اختياري",
                    description:
                      "يمكن تسجيل الموظف المسؤول أو إكمال العملية بدونه.",
                  },
                  {
                    value: "REQUIRED",
                    title: "إجباري",
                    description: "يجب اختيار الموظف المسؤول قبل تسجيل العملية.",
                  },
                ].map((option) => (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-start gap-4 rounded-[var(--lf-radius-input)] border border-border bg-white p-4"
                  >
                    <input
                      type="radio"
                      name="staffAttributionMode"
                      value={option.value}
                      checked={staffAttributionMode === option.value}
                      onChange={() =>
                        setStaffAttributionMode(
                          option.value as StaffAttributionMode,
                        )
                      }
                      className="mt-1 h-4 w-4 accent-[var(--lf-primary)]"
                    />

                    <span>
                      <span className="block font-black text-foreground">
                        {option.title}
                      </span>
                      <span className="mt-1 block text-sm text-foreground-subtle">
                        {option.description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </section>

            <section className="rounded-[var(--lf-radius-card)] border border-primary/30 bg-primary-subtle p-4 sm:p-6">
              <h3 className="font-black text-primary">هوية برنامج الولاء</h3>

              <p className="mt-1 text-sm text-primary">
                خصّص هوية النشاط كما ستظهر للعملاء في الكارت الرقمي ولوحة النشاط.
                يمكنك رفع الصور مباشرة من جهازك أو استخدام رابط صورة خارجي.
              </p>

              <div className="mt-4 space-y-4">
                {coverImagePreview && !removeCoverImage && (
                  <div className="overflow-hidden rounded-[var(--lf-radius-card)] border border-border bg-white">
                    <img
                      src={coverImagePreview}
                      alt="Cover preview"
                      className="h-40 w-full object-cover"
                    />
                  </div>
                )}

                <div>
                  <label
                    htmlFor="coverImageFile"
                    className="mb-2 block text-sm font-medium text-foreground-muted"
                  >
                    صورة الغلاف
                  </label>

                  <input
                    id="coverImageFile"
                    name="coverImageFile"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => {
                      const file = event.target.files?.[0];

                      if (!file) {
                        return;
                      }

                      const previewUrl = URL.createObjectURL(file);

                      setCoverImagePreview(previewUrl);
                      setCoverImageUrl("");
                      setRemoveCoverImage(false);
                    }}
                    className="block w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-4 text-sm text-foreground-muted"
                  />

                  <p className="mt-2 text-xs text-foreground-subtle">
                    تظهر كخلفية بصرية في تجربة العميل. PNG أو JPG أو WebP بحد أقصى 1MB.
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-surface-subtle" />
                  <span className="text-xs font-semibold text-foreground-subtle">
                    أو
                  </span>
                  <div className="h-px flex-1 bg-surface-subtle" />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground-muted">
                    رابط صورة الغلاف
                  </label>

                  <input
                    name="coverImageUrl"
                    type="url"
                    value={coverImageUrl}
                    onChange={(event) => {
                      const value = event.target.value;

                      setCoverImageUrl(value);
                      setRemoveCoverImage(false);
                      setCoverImagePreview(
                        value || business.coverImageUrl || "",
                      );

                      const fileInput = document.getElementById(
                        "coverImageFile",
                      ) as HTMLInputElement | null;

                      if (value && fileInput) {
                        fileInput.value = "";
                      }
                    }}
                    maxLength={500}
                    placeholder="https://example.com/cover.jpg"
                    className="w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-4 text-foreground placeholder:text-foreground-subtle outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/20"
                  />
                </div>

                <label className="flex cursor-pointer items-center gap-4 rounded-[var(--lf-radius-input)] border border-border bg-surface-subtle px-4 py-4">
                  <input
                    name="removeCoverImage"
                    type="checkbox"
                    checked={removeCoverImage}
                    onChange={(event) => {
                      const checked = event.target.checked;

                      setRemoveCoverImage(checked);

                      const fileInput = document.getElementById(
                        "coverImageFile",
                      ) as HTMLInputElement | null;

                      if (checked && fileInput) {
                        fileInput.value = "";
                      }

                      setCoverImagePreview(
                        checked
                          ? ""
                          : coverImageUrl || business.coverImageUrl || "",
                      );
                    }}
                    className="h-4 w-4"
                  />

                  <span className="text-sm font-medium text-foreground-muted">
                    حذف صورة الغلاف الحالية
                  </span>
                </label>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground-muted">
                    اسم برنامج الولاء
                  </label>

                  <input
                    name="loyaltyProgramName"
                    value={loyaltyProgramName}
                    onChange={(event) =>
                      setLoyaltyProgramName(event.target.value)
                    }
                    maxLength={80}
                    placeholder="برنامج مكافآتي"
                    className="w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-4 text-foreground placeholder:text-foreground-subtle outline-none focus:border-primary/30"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground-muted">
                    اسم النقاط
                  </label>

                  <input
                    name="pointsName"
                    value={pointsName}
                    onChange={(event) => setPointsName(event.target.value)}
                    maxLength={30}
                    placeholder="نقطة"
                    className="w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-4 text-foreground placeholder:text-foreground-subtle outline-none focus:border-primary/30"
                  />
                </div>

              </div>

              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-foreground-muted">
                  رسالة الترحيب داخل الكارت
                </label>

                <textarea
                  name="welcomeMessage"
                  value={welcomeMessage}
                  onChange={(event) => setWelcomeMessage(event.target.value)}
                  rows={3}
                  maxLength={300}
                  placeholder="أهلًا بك في برنامج الولاء"
                  className="w-full resize-y rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-4 text-foreground placeholder:text-foreground-subtle outline-none focus:border-primary/30"
                />
              </div>

              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-foreground-muted">
                  لغة الكارت الافتراضية
                </label>

                <select
                  name="cardDefaultLanguage"
                  value={cardDefaultLanguage}
                  onChange={(event) =>
                    setCardDefaultLanguage(event.target.value as CardLanguage)
                  }
                  className="w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-4 text-foreground outline-none focus:border-primary/30"
                >
                  <option value="AR">العربية (RTL)</option>
                  <option value="EN">English (LTR)</option>
                </select>

                <p className="mt-1 text-xs text-foreground-subtle">
                  يستطيع العميل تغيير اللغة من الكارت لاحقًا دون تغيير إعداد
                  النشاط.
                </p>
              </div>
            </section>

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground-muted">
                رابط النشاط
              </label>

              <input
                value={business.slug}
                disabled
                className="w-full cursor-not-allowed rounded-[var(--lf-radius-input)] border border-border bg-surface-subtle px-4 py-4 text-foreground-subtle"
              />

              <p className="mt-1 text-xs text-foreground-subtle">
                لا يمكن تغيير رابط النشاط.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground-muted">
                نظام الولاء
              </label>

              <select
                name="loyaltyMode"
                value={loyaltyMode}
                onChange={(event) =>
                  setLoyaltyMode(event.target.value as LoyaltyMode)
                }
                className="w-full rounded-[var(--lf-radius-input)] border border-border px-4 py-4 text-foreground placeholder:text-foreground-subtle outline-none focus:border-primary/30"
              >
                <option value="VISITS">زيارات / أختام</option>

                <option value="POINTS">نقاط</option>

                <option value="SALES_AMOUNT">إجمالي المبيعات</option>
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground-muted">
                  اسم الوحدة
                </label>

                <input
                  name="unitName"
                  value={unitName}
                  onChange={(event) => setUnitName(event.target.value)}
                  required
                  maxLength={30}
                  className="w-full rounded-[var(--lf-radius-input)] border border-border px-4 py-4 text-foreground placeholder:text-foreground-subtle outline-none focus:border-primary/30"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground-muted">
                  {loyaltyMode === "SALES_AMOUNT"
                    ? "قيمة الشراء"
                    : "قيمة الإضافة"}
                </label>

                <input
                  name="earnAmount"
                  type="number"
                  min="1"
                  value={earnAmount}
                  onChange={(event) => setEarnAmount(event.target.value)}
                  required
                  className="w-full rounded-[var(--lf-radius-input)] border border-border px-4 py-4 text-foreground placeholder:text-foreground-subtle outline-none focus:border-primary/30"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground-muted">
                اسم المكافأة
              </label>

              <input
                name="rewardName"
                value={rewardName}
                onChange={(event) => setRewardName(event.target.value)}
                required
                maxLength={100}
                className="w-full rounded-[var(--lf-radius-input)] border border-border px-4 py-4 text-foreground placeholder:text-foreground-subtle outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/20"
              />
            </div>
            <section className="rounded-[var(--lf-radius-card)] border border-primary/30 bg-primary-subtle p-4 sm:p-6">
              <h3 className="font-black text-primary">
                نوع وتفاصيل المكافأة
              </h3>

              <p className="mt-1 text-xs leading-5 text-primary">
                كود الخصم لن يظهر للعميل إلا بعد وصوله إلى الهدف.
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-foreground-muted">
                    نوع المكافأة
                  </label>

                  <select
                    name="rewardType"
                    value={rewardType}
                    onChange={(event) =>
                      setRewardType(event.target.value as RewardType)
                    }
                    className="w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-4"
                  >
                    <option value="GIFT">هدية</option>

                    <option value="PROMO_CODE">Promo Code</option>

                    <option value="DISCOUNT">خصم</option>

                    <option value="CUSTOM">مكافأة مخصصة</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-foreground-muted">
                    كود المكافأة
                  </label>

                  <input
                    name="rewardCode"
                    value={rewardCode}
                    onChange={(event) => setRewardCode(event.target.value)}
                    required={rewardType === "PROMO_CODE"}
                    maxLength={80}
                    placeholder="VIP20"
                    className="w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-4"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="mb-2 block text-sm font-bold text-foreground-muted">
                  وصف المكافأة
                </label>

                <textarea
                  name="rewardDescription"
                  value={rewardDescription}
                  onChange={(event) => setRewardDescription(event.target.value)}
                  rows={3}
                  maxLength={300}
                  placeholder="مثال: خصم 20% على عملية الشراء التالية"
                  className="w-full resize-y rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-4"
                />
              </div>
            </section>

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground-muted">
                {loyaltyMode === "SALES_AMOUNT"
                  ? "Spending Target Amount"
                  : "الرصيد المطلوب للمكافأة"}
              </label>

              <input
                name="rewardThreshold"
                type="number"
                min="1"
                value={rewardThreshold}
                onChange={(event) => setRewardThreshold(event.target.value)}
                required
                className="w-full rounded-[var(--lf-radius-input)] border border-border px-4 py-4 text-foreground placeholder:text-foreground-subtle outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/20"
              />
            </div>

            <section className="border-t border-border pt-8">
              <h3 className="text-lg font-bold text-foreground">
                قوالب رسائل واتساب
              </h3>

              <p className="mt-1 text-sm text-foreground-subtle">
                تخصيص الرسائل التي يتم فتحها لكل عميل.
              </p>

              <div className="mt-4 rounded-[var(--lf-radius-card)] bg-primary-subtle p-4 text-sm text-primary">
                <p className="font-semibold">المتغيرات المتاحة</p>

                <p className="mt-2 break-words font-mono text-xs leading-6">
                  {
                    "{customer} {business} {balance} {unit} {reward} {remaining} {card_link}"
                  }
                </p>
              </div>

              <div className="mt-6">
                <label
                  htmlFor="whatsappWelcomeMessage"
                  className="mb-2 block text-sm font-medium text-foreground-muted"
                >
                  رسالة الترحيب
                </label>

                <textarea
                  id="whatsappWelcomeMessage"
                  name="whatsappWelcomeMessage"
                  dir="auto"
                  rows={8}
                  maxLength={1500}
                  required
                  value={whatsappWelcomeMessage}
                  onChange={(event) =>
                    setWhatsappWelcomeMessage(event.target.value)
                  }
                  className="w-full resize-y rounded-[var(--lf-radius-input)] border border-border px-4 py-4 outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/20"
                />
              </div>

              <div className="mt-6">
                <label
                  htmlFor="whatsappBalanceMessage"
                  className="mb-2 block text-sm font-medium text-foreground-muted"
                >
                  رسالة تحديث الرصيد
                </label>

                <textarea
                  id="whatsappBalanceMessage"
                  name="whatsappBalanceMessage"
                  dir="auto"
                  rows={8}
                  maxLength={1500}
                  required
                  value={whatsappBalanceMessage}
                  onChange={(event) =>
                    setWhatsappBalanceMessage(event.target.value)
                  }
                  className="w-full resize-y rounded-[var(--lf-radius-input)] border border-border px-4 py-4 outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/20"
                />
              </div>

              <div className="mt-6">
                <label
                  htmlFor="whatsappRewardMessage"
                  className="mb-2 block text-sm font-medium text-foreground-muted"
                >
                  رسالة جاهزية المكافأة
                </label>

                <textarea
                  id="whatsappRewardMessage"
                  name="whatsappRewardMessage"
                  dir="auto"
                  rows={8}
                  maxLength={1500}
                  required
                  value={whatsappRewardMessage}
                  onChange={(event) =>
                    setWhatsappRewardMessage(event.target.value)
                  }
                  className="w-full resize-y rounded-[var(--lf-radius-input)] border border-border px-4 py-4 outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/20"
                />
              </div>
            </section>

            <button
              type="submit"
              className="w-full rounded-[var(--lf-radius-input)] bg-foreground px-6 py-4 font-semibold text-white transition hover:bg-primary-subtle"
            >
              حفظ التغييرات
            </button>
          </div>
        </form>

      </div>
    </>
  );
}
