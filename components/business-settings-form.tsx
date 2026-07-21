"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";

type LoyaltyMode = "VISITS" | "POINTS" | "SALES_AMOUNT";

type RewardType = "GIFT" | "PROMO_CODE" | "DISCOUNT" | "CUSTOM";

type CardLanguage = "AR" | "EN";

type StaffAttributionMode = "OFF" | "OPTIONAL" | "REQUIRED";

type BusinessSettingsFormProps = {
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
  business,
  saved,
  error,
  action,
}: BusinessSettingsFormProps) {
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

  return (
    <>
      {saved && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
          تم حفظ إعدادات النشاط بنجاح.
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
          راجع البيانات المدخلة.
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
        <form
          action={action}
          className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
        >
          <h2 className="text-xl font-bold text-slate-950">بيانات النشاط</h2>

          <p className="mt-1 text-sm text-slate-500">
            تعديل هوية النشاط وقواعد برنامج الولاء.
          </p>

          <div className="mt-7 space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                اسم النشاط
              </label>

              <input
                name="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                minLength={2}
                maxLength={80}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 placeholder:text-slate-400 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
              />
            </div>

            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
  <div>
    <h3 className="font-black text-slate-950">معلومات النشاط</h3>

    <p className="mt-1 text-sm leading-6 text-slate-600">
      أضف بيانات النشاط الأساسية ومعلومات التواصل والموقع.
    </p>
  </div>

  <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        نوع النشاط
      </label>

      <input
        name="industry"
        value={industry}
        onChange={(event) => setIndustry(event.target.value)}
        maxLength={100}
        placeholder="مثال: مطعم، صالون، متجر ملابس"
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 placeholder:text-slate-400 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
      />
    </div>

    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        البريد الإلكتروني
      </label>

      <input
        name="email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        maxLength={255}
        placeholder="info@example.com"
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-left text-slate-950 placeholder:text-slate-400 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
      />
    </div>

    <div className="sm:col-span-2">
      <label className="mb-2 block text-sm font-medium text-slate-700">
        الموقع الإلكتروني
      </label>

      <input
          name="website"
          type="url"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
          maxLength={300}
          placeholder="https://example.com"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-left text-slate-950 placeholder:text-slate-400 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
        />
      </div>
  
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
          الدولة
        </label>

        <input
          name="country"
          value={country}
          onChange={(event) => setCountry(event.target.value)}
          maxLength={100}
          placeholder="مصر"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 placeholder:text-slate-400 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
          المدينة
        </label>

        <input
          name="city"
          value={city}
          onChange={(event) => setCity(event.target.value)}
          maxLength={100}
          placeholder="القاهرة"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 placeholder:text-slate-400 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
        />
      </div>

      <div className="sm:col-span-2">
        <label className="mb-2 block text-sm font-medium text-slate-700">
          الرقم الضريبي
        </label>

        <input
          name="taxNumber"
          value={taxNumber}
          onChange={(event) => setTaxNumber(event.target.value)}
          maxLength={100}
          placeholder="اختياري"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 placeholder:text-slate-400 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
        />
      </div>
    </div>
  </section>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  العملة
                </label>

                <select
                  name="currency"
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-violet-500"
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
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  المنطقة الزمنية
                </label>

                <input
                  name="timezone"
                  value={timezone}
                  onChange={(event) => setTimezone(event.target.value)}
                  maxLength={100}
                  placeholder="Africa/Cairo"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 placeholder:text-slate-400 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                />
              </div>
            </div>

            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
              <h3 className="font-black text-slate-950">
                تسجيل الموظف المسؤول
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-600">
                حدد هل يجب تسجيل الموظف الذي نفذ البيع أو الزيارة عند إضافة رصيد
                للعميل.
              </p>

              <div className="mt-4 grid gap-3">
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
                    className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-4"
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
                      className="mt-1 h-4 w-4 accent-violet-600"
                    />

                    <span>
                      <span className="block font-black text-slate-900">
                        {option.title}
                      </span>
                      <span className="mt-1 block text-sm text-slate-500">
                        {option.description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-violet-200 bg-violet-50 p-4 sm:p-5">
              <h3 className="font-black text-violet-950">هوية برنامج الولاء</h3>

              <p className="mt-1 text-sm text-violet-700">
                خصّص هوية النشاط كما ستظهر للعملاء في الكارت الرقمي ولوحة النشاط.
                يمكنك رفع الصور مباشرة من جهازك أو استخدام رابط صورة خارجي.
              </p>

              <div className="mt-4 space-y-4">
                {coverImagePreview && !removeCoverImage && (
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
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
                    className="mb-2 block text-sm font-medium text-slate-700"
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
                    className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700"
                  />

                  <p className="mt-2 text-xs text-slate-500">
                    تظهر كخلفية بصرية في تجربة العميل. PNG أو JPG أو WebP بحد أقصى 1MB.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-xs font-semibold text-slate-400">
                    أو
                  </span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
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
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 placeholder:text-slate-400 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                  />
                </div>

                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
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

                  <span className="text-sm font-medium text-slate-700">
                    حذف صورة الغلاف الحالية
                  </span>
                </label>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
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
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 placeholder:text-slate-400 outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    اسم النقاط
                  </label>

                  <input
                    name="pointsName"
                    value={pointsName}
                    onChange={(event) => setPointsName(event.target.value)}
                    maxLength={30}
                    placeholder="نقطة"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 placeholder:text-slate-400 outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    اسم العضوية
                  </label>

                  <input
                    name="membershipName"
                    value={membershipName}
                    onChange={(event) => setMembershipName(event.target.value)}
                    maxLength={50}
                    placeholder="عضو مميز"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 placeholder:text-slate-400 outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  رسالة الترحيب داخل الكارت
                </label>

                <textarea
                  name="welcomeMessage"
                  value={welcomeMessage}
                  onChange={(event) => setWelcomeMessage(event.target.value)}
                  rows={3}
                  maxLength={300}
                  placeholder="أهلًا بك في برنامج الولاء"
                  className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 placeholder:text-slate-400 outline-none focus:border-violet-500"
                />
              </div>

              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  لغة الكارت الافتراضية
                </label>

                <select
                  name="cardDefaultLanguage"
                  value={cardDefaultLanguage}
                  onChange={(event) =>
                    setCardDefaultLanguage(event.target.value as CardLanguage)
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-violet-500"
                >
                  <option value="AR">العربية (RTL)</option>
                  <option value="EN">English (LTR)</option>
                </select>

                <p className="mt-1 text-xs text-slate-500">
                  يستطيع العميل تغيير اللغة من الكارت لاحقًا دون تغيير إعداد
                  النشاط.
                </p>
              </div>
            </section>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                رابط النشاط
              </label>

              <input
                value={business.slug}
                disabled
                className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-500"
              />

              <p className="mt-1 text-xs text-slate-400">
                لا يمكن تغيير رابط النشاط.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
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
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:font-semibold file:text-white"
              />

              <p className="mt-1 text-xs text-slate-400">
                يظهر في لوحة النشاط والكارت الرقمي. PNG أو JPG أو WebP — بحد أقصى 500KB.
              </p>
            </div>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-semibold text-slate-400">أو</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                رابط صورة الشعار
              </label>

              <input
                name="logoUrl"
                type="url"
                value={logoUrl}
                onChange={(event) => {
                  const value = event.target.value;

                  setLogoUrl(value);
                  setRemoveLogo(false);
                  setLogoPreview(value || business.logoUrl || "");

                  const fileInput = document.getElementById(
                    "logoFile",
                  ) as HTMLInputElement | null;

                  if (value && fileInput) {
                    fileInput.value = "";
                  }
                }}
                placeholder="https://example.com/logo.png"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 placeholder:text-slate-400 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
              />
            </div>

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
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

              <span className="text-sm font-medium text-slate-700">
                حذف الشعار الحالي
              </span>
            </label>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  اللون الأساسي للهوية
                </label>

                <input
                  name="primaryColor"
                  type="color"
                  value={primaryColor}
                  onChange={(event) => setPrimaryColor(event.target.value)}
                  className="h-14 w-full rounded-xl border border-slate-300 bg-white p-1"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  لون خلفية الكارت
                </label>

                <input
                  name="secondaryColor"
                  type="color"
                  value={secondaryColor}
                  onChange={(event) => setSecondaryColor(event.target.value)}
                  className="h-14 w-full rounded-xl border border-slate-300 bg-white p-1"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                نظام الولاء
              </label>

              <select
                name="loyaltyMode"
                value={loyaltyMode}
                onChange={(event) =>
                  setLoyaltyMode(event.target.value as LoyaltyMode)
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 placeholder:text-slate-400 outline-none focus:border-violet-500"
              >
                <option value="VISITS">زيارات / أختام</option>

                <option value="POINTS">نقاط</option>

                <option value="SALES_AMOUNT">إجمالي المبيعات</option>
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  اسم الوحدة
                </label>

                <input
                  name="unitName"
                  value={unitName}
                  onChange={(event) => setUnitName(event.target.value)}
                  required
                  maxLength={30}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 placeholder:text-slate-400 outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
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
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 placeholder:text-slate-400 outline-none focus:border-violet-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                اسم المكافأة
              </label>

              <input
                name="rewardName"
                value={rewardName}
                onChange={(event) => setRewardName(event.target.value)}
                required
                maxLength={100}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 placeholder:text-slate-400 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
              />
            </div>
            <section className="rounded-2xl border border-violet-200 bg-violet-50 p-4 sm:p-5">
              <h3 className="font-black text-violet-950">
                نوع وتفاصيل المكافأة
              </h3>

              <p className="mt-1 text-xs leading-5 text-violet-700">
                كود الخصم لن يظهر للعميل إلا بعد وصوله إلى الهدف.
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    نوع المكافأة
                  </label>

                  <select
                    name="rewardType"
                    value={rewardType}
                    onChange={(event) =>
                      setRewardType(event.target.value as RewardType)
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                  >
                    <option value="GIFT">هدية</option>

                    <option value="PROMO_CODE">Promo Code</option>

                    <option value="DISCOUNT">خصم</option>

                    <option value="CUSTOM">مكافأة مخصصة</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    كود المكافأة
                  </label>

                  <input
                    name="rewardCode"
                    value={rewardCode}
                    onChange={(event) => setRewardCode(event.target.value)}
                    required={rewardType === "PROMO_CODE"}
                    maxLength={80}
                    placeholder="VIP20"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  وصف المكافأة
                </label>

                <textarea
                  name="rewardDescription"
                  value={rewardDescription}
                  onChange={(event) => setRewardDescription(event.target.value)}
                  rows={3}
                  maxLength={300}
                  placeholder="مثال: خصم 20% على عملية الشراء التالية"
                  className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3"
                />
              </div>
            </section>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
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
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 placeholder:text-slate-400 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
              />
            </div>

            <section className="border-t border-slate-200 pt-7">
              <h3 className="text-lg font-bold text-slate-950">
                قوالب رسائل واتساب
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                تخصيص الرسائل التي يتم فتحها لكل عميل.
              </p>

              <div className="mt-4 rounded-2xl bg-violet-50 p-4 text-sm text-violet-800">
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
                  className="mb-2 block text-sm font-medium text-slate-700"
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
                  className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                />
              </div>

              <div className="mt-6">
                <label
                  htmlFor="whatsappBalanceMessage"
                  className="mb-2 block text-sm font-medium text-slate-700"
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
                  className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                />
              </div>

              <div className="mt-6">
                <label
                  htmlFor="whatsappRewardMessage"
                  className="mb-2 block text-sm font-medium text-slate-700"
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
                  className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                />
              </div>
            </section>

            <button
              type="submit"
              className="w-full rounded-xl bg-slate-950 px-6 py-3 font-semibold text-white transition hover:bg-violet-700"
            >
              حفظ التغييرات
            </button>
          </div>
        </form>

        <aside className="h-fit lg:sticky lg:top-8">
          <p className="mb-3 text-sm font-semibold text-slate-500">
            معاينة مباشرة للكارت
          </p>

          <section
            className="overflow-hidden rounded-2xl shadow-2xl sm:rounded-[32px]"
            style={{
              backgroundColor: secondaryColor,
            }}
          >
            <header
              className="p-5 text-white sm:p-7"
              style={{
                backgroundColor: primaryColor,
              }}
            >
              <div className="flex items-center gap-4">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt={`${name} logo`}
                    className="h-16 w-16 shrink-0 rounded-xl border border-white/20 bg-white object-contain p-2 shadow-sm"
                  />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-white/20 text-2xl font-black">
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

            <div className="p-5 sm:p-7">
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Customer
              </p>

              <h3 className="mt-1 text-2xl font-bold text-slate-950">
                أحمد محمد
              </h3>

              <p className="mt-2 text-sm font-semibold text-violet-600">
                CUS-A1B2C3
              </p>

              <div className="mt-7 flex items-end justify-between">
                <div>
                  <p className="text-5xl font-black text-slate-950">
                    {previewBalance}
                  </p>

                  <p dir="auto" className="mt-1 text-sm text-slate-500">
                    {unitName || "نقاط"}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-sm text-slate-500">
                    {loyaltyMode === "VISITS"
                      ? "نظام الزيارات"
                      : `${earnAmount || 1} نقطة لكل عملية`}
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    الهدف: {threshold}
                  </p>
                </div>
              </div>

              <div className="mt-7 h-3 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${progress}%`,
                    backgroundColor: primaryColor,
                  }}
                />
              </div>

              <div className="mt-3 flex justify-between text-sm text-slate-500">
                <span>
                  {previewBalance} / {threshold}
                </span>

                <span>{progress}%</span>
              </div>

              <div
                dir="auto"
                className="mt-6 rounded-2xl bg-slate-100 p-5 text-center text-slate-700"
              >
                <p className="font-bold">
                  متبقي {Math.max(0, threshold - previewBalance)} للحصول على
                  الهدية
                </p>

                <p className="mt-1 text-sm">{rewardName || "المكافأة"}</p>
              </div>

              <div className="mx-auto mt-7 flex h-40 w-40 items-center justify-center rounded-2xl border-8 border-slate-900 bg-white text-center text-xs font-bold text-slate-900">
                رمز QR
              </div>

              <p className="mt-4 text-center text-xs text-slate-400">
                مدعوم بواسطة LoyalFlow
              </p>
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
