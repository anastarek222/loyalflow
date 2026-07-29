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
    logoUrl: string | null;
    coverImageUrl: string | null;
   
    primaryColor: string;
    secondaryColor: string;
   
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

    themePreset: string;
    cardStyle: string;
    fontFamily: string;
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
  const [logoUrl, setLogoUrl] = useState(
    business.logoUrl?.startsWith("http") ? business.logoUrl : "",
  );

  const [logoPreview, setLogoPreview] = useState(business.logoUrl ?? "");

  const [removeLogo, setRemoveLogo] = useState(false);

  const [primaryColor, setPrimaryColor] = useState(business.primaryColor);

  const [secondaryColor, setSecondaryColor] = useState(business.secondaryColor);

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

  const [facebookUrl, setFacebookUrl] = useState(
    business.facebookUrl ?? "",
  );

  const [tiktokUrl, setTiktokUrl] = useState(
    business.tiktokUrl ?? "",
  );

  const [themePreset, setThemePreset] = useState(
    business.themePreset ?? "DEFAULT",
  );

  const [cardStyle, setCardStyle] = useState(
    business.cardStyle ?? "CLASSIC",
  );

  const [fontFamily, setFontFamily] = useState(
    business.fontFamily ?? "INTER",
  );

  const [qrStyle, setQrStyle] = useState(
    business.qrStyle ?? "CLASSIC",
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

  const [membershipName, setMembershipName] = useState(
    business.membershipName ?? "",
  );

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

  const threshold = Math.max(1, Number(rewardThreshold) || 1);

  const previewBalance = Math.max(1, Math.floor(threshold * 0.6));

  const progress = Math.min(
    100,
    Math.floor((previewBalance / threshold) * 100),
  );

  const businessInitial = name.trim().charAt(0).toUpperCase() || "L";

  const themeOptions = [
    { value: "DEFAULT", label: tr("نظيف", "Clean"), description: tr("فاتح ومتوازن وسهل", "Light, balanced and familiar"), swatches: ["#ffffff", "#f5f7fb", primaryColor] },
    { value: "MINIMAL", label: tr("بسيط", "Minimal"), description: tr("زخرفة أقل وتركيز أكبر", "Less decoration, more focus"), swatches: ["#ffffff", "#fafafa", "#111827"] },
    { value: "MODERN", label: tr("عصري", "Modern"), description: tr("أسطح هادئة بإحساس SaaS احترافي", "Soft surfaces for a premium SaaS feel"), swatches: ["#f7f8fc", "#ffffff", primaryColor] },
    { value: "LUXURY", label: tr("أنيق", "Elegant"), description: tr("معالجة داكنة فاخرة لكارت العميل", "Dark premium customer-card treatment"), swatches: ["#161616", "#252525", primaryColor] },
    { value: "DARK", label: tr("داكن", "Dark"), description: tr("تجربة داكنة موجهة للعميل", "Dark customer-facing experience"), swatches: ["#0f172a", "#1e293b", primaryColor] },
    { value: "GRADIENT", label: tr("متدرج", "Gradient"), description: tr("لمسة هوية متدرجة وخفيفة", "Subtle branded customer-card accent"), swatches: ["#ffffff", primaryColor, secondaryColor] },
  ] as const;

  const cardStyleOptions = [
    { value: "CLASSIC", label: tr("كلاسيكي", "Classic"), description: tr("توازن واضح للمعلومات", "Balanced information layout") },
    { value: "COMPACT", label: tr("مضغوط", "Compact"), description: tr("أصغر وأسرع في القراءة", "Smaller and faster to scan") },
    { value: "PREMIUM", label: tr("بريميوم", "Premium"), description: tr("تركيز بصري أكبر على الهوية", "More visual brand emphasis") },
  ] as const;

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

      <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
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
              {tr("الهوية والمظهر", "Brand & appearance")}
            </h3>

            <div className="mt-6 space-y-6">

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


              <div className="grid gap-4 sm:grid-cols-2">
                <label className="rounded-[var(--lf-radius-input)] border border-border bg-surface-subtle p-4">
                  <span className="block text-sm font-bold text-foreground">{tr("اللون الأساسي للهوية", "Primary brand colour")}</span>
                  <span className="mt-1 block text-xs text-foreground-subtle">{tr("يستخدم للإجراءات الأساسية وهوية العميل.", "Used for primary actions and customer branding.")}</span>
                  <span className="mt-4 flex items-center gap-3">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(event) => setPrimaryColor(event.target.value)}
                      className="h-11 w-14 cursor-pointer rounded-[var(--lf-radius-input)] border border-border bg-white p-1"
                      aria-label={tr("اللون الأساسي للهوية", "Primary brand colour")}
                    />
                    <input
                      name="primaryColor"
                      value={primaryColor}
                      onChange={(event) => setPrimaryColor(event.target.value)}
                      className="min-w-0 flex-1 rounded-[var(--lf-radius-input)] border border-border bg-white px-3 py-2.5 font-mono text-sm uppercase text-foreground"
                      placeholder="#4F46E5"
                    />
                  </span>
                </label>

                <label className="rounded-[var(--lf-radius-input)] border border-border bg-surface-subtle p-4">
                  <span className="block text-sm font-bold text-foreground">{tr("اللون الثانوي للهوية", "Secondary brand colour")}</span>
                  <span className="mt-1 block text-xs text-foreground-subtle">{tr("يستخدم للتفاصيل والأسطح الظاهرة للعملاء.", "Supports accents and customer-facing surfaces.")}</span>
                  <span className="mt-4 flex items-center gap-3">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(event) => setSecondaryColor(event.target.value)}
                      className="h-11 w-14 cursor-pointer rounded-[var(--lf-radius-input)] border border-border bg-white p-1"
                      aria-label={tr("اللون الثانوي للهوية", "Secondary brand colour")}
                    />
                    <input
                      name="secondaryColor"
                      value={secondaryColor}
                      onChange={(event) => setSecondaryColor(event.target.value)}
                      className="min-w-0 flex-1 rounded-[var(--lf-radius-input)] border border-border bg-white px-3 py-2.5 font-mono text-sm uppercase text-foreground"
                      placeholder="#FFFFFF"
                    />
                  </span>
                </label>
              </div>

              <div>
                <div className="mb-3">
                  <h4 className="text-sm font-bold text-foreground">{tr("اختر أسلوبًا بصريًا", "Choose a visual style")}</h4>
                  <p className="mt-1 text-xs text-foreground-subtle">
                    {tr("ابدأ بشكل بسيط ويمكنك ضبط التفاصيل لاحقًا.", "Start simple. You can fine-tune the details later.")}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {themeOptions.map((option) => {
                    const selected = themePreset === option.value;
                    return (
                      <label
                        key={option.value}
                        className={`cursor-pointer rounded-[var(--lf-radius-input)] border p-4 transition ${
                          selected
                            ? "border-primary bg-primary-subtle ring-2 ring-primary/10"
                            : "border-border bg-white hover:border-primary/30"
                        }`}
                      >
                        <input
                          type="radio"
                          name="themePreset"
                          value={option.value}
                          checked={selected}
                          onChange={() => setThemePreset(option.value)}
                          className="sr-only"
                        />
                        <span className="flex items-start justify-between gap-3">
                          <span>
                            <span className="block text-sm font-bold text-foreground">{option.label}</span>
                            <span className="mt-1 block text-xs leading-5 text-foreground-subtle">{option.description}</span>
                          </span>
                          <span
                            aria-hidden="true"
                            className={`mt-0.5 flex size-5 items-center justify-center rounded-full border text-[10px] font-black ${
                              selected ? "border-primary bg-primary text-white" : "border-border"
                            }`}
                          >
                            {selected ? "✓" : ""}
                          </span>
                        </span>
                        <span className="mt-4 flex h-7 overflow-hidden rounded-md border border-border">
                          {option.swatches.map((swatch, index) => (
                            <span key={`${option.value}-${index}`} className="flex-1" style={{ backgroundColor: swatch }} />
                          ))}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                <div>
                  <h4 className="mb-3 text-sm font-bold text-foreground">{tr("شكل الكارت الرقمي", "Digital card layout")}</h4>
                  <div className="grid gap-2">
                    {cardStyleOptions.map((option) => {
                      const selected = cardStyle === option.value;
                      return (
                        <label
                          key={option.value}
                          className={`flex cursor-pointer items-center justify-between gap-4 rounded-[var(--lf-radius-input)] border px-4 py-3 ${
                            selected ? "border-primary bg-primary-subtle" : "border-border bg-white hover:bg-surface-subtle"
                          }`}
                        >
                          <input
                            type="radio"
                            name="cardStyle"
                            value={option.value}
                            checked={selected}
                            onChange={() => setCardStyle(option.value)}
                            className="sr-only"
                          />
                          <span>
                            <span className="block text-sm font-bold text-foreground">{option.label}</span>
                            <span className="block text-xs text-foreground-subtle">{option.description}</span>
                          </span>
                          <span className={selected ? "text-primary" : "text-foreground-subtle"} aria-hidden="true">
                            {selected ? "✓" : "○"}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-foreground">{tr("الخط", "Typography")}</label>
                  <select
                    name="fontFamily"
                    value={fontFamily}
                    onChange={(event) => setFontFamily(event.target.value)}
                    className="w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-3 text-foreground"
                  >
                    <option value="INTER">{tr("Inter — نظيف ومحايد", "Inter — clean and neutral")}</option>
                    <option value="CAIRO">{tr("Cairo — مناسب للعربية", "Cairo — Arabic-first")}</option>
                    <option value="POPPINS">{tr("Poppins — عصري وودود", "Poppins — friendly modern")}</option>
                  </select>
                  <p className="mt-2 text-xs leading-5 text-foreground-subtle">
                    {tr("تتحدث معاينة الكارت فورًا لتسهيل المقارنة.", "The customer card preview updates immediately so the choice is easy to compare.")}
                  </p>
                </div>
              </div>


              <div>
                <label className="mb-2 block text-sm font-medium text-foreground-muted">
                  شكل رمز QR
                </label>

                <select
                  name="qrStyle"
                  value={qrStyle}
                  onChange={(e) => setQrStyle(e.target.value)}
                  className="w-full rounded-[var(--lf-radius-input)] border border-border px-4 py-4"
                >
                  <option value="CLASSIC">Classic</option>
                  <option value="ROUNDED">Rounded</option>
                  <option value="BRANDED">Branded</option>
                </select>

                <p className="mt-2 text-xs text-foreground-subtle">
                  يتحكم في شكل QR الظاهر على كارت العميل.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground-muted">
                  مكان رمز QR
                </label>

                <select
                  name="qrPosition"
                  defaultValue={business.qrPosition ?? "CENTER"}
                  className="w-full rounded-[var(--lf-radius-input)] border border-border px-4 py-4"
                >
                  <option value="LEFT">Left</option>
                  <option value="CENTER">Center</option>
                  <option value="RIGHT">Right</option>
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">

                <input
                  name="instagramUrl"
                  value={instagramUrl}
                  onChange={(e)=>setInstagramUrl(e.target.value)}
                  placeholder="Instagram URL"
                  className="rounded-[var(--lf-radius-input)] border px-4 py-4"
                />

                <input
                  name="facebookUrl"
                  value={facebookUrl}
                  onChange={(e)=>setFacebookUrl(e.target.value)}
                  placeholder="Facebook URL"
                  className="rounded-[var(--lf-radius-input)] border px-4 py-4"
                />

                <input
                  name="tiktokUrl"
                  value={tiktokUrl}
                  onChange={(e)=>setTiktokUrl(e.target.value)}
                  placeholder="TikTok URL"
                  className="rounded-[var(--lf-radius-input)] border px-4 py-4"
                />

              </div>

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

                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground-muted">
                    اسم العضوية
                  </label>

                  <input
                    name="membershipName"
                    value={membershipName}
                    onChange={(event) => setMembershipName(event.target.value)}
                    maxLength={50}
                    placeholder="عضو مميز"
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
                شعار النشاط
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

                  if (file.size > 500 * 1024) {
                    window.alert("يجب أن يكون حجم الشعار أقل من 500KB.");

                    event.target.value = "";
                    return;
                  }

                  setLogoUrl("");
                  setRemoveLogo(false);

                  const reader = new FileReader();

                  reader.onload = () => {
                    setLogoPreview(
                      typeof reader.result === "string" ? reader.result : "",
                    );
                  };

                  reader.readAsDataURL(file);
                }}
                className="w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-4 text-foreground-muted file:mr-4 file:rounded-[var(--lf-radius-input)] file:border-0 file:bg-foreground file:px-4 file:py-2 file:font-semibold file:text-white"
              />

              <p className="mt-1 text-xs text-foreground-subtle">
                يظهر في لوحة النشاط والكارت الرقمي. PNG أو JPG أو WebP — بحد أقصى 500KB.
              </p>
            </div>

            <input type="hidden" name="logoUrl" value={logoUrl} />

            <label className="flex cursor-pointer items-center gap-4 rounded-[var(--lf-radius-input)] border border-border bg-surface-subtle px-4 py-4">
              <input
                name="removeLogo"
                type="checkbox"
                checked={removeLogo}
                onChange={(event) => {
                  const checked = event.target.checked;

                  setRemoveLogo(checked);

                  const fileInput = document.getElementById(
                    "logoFile",
                  ) as HTMLInputElement | null;

                  if (checked && fileInput) {
                    fileInput.value = "";
                  }

                  setLogoPreview(
                    checked ? "" : logoUrl || business.logoUrl || "",
                  );
                }}
                className="h-4 w-4"
              />

              <span className="text-sm font-medium text-foreground-muted">
                حذف الشعار الحالي
              </span>
            </label>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground-muted">
                  اللون الأساسي للهوية
                </label>

                <input
                  name="primaryColor"
                  type="color"
                  value={primaryColor}
                  onChange={(event) => setPrimaryColor(event.target.value)}
                  className="h-14 w-full rounded-[var(--lf-radius-input)] border border-border bg-white p-1"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground-muted">
                  لون خلفية الكارت
                </label>

                <input
                  name="secondaryColor"
                  type="color"
                  value={secondaryColor}
                  onChange={(event) => setSecondaryColor(event.target.value)}
                  className="h-14 w-full rounded-[var(--lf-radius-input)] border border-border bg-white p-1"
                />
              </div>
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

        <aside className="h-fit lg:sticky lg:top-8">
          <p className="mb-4 text-sm font-semibold text-foreground-subtle">
            معاينة مباشرة للكارت
          </p>

          <section
            className="overflow-hidden rounded-[var(--lf-radius-card)] shadow-2xl sm:rounded-[32px]"
            style={{
              backgroundColor: secondaryColor,
            }}
          >
            <header
              className="p-6 text-white sm:p-8"
              style={{
                backgroundColor: primaryColor,
              }}
            >
              <div className="flex items-center gap-4">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt={`${name} logo`}
                    className="h-16 w-16 shrink-0 rounded-[var(--lf-radius-input)] border border-white/20 bg-white object-contain p-2 shadow-sm"
                  />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[var(--lf-radius-input)] bg-white/20 text-2xl font-black">
                    {businessInitial}
                  </div>
                )}

                <div>
                  <p className="text-xs text-white/70">كارت الولاء الرقمي</p>

                  <h2 dir="auto" className="mt-1 text-xl font-bold sm:text-2xl">
                    {name || "اسم النشاط"}
                  </h2>
                </div>
              </div>
            </header>

            <div className="p-6 sm:p-8">
              <p className="text-xs uppercase tracking-wider text-foreground-subtle">
                Customer
              </p>

              <h3 className="mt-1 text-2xl font-bold text-foreground">
                أحمد محمد
              </h3>

              <p className="mt-2 text-sm font-semibold text-primary">
                CUS-A1B2C3
              </p>

              <div className="mt-8 flex items-end justify-between">
                <div>
                  <p className="text-5xl font-black text-foreground">
                    {previewBalance}
                  </p>

                  <p dir="auto" className="mt-1 text-sm text-foreground-subtle">
                    {unitName || "نقاط"}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-sm text-foreground-subtle">
                    {loyaltyMode === "VISITS"
                      ? "نظام الزيارات"
                      : `${earnAmount || 1} نقطة لكل عملية`}
                  </p>

                  <p className="mt-1 text-sm font-semibold text-foreground-muted">
                    الهدف: {threshold}
                  </p>
                </div>
              </div>

              <div className="mt-8 h-3 overflow-hidden rounded-full bg-surface-subtle">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${progress}%`,
                    backgroundColor: primaryColor,
                  }}
                />
              </div>

              <div className="mt-4 flex justify-between text-sm text-foreground-subtle">
                <span>
                  {previewBalance} / {threshold}
                </span>

                <span>{progress}%</span>
              </div>

              <div
                dir="auto"
                className="mt-6 rounded-[var(--lf-radius-card)] bg-surface-subtle p-6 text-center text-foreground-muted"
              >
                <p className="font-bold">
                  متبقي {Math.max(0, threshold - previewBalance)} للحصول على
                  الهدية
                </p>

                <p className="mt-1 text-sm">{rewardName || "المكافأة"}</p>
              </div>

              <div className="mx-auto mt-8 flex h-40 w-40 items-center justify-center rounded-[var(--lf-radius-card)] border-8 border-border bg-white text-center text-xs font-bold text-foreground">
                رمز QR
              </div>

              <p className="mt-4 text-center text-xs text-foreground-subtle">
                مدعوم بواسطة LoyalFlow
              </p>
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
