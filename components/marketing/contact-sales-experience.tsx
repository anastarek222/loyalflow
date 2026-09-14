"use client";

import {
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Globe2,
  LogIn,
  Mail,
  MessageCircle,
  Phone,
  UserRound,
  Video,
} from "lucide-react";
import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";

import type { SupportedLocale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

type SupportChannel = Readonly<{
  kind: "email" | "whatsapp" | "phone";
  displayValue: string;
  href: string;
}>;

type ContactSalesExperienceProps = {
  locale: SupportedLocale;
  supportChannels: ReadonlyArray<SupportChannel>;
};

type MeetingMethod =
  | "phone"
  | "whatsapp"
  | "google-meet"
  | "zoom"
  | "teams"
  | "ringcentral";

const copy = {
  en: {
    eyebrow: "Talk to Tanee",
    title: "The right conversation can save you a lot of setup time.",
    body: "Book time with our team, message us on WhatsApp, or reach us directly. We’ll help you choose the best next step for your business.",
    routeMeeting: "Book a meeting",
    routeMeetingBody:
      "Tell us about your business, preferred time and how you would like to meet.",
    routeWhatsapp: "Chat on WhatsApp",
    routeWhatsappBody:
      "Best for a quick question, pricing clarification or a fast follow-up.",
    routeDirect: "Call or email",
    routeDirectBody:
      "Reach the Tanee team directly using the approved contact details.",
    explore: "Choose this option",
    bookingEyebrow: "Book a meeting",
    bookingTitle: "Tell us how you would like to meet.",
    bookingBody:
      "Choose your preferred date, time and meeting method. We’ll confirm availability and send the final meeting details by email.",
    noAccount: "No Tanee account needed",
    timezoneAware: "Your local timezone is shown",
    methodsTitle: "Preferred meeting method",
    methodsBody:
      "Choose the option that works best for you. The final link or call details are confirmed after we check availability.",
    methodPhone: "Phone call",
    methodPhoneBody: "We call the number you provide.",
    methodWhatsapp: "WhatsApp call",
    methodWhatsappBody: "Use your WhatsApp number for the call.",
    methodGoogle: "Google Meet",
    methodGoogleBody: "Receive a Google Meet link after confirmation.",
    methodZoom: "Zoom",
    methodZoomBody: "Receive a Zoom meeting link after confirmation.",
    methodTeams: "Microsoft Teams",
    methodTeamsBody: "Receive a Teams meeting link after confirmation.",
    methodRingCentral: "RingCentral",
    methodRingCentralBody: "Use RingCentral when it suits your business.",
    name: "Your name",
    business: "Business name",
    email: "Business email",
    phone: "Phone / WhatsApp number",
    country: "Country",
    purpose: "What would you like to discuss?",
    purposePlaceholder: "Choose a topic",
    purposeDemo: "Product demo",
    purposePricing: "Pricing and plan selection",
    purposeSetup: "Business setup and onboarding",
    purposeMigration: "Moving from another loyalty setup",
    purposeOther: "Something else",
    preferredDate: "Preferred date",
    preferredTime: "Preferred time",
    notes: "Anything we should know?",
    notesPlaceholder:
      "Optional — tell us about your business, locations, team or what you want to solve.",
    request: "Prepare meeting request",
    requestNote:
      "This is a meeting request, not an instant confirmation. We’ll confirm the exact time and meeting link with you.",
    readyTitle: "Your meeting request is ready.",
    readyBody:
      "Send it to Tanee by email or WhatsApp. We’ll reply with availability and the final meeting details.",
    sendEmail: "Send by email",
    sendWhatsapp: "Send on WhatsApp",
    directEyebrow: "Direct contact",
    directTitle: "Prefer to speak right away?",
    directBody:
      "Use any of the approved Tanee contact channels below. For existing accounts, sign in for account-specific help.",
    whatsappLabel: "WhatsApp",
    phoneLabel: "Phone",
    emailLabel: "Email",
    existingTitle: "Already using Tanee?",
    existingBody:
      "Sign in so account-specific questions stay separate from new-business sales conversations.",
    signIn: "Sign in to Tanee",
    timezone: "Timezone",
  },
  ar: {
    eyebrow: "تكلّم مع Tanee",
    title: "مكالمة صح ممكن توفّر عليك وقت كبير في تجهيز نشاطك.",
    body: "احجز وقت مع فريقنا، كلّمنا على WhatsApp، أو تواصل معانا مباشرة. هنساعدك تختار أنسب خطوة لنشاطك.",
    routeMeeting: "احجز اجتماع",
    routeMeetingBody:
      "قول لنا عن نشاطك، الوقت المناسب والطريقة اللي تفضّل نتقابل بيها.",
    routeWhatsapp: "كلّمنا على WhatsApp",
    routeWhatsappBody:
      "أنسب اختيار لسؤال سريع، توضيح الأسعار أو متابعة مباشرة.",
    routeDirect: "اتصل أو ابعت إيميل",
    routeDirectBody:
      "تواصل مباشرة مع فريق Tanee من خلال بيانات التواصل المعتمدة.",
    explore: "اختار الطريقة دي",
    bookingEyebrow: "احجز اجتماع",
    bookingTitle: "قول لنا تحب نتقابل إزاي.",
    bookingBody:
      "اختار اليوم والوقت وطريقة الاجتماع المفضلة. هنأكد التوفر ونبعت لك تفاصيل الاجتماع النهائية على الإيميل.",
    noAccount: "مش محتاج حساب Tanee",
    timezoneAware: "المواعيد بتوقيتك المحلي",
    methodsTitle: "طريقة الاجتماع المفضلة",
    methodsBody:
      "اختار الطريقة الأنسب ليك. رابط الاجتماع أو تفاصيل المكالمة بيتأكدوا بعد مراجعة التوفر.",
    methodPhone: "مكالمة تليفون",
    methodPhoneBody: "نتصل على الرقم اللي هتكتبه.",
    methodWhatsapp: "مكالمة WhatsApp",
    methodWhatsappBody: "نستخدم رقم WhatsApp الخاص بيك للمكالمة.",
    methodGoogle: "Google Meet",
    methodGoogleBody: "يوصلك رابط Google Meet بعد التأكيد.",
    methodZoom: "Zoom",
    methodZoomBody: "يوصلك رابط Zoom بعد التأكيد.",
    methodTeams: "Microsoft Teams",
    methodTeamsBody: "يوصلك رابط Teams بعد التأكيد.",
    methodRingCentral: "RingCentral",
    methodRingCentralBody: "نستخدم RingCentral لو هو الأنسب لنشاطك.",
    name: "اسمك",
    business: "اسم النشاط",
    email: "إيميل العمل",
    phone: "رقم التليفون / WhatsApp",
    country: "الدولة",
    purpose: "حابب نتكلم في إيه؟",
    purposePlaceholder: "اختار الموضوع",
    purposeDemo: "عرض للمنتج",
    purposePricing: "الأسعار واختيار الخطة",
    purposeSetup: "إعداد النشاط والبدء",
    purposeMigration: "النقل من نظام ولاء تاني",
    purposeOther: "موضوع تاني",
    preferredDate: "اليوم المفضّل",
    preferredTime: "الوقت المفضّل",
    notes: "في حاجة تحب نعرفها قبل الاجتماع؟",
    notesPlaceholder:
      "اختياري — قول لنا عن نشاطك أو الفروع أو الفريق أو المشكلة اللي عايز تحلها.",
    request: "جهّز طلب الاجتماع",
    requestNote:
      "ده طلب اجتماع مش تأكيد فوري. هنأكد معاك الموعد النهائي ورابط الاجتماع.",
    readyTitle: "طلب الاجتماع جاهز.",
    readyBody:
      "ابعت الطلب لـTanee على الإيميل أو WhatsApp، وهنرد عليك بالتوفر وتفاصيل الاجتماع النهائية.",
    sendEmail: "ابعت بالإيميل",
    sendWhatsapp: "ابعت على WhatsApp",
    directEyebrow: "تواصل مباشر",
    directTitle: "تفضّل تتكلم دلوقتي؟",
    directBody:
      "استخدم أي وسيلة تواصل معتمدة تحت. لو عندك حساب بالفعل، سجّل الدخول علشان أسئلة الحساب تبقى منفصلة عن مبيعات الأنشطة الجديدة.",
    whatsappLabel: "WhatsApp",
    phoneLabel: "التليفون",
    emailLabel: "الإيميل",
    existingTitle: "بتستخدم Tanee بالفعل؟",
    existingBody:
      "سجّل الدخول علشان الأسئلة الخاصة بحسابك تفضل منفصلة عن محادثات المبيعات للأنشطة الجديدة.",
    signIn: "سجّل الدخول إلى Tanee",
    timezone: "المنطقة الزمنية",
  },
} as const;

const meetingMethodIds: MeetingMethod[] = [
  "phone",
  "whatsapp",
  "google-meet",
  "zoom",
  "teams",
  "ringcentral",
];

export function ContactSalesExperience({
  locale,
  supportChannels,
}: ContactSalesExperienceProps) {
  const content = copy[locale];
  const [timezone, setTimezone] = useState("");
  const [selectedMethod, setSelectedMethod] =
    useState<MeetingMethod>("google-meet");
  const [requestDraft, setRequestDraft] = useState<{
    emailHref: string | null;
    whatsappHref: string | null;
  } | null>(null);
  const requestActionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  const channels = useMemo(
    () =>
      Object.fromEntries(
        supportChannels.map((channel) => [channel.kind, channel]),
      ) as Partial<Record<SupportChannel["kind"], SupportChannel>>,
    [supportChannels],
  );

  const methodCopy: Record<
    MeetingMethod,
    { label: string; body: string; icon: typeof Phone }
  > = {
    phone: {
      label: content.methodPhone,
      body: content.methodPhoneBody,
      icon: Phone,
    },
    whatsapp: {
      label: content.methodWhatsapp,
      body: content.methodWhatsappBody,
      icon: MessageCircle,
    },
    "google-meet": {
      label: content.methodGoogle,
      body: content.methodGoogleBody,
      icon: Video,
    },
    zoom: {
      label: content.methodZoom,
      body: content.methodZoomBody,
      icon: Video,
    },
    teams: {
      label: content.methodTeams,
      body: content.methodTeamsBody,
      icon: Video,
    },
    ringcentral: {
      label: content.methodRingCentral,
      body: content.methodRingCentralBody,
      icon: Video,
    },
  };

  const directHref = channels.phone?.href ?? channels.email?.href ?? "#contact-options";
  const whatsappHref = channels.whatsapp?.href ?? "#contact-options";

  const onRequestMeeting = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = (name: string) => String(data.get(name) ?? "").trim();
    const method = methodCopy[selectedMethod].label;
    const lines = [
      locale === "en" ? "Tanee meeting request" : "طلب اجتماع مع Tanee",
      "",
      `${content.name}: ${value("name")}`,
      `${content.business}: ${value("business")}`,
      `${content.email}: ${value("email")}`,
      `${content.phone}: ${value("phone")}`,
      `${content.country}: ${value("country")}`,
      `${content.purpose}: ${value("purpose")}`,
      `${content.preferredDate}: ${value("preferredDate")}`,
      `${content.preferredTime}: ${value("preferredTime")}`,
      `${content.timezone}: ${timezone || "Local time"}`,
      `${content.methodsTitle}: ${method}`,
      `${content.notes}: ${value("notes") || "—"}`,
    ];
    const message = lines.join("\n");
    const subject =
      locale === "en"
        ? `Tanee meeting request — ${value("business")}`
        : `طلب اجتماع مع Tanee — ${value("business")}`;

    setRequestDraft({
      emailHref: channels.email
        ? `${channels.email.href}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`
        : null,
      whatsappHref: channels.whatsapp
        ? `${channels.whatsapp.href}?text=${encodeURIComponent(message)}`
        : null,
    });
    requestAnimationFrame(() =>
      requestActionsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      }),
    );
  };

  return (
    <>
      <section className="mx-auto w-full max-w-[1240px] px-5 pb-10 pt-12 text-center sm:px-8 md:pb-14 md:pt-16 lg:px-10">
        <p className="inline-flex items-center rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-semibold text-primary shadow-sm">
          {content.eyebrow}
        </p>
        <h1 className="mx-auto mt-6 max-w-4xl text-balance font-[var(--font-marketing-editorial)] text-[36px] font-normal leading-[1.15] tracking-tight text-foreground md:text-5xl lg:text-[58px]">
          {content.title}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-foreground-muted md:text-lg">
          {content.body}
        </p>
      </section>

      <section
        id="contact-options"
        aria-label={content.eyebrow}
        className="mx-auto w-full max-w-[1120px] scroll-mt-28 px-5 pb-16 sm:px-8 lg:px-10"
      >
        <div className="grid gap-5 md:grid-cols-3">
          <a
            href="#book-meeting"
            className="group flex min-h-64 flex-col rounded-2xl border border-primary/25 bg-primary p-6 text-[var(--lf-primary-foreground)] shadow-sm transition-transform duration-200 hover:-translate-y-1 md:p-7"
          >
            <span className="flex size-12 items-center justify-center rounded-xl bg-white/15">
              <CalendarDays size={22} aria-hidden="true" />
            </span>
            <h2 className="mt-7 font-[var(--font-marketing-editorial)] text-2xl font-semibold tracking-tight">
              {content.routeMeeting}
            </h2>
            <p className="mt-3 flex-1 text-sm leading-7 text-white/80">
              {content.routeMeetingBody}
            </p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold">
              {content.explore}
              <ArrowRight
                size={17}
                aria-hidden="true"
                className="transition-transform group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1"
              />
            </span>
          </a>

          <a
            id="whatsapp"
            href={whatsappHref}
            target={channels.whatsapp ? "_blank" : undefined}
            rel={channels.whatsapp ? "noreferrer" : undefined}
            className="group flex min-h-64 scroll-mt-28 flex-col rounded-2xl border border-border bg-surface p-6 shadow-sm transition-[transform,border-color] duration-200 hover:-translate-y-1 hover:border-primary/40 md:p-7"
          >
            <span className="flex size-12 items-center justify-center rounded-xl bg-[var(--lf-primary-soft)] text-primary">
              <MessageCircle size={22} aria-hidden="true" />
            </span>
            <h2 className="mt-7 font-[var(--font-marketing-editorial)] text-2xl font-semibold tracking-tight text-foreground">
              {content.routeWhatsapp}
            </h2>
            <p className="mt-3 flex-1 text-sm leading-7 text-foreground-muted">
              {content.routeWhatsappBody}
            </p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary">
              {content.explore}
              <ArrowRight
                size={17}
                aria-hidden="true"
                className="transition-transform group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1"
              />
            </span>
          </a>

          <a
            href={directHref}
            className="group flex min-h-64 flex-col rounded-2xl border border-border bg-surface p-6 shadow-sm transition-[transform,border-color] duration-200 hover:-translate-y-1 hover:border-primary/40 md:p-7"
          >
            <span className="flex size-12 items-center justify-center rounded-xl bg-[var(--lf-primary-soft)] text-primary">
              <Phone size={22} aria-hidden="true" />
            </span>
            <h2 className="mt-7 font-[var(--font-marketing-editorial)] text-2xl font-semibold tracking-tight text-foreground">
              {content.routeDirect}
            </h2>
            <p className="mt-3 flex-1 text-sm leading-7 text-foreground-muted">
              {content.routeDirectBody}
            </p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary">
              {content.explore}
              <ArrowRight
                size={17}
                aria-hidden="true"
                className="transition-transform group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1"
              />
            </span>
          </a>
        </div>
      </section>

      <section
        id="book-meeting"
        className="scroll-mt-24 border-y border-border bg-surface px-5 py-16 sm:px-8 md:py-20 lg:px-10"
      >
        <div className="mx-auto grid w-full max-w-[1120px] gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
              {content.bookingEyebrow}
            </p>
            <h2 className="mt-4 max-w-lg font-[var(--font-marketing-editorial)] text-3xl font-normal leading-[1.2] tracking-tight text-foreground md:text-4xl">
              {content.bookingTitle}
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-7 text-foreground-muted md:text-base">
              {content.bookingBody}
            </p>
            <div className="mt-7 grid gap-3 text-sm text-foreground-muted">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={18} aria-hidden="true" className="text-primary" />
                <span>{content.noAccount}</span>
              </div>
              <div className="flex items-center gap-3">
                <Globe2 size={18} aria-hidden="true" className="text-primary" />
                <span>
                  {content.timezoneAware}
                  {timezone ? ` · ${timezone}` : ""}
                </span>
              </div>
            </div>
          </div>

          <form
            onSubmit={onRequestMeeting}
            className="rounded-2xl border border-border bg-[var(--lf-marketing-canvas)] p-5 shadow-sm sm:p-7"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-foreground">
                <span>{content.name}</span>
                <span className="relative">
                  <UserRound
                    size={17}
                    aria-hidden="true"
                    className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-foreground-subtle"
                  />
                  <input
                    name="name"
                    required
                    autoComplete="name"
                    className="min-h-12 w-full rounded-[var(--lf-radius-input)] border border-border bg-surface ps-10 pe-3 text-sm outline-none transition-colors focus:border-primary"
                  />
                </span>
              </label>

              <label className="grid gap-2 text-sm font-semibold text-foreground">
                <span>{content.business}</span>
                <span className="relative">
                  <Building2
                    size={17}
                    aria-hidden="true"
                    className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-foreground-subtle"
                  />
                  <input
                    name="business"
                    required
                    autoComplete="organization"
                    className="min-h-12 w-full rounded-[var(--lf-radius-input)] border border-border bg-surface ps-10 pe-3 text-sm outline-none transition-colors focus:border-primary"
                  />
                </span>
              </label>

              <label className="grid gap-2 text-sm font-semibold text-foreground">
                <span>{content.email}</span>
                <span className="relative">
                  <Mail
                    size={17}
                    aria-hidden="true"
                    className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-foreground-subtle"
                  />
                  <input
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    className="min-h-12 w-full rounded-[var(--lf-radius-input)] border border-border bg-surface ps-10 pe-3 text-sm outline-none transition-colors focus:border-primary"
                  />
                </span>
              </label>

              <label className="grid gap-2 text-sm font-semibold text-foreground">
                <span>{content.phone}</span>
                <span className="relative">
                  <Phone
                    size={17}
                    aria-hidden="true"
                    className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-foreground-subtle"
                  />
                  <input
                    name="phone"
                    type="tel"
                    required
                    autoComplete="tel"
                    inputMode="tel"
                    className="min-h-12 w-full rounded-[var(--lf-radius-input)] border border-border bg-surface ps-10 pe-3 text-sm outline-none transition-colors focus:border-primary"
                  />
                </span>
              </label>

              <label className="grid gap-2 text-sm font-semibold text-foreground">
                <span>{content.country}</span>
                <input
                  name="country"
                  required
                  autoComplete="country-name"
                  className="min-h-12 rounded-[var(--lf-radius-input)] border border-border bg-surface px-3 text-sm outline-none transition-colors focus:border-primary"
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold text-foreground">
                <span>{content.purpose}</span>
                <select
                  name="purpose"
                  required
                  defaultValue=""
                  className="min-h-12 rounded-[var(--lf-radius-input)] border border-border bg-surface px-3 text-sm outline-none transition-colors focus:border-primary"
                >
                  <option value="" disabled>
                    {content.purposePlaceholder}
                  </option>
                  <option value={content.purposeDemo}>{content.purposeDemo}</option>
                  <option value={content.purposePricing}>
                    {content.purposePricing}
                  </option>
                  <option value={content.purposeSetup}>{content.purposeSetup}</option>
                  <option value={content.purposeMigration}>
                    {content.purposeMigration}
                  </option>
                  <option value={content.purposeOther}>{content.purposeOther}</option>
                </select>
              </label>

              <label className="grid gap-2 text-sm font-semibold text-foreground">
                <span>{content.preferredDate}</span>
                <span className="relative">
                  <CalendarDays
                    size={17}
                    aria-hidden="true"
                    className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-foreground-subtle"
                  />
                  <input
                    name="preferredDate"
                    type="date"
                    required
                    className="min-h-12 w-full rounded-[var(--lf-radius-input)] border border-border bg-surface ps-10 pe-3 text-sm outline-none transition-colors focus:border-primary"
                  />
                </span>
              </label>

              <label className="grid gap-2 text-sm font-semibold text-foreground">
                <span>{content.preferredTime}</span>
                <span className="relative">
                  <Clock3
                    size={17}
                    aria-hidden="true"
                    className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-foreground-subtle"
                  />
                  <input
                    name="preferredTime"
                    type="time"
                    required
                    className="min-h-12 w-full rounded-[var(--lf-radius-input)] border border-border bg-surface ps-10 pe-3 text-sm outline-none transition-colors focus:border-primary"
                  />
                </span>
              </label>
            </div>

            <fieldset className="mt-7">
              <legend className="text-sm font-bold text-foreground">
                {content.methodsTitle}
              </legend>
              <p className="mt-1 text-xs leading-5 text-foreground-muted">
                {content.methodsBody}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {meetingMethodIds.map((methodId) => {
                  const method = methodCopy[methodId];
                  const Icon = method.icon;
                  const selected = selectedMethod === methodId;
                  return (
                    <label
                      key={methodId}
                      className={cn(
                        "flex min-h-24 cursor-pointer gap-3 rounded-xl border p-4 transition-colors",
                        selected
                          ? "border-primary bg-[var(--lf-primary-soft)]"
                          : "border-border bg-surface hover:border-primary/35",
                      )}
                    >
                      <input
                        type="radio"
                        name="meetingMethod"
                        value={methodId}
                        checked={selected}
                        onChange={() => setSelectedMethod(methodId)}
                        className="sr-only"
                      />
                      <span
                        className={cn(
                          "flex size-10 shrink-0 items-center justify-center rounded-xl border",
                          selected
                            ? "border-primary/20 bg-primary text-[var(--lf-primary-foreground)]"
                            : "border-border bg-[var(--lf-marketing-canvas)] text-primary",
                        )}
                      >
                        <Icon size={18} aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-bold text-foreground">
                          {method.label}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-foreground-muted">
                          {method.body}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <label className="mt-6 grid gap-2 text-sm font-semibold text-foreground">
              <span>{content.notes}</span>
              <textarea
                name="notes"
                rows={4}
                placeholder={content.notesPlaceholder}
                className="resize-y rounded-[var(--lf-radius-input)] border border-border bg-surface px-3 py-3 text-sm leading-6 outline-none transition-colors focus:border-primary"
              />
            </label>

            <button
              type="submit"
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-[var(--lf-primary-foreground)] transition-colors hover:bg-primary-hover sm:w-auto"
            >
              {content.request}
              <ArrowRight size={17} aria-hidden="true" className="rtl:-scale-x-100" />
            </button>
            <p className="mt-3 max-w-2xl text-xs leading-5 text-foreground-subtle">
              {content.requestNote}
            </p>

            {requestDraft ? (
              <div
                ref={requestActionsRef}
                role="status"
                className="mt-6 rounded-xl border border-primary/25 bg-[var(--lf-primary-soft)] p-5"
              >
                <div className="flex items-start gap-3">
                  <CheckCircle2
                    size={20}
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-primary"
                  />
                  <div>
                    <p className="font-bold text-foreground">{content.readyTitle}</p>
                    <p className="mt-1 text-sm leading-6 text-foreground-muted">
                      {content.readyBody}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  {requestDraft.emailHref ? (
                    <a
                      href={requestDraft.emailHref}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-[var(--lf-primary-foreground)]"
                    >
                      <Mail size={17} aria-hidden="true" />
                      {content.sendEmail}
                    </a>
                  ) : null}
                  {requestDraft.whatsappHref ? (
                    <a
                      href={requestDraft.whatsappHref}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-bold text-foreground hover:border-primary/40 hover:text-primary"
                    >
                      <MessageCircle size={17} aria-hidden="true" />
                      {content.sendWhatsapp}
                    </a>
                  ) : null}
                </div>
              </div>
            ) : null}
          </form>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1120px] px-5 py-16 sm:px-8 md:py-20 lg:px-10">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
          {content.directEyebrow}
        </p>
        <h2 className="mt-3 font-[var(--font-marketing-editorial)] text-3xl font-normal tracking-tight text-foreground md:text-4xl">
          {content.directTitle}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-foreground-muted md:text-base">
          {content.directBody}
        </p>

        <div className="mt-7 grid gap-4 md:grid-cols-3">
          {supportChannels.map((channel) => {
            const channelCopy = {
              whatsapp: {
                label: content.whatsappLabel,
                icon: MessageCircle,
              },
              phone: { label: content.phoneLabel, icon: Phone },
              email: { label: content.emailLabel, icon: Mail },
            }[channel.kind];
            const Icon = channelCopy.icon;
            return (
              <a
                key={channel.kind}
                href={channel.href}
                target={channel.kind === "whatsapp" ? "_blank" : undefined}
                rel={channel.kind === "whatsapp" ? "noreferrer" : undefined}
                className="flex min-h-24 min-w-0 items-center gap-4 rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-primary/40"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--lf-primary-soft)] text-primary">
                  <Icon size={19} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-foreground">
                    {channelCopy.label}
                  </span>
                  <span className="mt-1 block break-all text-sm text-foreground-muted">
                    {channel.displayValue}
                  </span>
                </span>
              </a>
            );
          })}
        </div>

        <aside className="mt-8 flex flex-col justify-between gap-5 rounded-2xl border border-border bg-surface p-6 sm:flex-row sm:items-center md:p-7">
          <div className="flex gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--lf-primary-soft)] text-primary">
              <LogIn size={19} aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-[var(--font-marketing-editorial)] text-xl font-semibold tracking-tight text-foreground">
                {content.existingTitle}
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-foreground-muted">
                {content.existingBody}
              </p>
            </div>
          </div>
          <Link
            href="/login"
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-border bg-[var(--lf-marketing-canvas)] px-4 text-sm font-bold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            {content.signIn}
          </Link>
        </aside>
      </section>
    </>
  );
}
