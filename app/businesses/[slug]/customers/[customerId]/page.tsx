/* eslint-disable @next/next/no-img-element */

import { auth } from "@/auth";
import { getRequestBaseUrl } from "@/lib/app-url";
import CopyLinkButton from "@/components/copy-link-button";
import prisma from "@/lib/prisma";
import {
  buildWhatsAppUrl,
  DEFAULT_WHATSAPP_TEMPLATES,
  renderWhatsAppTemplate,
} from "@/lib/whatsapp-templates";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import * as QRCode from "qrcode";

import {
  addLoyaltyAction,
  adjustCustomerBalanceAction,
  redeemRewardAction,
  setCustomerStatusAction,
  updateCustomerAction,
} from "./actions";

type CustomerDetailsPageProps = {
  params: Promise<{
    slug: string;
    customerId: string;
  }>;
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
};

export default async function CustomerDetailsPage({
  params,
  searchParams,
}: CustomerDetailsPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const { slug, customerId } = await params;
  const query = await searchParams;

  const business = await prisma.business.findUnique({
    where: {
      slug,
    },
  });

  if (!business) {
    notFound();
  }

  const canAccess =
    session.user.role === "SUPER_ADMIN" ||
    session.user.businessId === business.id;

  if (!canAccess) {
    redirect("/dashboard");
  }

  const canManageCustomer =
    session.user.role === "SUPER_ADMIN" ||
    (session.user.role === "OWNER" && session.user.businessId === business.id);

  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId,
      businessId: business.id,
    },
    include: {
      transactions: {
        orderBy: {
          createdAt: "desc",
        },
        take: 20,
        include: {
          createdBy: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      },
      _count: {
        select: {
          redemptions: true,
        },
      },
    },
  });

  if (!customer) {
    notFound();
  }

  const baseUrl = await getRequestBaseUrl();

  const cardUrl = `${baseUrl}/card/${customer.publicToken}`;

  const qrCode = await QRCode.toDataURL(cardUrl, {
    width: 240,
    margin: 1,
    errorCorrectionLevel: "M",
  });

  const progress = Math.min(
    100,
    Math.floor((customer.balance / business.rewardThreshold) * 100),
  );

  const rewardAvailable =
    customer.isActive && customer.balance >= business.rewardThreshold;

  const addLoyalty = addLoyaltyAction.bind(null, business.slug, customer.id);

  const redeemReward = redeemRewardAction.bind(
    null,
    business.slug,
    customer.id,
  );

  const updateCustomer = updateCustomerAction.bind(
    null,
    business.slug,
    customer.id,
  );

  const adjustCustomerBalance = adjustCustomerBalanceAction.bind(
    null,
    business.slug,
    customer.id,
  );

  const deactivateCustomer = setCustomerStatusAction.bind(
    null,
    business.slug,
    customer.id,
    false,
  );

  const reactivateCustomer = setCustomerStatusAction.bind(
    null,
    business.slug,
    customer.id,
    true,
  );

  const customerName = [customer.firstName, customer.lastName]
    .filter(Boolean)
    .join(" ");

  const remaining = Math.max(0, business.rewardThreshold - customer.balance);

  const whatsappContext = {
    customer: customerName,
    business: business.name,
    balance: customer.balance,
    unit: business.unitName,
    reward: business.rewardName,
    cardLink: cardUrl,
    remaining,
  };

  const welcomeWhatsAppUrl = buildWhatsAppUrl(
    customer.phone,
    renderWhatsAppTemplate(
      business.whatsappWelcomeMessage ?? DEFAULT_WHATSAPP_TEMPLATES.welcome,
      whatsappContext,
    ),
  );

  const balanceWhatsAppUrl = buildWhatsAppUrl(
    customer.phone,
    renderWhatsAppTemplate(
      business.whatsappBalanceMessage ?? DEFAULT_WHATSAPP_TEMPLATES.balance,
      whatsappContext,
    ),
  );

  const rewardWhatsAppUrl = buildWhatsAppUrl(
    customer.phone,
    renderWhatsAppTemplate(
      business.whatsappRewardMessage ?? DEFAULT_WHATSAPP_TEMPLATES.reward,
      whatsappContext,
    ),
  );

  const smartWhatsAppSuggestion =
    query.success === "created"
      ? {
          title: "تم إنشاء العميل بنجاح 👋",
          description: "أرسل رسالة الترحيب ورابط كارت الولاء للعميل الجديد.",
          url: welcomeWhatsAppUrl,
          button: "إرسال رسالة الترحيب",
        }
      : query.success === "earned"
        ? rewardAvailable
          ? {
              title: "المكافأة أصبحت جاهزة 🎁",
              description: "أرسل للعميل رسالة المكافأة الجاهزة للاستلام.",
              url: rewardWhatsAppUrl,
              button: "إرسال رسالة المكافأة",
            }
          : {
              title: "تم تحديث رصيد العميل",
              description:
                "أرسل للعميل رصيده الحالي والمتبقي للحصول على المكافأة.",
              url: balanceWhatsAppUrl,
              button: "إرسال تحديث الرصيد",
            }
        : query.success === "redeemed"
          ? {
              title: "تم استبدال المكافأة",
              description: "أرسل للعميل الرصيد الجديد بعد خصم المكافأة.",
              url: balanceWhatsAppUrl,
              button: "إرسال الرصيد الجديد",
            }
          : query.success === "adjusted"
            ? {
                title: "تم تعديل رصيد العميل",
                description: "أرسل للعميل أحدث رصيد على واتساب.",
                url: balanceWhatsAppUrl,
                button: "إرسال تحديث الرصيد",
              }
            : null;

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-100 px-4 py-5 sm:px-8 sm:py-8"
    >
      <div className="mx-auto max-w-7xl">
        <Link
          href={`/businesses/${business.slug}/customers`}
          className="text-sm font-medium text-violet-600 hover:text-violet-800"
        >
          → الرجوع إلى العملاء
        </Link>

        {query.success === "earned" && (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
            تم تحديث رصيد الولاء بنجاح.
          </div>
        )}

        {query.success === "redeemed" && (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
            تم استبدال المكافأة بنجاح.
          </div>
        )}

        {query.success === "updated" && (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
            تم تحديث بيانات العميل بنجاح.
          </div>
        )}

        {query.success === "deactivated" && (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
            تم إيقاف حساب العميل بنجاح.
          </div>
        )}

        {query.success === "reactivated" && (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
            تم إعادة تفعيل حساب العميل بنجاح.
          </div>
        )}

        {query.success === "adjusted" && (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
            تم تعديل رصيد العميل بنجاح.
          </div>
        )}

        {query.error === "adjustment-invalid" && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
            أدخل قيمة صحيحة وسببًا واضحًا.
          </div>
        )}

        {query.error === "adjustment-negative" && (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
            لا يمكن أن يصبح الرصيد أقل من صفر.
          </div>
        )}

        {query.error === "invalid" && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
            راجع بيانات العميل.
          </div>
        )}

        {query.error === "phone" && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
            أدخل رقم هاتف صحيحًا.
          </div>
        )}

        {query.error === "duplicate" && (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
            رقم الهاتف مسجل بالفعل.
          </div>
        )}

        {query.error === "not-enough" && (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
            رصيد العميل غير كافٍ لاستبدال المكافأة.
          </div>
        )}

        {smartWhatsAppSuggestion && (
          <section
            dir="rtl"
            className="mt-5 flex flex-col gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-black text-emerald-950">
                {smartWhatsAppSuggestion.title}
              </p>

              <p className="mt-1 text-sm leading-6 text-emerald-800">
                {smartWhatsAppSuggestion.description}
              </p>
            </div>

            <a
              href={smartWhatsAppSuggestion.url}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 rounded-xl bg-emerald-600 px-5 py-3 text-center font-bold text-white transition hover:bg-emerald-700"
            >
              {smartWhatsAppSuggestion.button}
            </a>
          </section>
        )}

        <div className="mt-6 grid gap-7 lg:grid-cols-[1fr_360px]">
          <div>
            <header className="rounded-3xl bg-slate-950 p-5 text-white shadow-xl sm:p-7">
              <p className="text-sm text-cyan-300">ملف العميل</p>

              <h1 dir="auto" className="mt-2 text-2xl font-bold sm:text-3xl">
                {customerName}
              </h1>

              <div className="mt-4 flex flex-wrap gap-3 text-sm">
                <span
                  className={`rounded-full px-4 py-2 font-semibold ${
                    customer.isActive
                      ? "bg-emerald-500/20 text-emerald-200"
                      : "bg-red-500/20 text-red-200"
                  }`}
                >
                  {customer.isActive ? "نشط" : "موقوف"}
                </span>

                <span className="rounded-full bg-white/10 px-4 py-2">
                  الكود: {customer.customerCode}
                </span>

                <span className="rounded-full bg-white/10 px-4 py-2">
                  {customer.phone}
                </span>
              </div>
            </header>

            <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm sm:p-7">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                <div>
                  <p className="text-sm text-slate-500">الرصيد الحالي</p>

                  <p className="mt-2 text-5xl font-bold text-slate-950">
                    {customer.balance}
                  </p>

                  <p dir="auto" className="mt-1 text-slate-500">
                    {business.unitName}
                  </p>
                </div>

                <div
                  className={`rounded-2xl px-5 py-4 ${
                    rewardAvailable
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  <p className="text-sm font-semibold">
                    {rewardAvailable
                      ? "المكافأة جاهزة 🎁"
                      : `متبقي ${business.rewardThreshold - customer.balance}`}
                  </p>

                  <p dir="auto" className="mt-1 text-xs">
                    {business.rewardName}
                  </p>

                  {rewardAvailable &&
                    business.rewardType ===
                      "PROMO_CODE" &&
                    business.rewardCode && (
                      <div className="mt-3 rounded-xl border border-emerald-300 bg-white px-4 py-3">
                        <p className="text-xs font-bold text-emerald-700">
                          Promo Code
                        </p>

                        <p
                          dir="ltr"
                          className="mt-1 select-all text-center text-xl font-black tracking-widest text-emerald-950"
                        >
                          {business.rewardCode}
                        </p>
                      </div>
                    )}

                  {rewardAvailable &&
                    business.rewardDescription && (
                      <p
                        dir="auto"
                        className="mt-2 text-xs leading-5"
                      >
                        {business.rewardDescription}
                      </p>
                    )}
                </div>
              </div>

              <div className="mt-7 h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${progress}%`,
                    backgroundColor: business.primaryColor,
                  }}
                />
              </div>

              <p className="mt-2 text-sm text-slate-500">
                {customer.balance} / {business.rewardThreshold}
              </p>

              {!customer.isActive && (
                <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  حساب العميل موقوف، لذلك عمليات الولاء غير متاحة.
                </div>
              )}

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                {business.loyaltyMode ===
                "SALES_AMOUNT" ? (
                  <form
                    action={addLoyalty}
                    className="w-full rounded-2xl border border-violet-200 bg-violet-50 p-4 sm:max-w-md"
                  >
                    <label
                      htmlFor="saleAmount"
                      className="mb-2 block text-sm font-black text-violet-950"
                    >
                      قيمة عملية البيع
                    </label>

                    <div className="flex gap-2">
                      <input
                        id="saleAmount"
                        name="saleAmount"
                        type="number"
                        min="1"
                        max="1000000000"
                        step="1"
                        required
                        inputMode="numeric"
                        placeholder="مثال: 25000"
                        disabled={!customer.isActive}
                        className="min-w-0 flex-1 rounded-xl border border-violet-200 bg-white px-4 py-3 text-lg font-black outline-none focus:border-violet-500 disabled:bg-slate-100"
                      />

                      <span
                        dir="auto"
                        className="flex items-center rounded-xl bg-white px-4 font-black text-violet-800"
                      >
                        {business.unitName}
                      </span>
                    </div>

                    <button
                      type="submit"
                      disabled={!customer.isActive}
                      className="mt-3 w-full rounded-xl bg-violet-600 px-6 py-3 font-black text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      تسجيل عملية البيع
                    </button>
                  </form>
                ) : (
                  <form action={addLoyalty} className="w-full sm:w-auto">
                  <button
                    type="submit"
                    disabled={!customer.isActive}
                    className="w-full rounded-xl bg-slate-950 px-6 py-3 font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {business.loyaltyMode === "VISITS"
                      ? `+ إضافة زيارة`
                      : `+ إضافة ${business.earnAmount} نقطة`}
                  </button>
                </form>
                )}

                <form action={redeemReward} className="w-full sm:w-auto">
                  <button
                    type="submit"
                    disabled={!customer.isActive || !rewardAvailable}
                    className="w-full rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    استبدال المكافأة
                  </button>
                </form>
              </div>
            </section>

            {canManageCustomer && (
              <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm sm:p-7">
                <h2 className="text-xl font-bold text-slate-950">
                  إدارة العميل
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  تعديل بيانات العميل أو تغيير حالة الحساب.
                </p>

                <form
                  action={updateCustomer}
                  className="mt-6 grid gap-4 sm:grid-cols-2"
                >
                  <div>
                    <label
                      htmlFor="editFirstName"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      الاسم الأول
                    </label>

                    <input
                      id="editFirstName"
                      name="firstName"
                      defaultValue={customer.firstName}
                      required
                      minLength={2}
                      maxLength={50}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="editLastName"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      اسم العائلة
                    </label>

                    <input
                      id="editLastName"
                      name="lastName"
                      defaultValue={customer.lastName ?? ""}
                      maxLength={50}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label
                      htmlFor="editPhone"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      رقم الهاتف
                    </label>

                    <input
                      id="editPhone"
                      name="phone"
                      type="tel"
                      defaultValue={customer.phone}
                      required
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="rounded-xl bg-violet-600 px-6 py-3 font-semibold text-white transition hover:bg-violet-700 sm:col-span-2"
                  >
                    حفظ تعديلات العميل
                  </button>
                </form>

                <div className="mt-7 border-t border-slate-200 pt-6">
                  <h3 className="font-bold text-slate-950">
                    تعديل الرصيد يدويًا
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    استخدم هذا الخيار لتصحيح أخطاء الرصيد فقط، ويتم تسجيل كل
                    تعديل.
                  </p>

                  <p className="mt-3 text-sm font-semibold text-violet-700">
                    الرصيد الحالي: {customer.balance} {business.unitName}
                  </p>

                  <form
                    action={adjustCustomerBalance}
                    className="mt-5 grid gap-4 sm:grid-cols-2"
                  >
                    <div>
                      <label
                        htmlFor="adjustmentDirection"
                        className="mb-2 block text-sm font-medium text-slate-700"
                      >
                        نوع التعديل
                      </label>

                      <select
                        id="adjustmentDirection"
                        name="direction"
                        defaultValue="ADD"
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-violet-500"
                      >
                        <option value="ADD">إضافة رصيد</option>

                        <option value="SUBTRACT">خصم رصيد</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="adjustmentAmount"
                        className="mb-2 block text-sm font-medium text-slate-700"
                      >
                        القيمة
                      </label>

                      <input
                        id="adjustmentAmount"
                        name="amount"
                        type="number"
                        min="1"
                        max="1000000"
                        required
                        placeholder="1"
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-500"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label
                        htmlFor="adjustmentReason التعديل"
                        className="mb-2 block text-sm font-medium text-slate-700"
                      >
                        سبب التعديل
                      </label>

                      <textarea
                        id="adjustmentReason التعديل"
                        name="reason"
                        required
                        minLength={3}
                        maxLength={200}
                        rows={3}
                        placeholder="مثال: تصحيح زيارة أُضيفت بالخطأ"
                        className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-500"
                      />
                    </div>

                    <button
                      type="submit"
                      className="rounded-xl bg-amber-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-amber-400 sm:col-span-2"
                    >
                      حفظ تعديل الرصيد
                    </button>
                  </form>
                </div>

                <div className="mt-7 border-t border-slate-200 pt-6">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                      <h3 className="font-bold text-slate-950">حالة الحساب</h3>

                      <p className="mt-1 text-sm text-slate-500">
                        العميل الموقوف لا يمكنه جمع الرصيد أو استبدال المكافآت.
                      </p>
                    </div>

                    <form
                      action={
                        customer.isActive
                          ? deactivateCustomer
                          : reactivateCustomer
                      }
                    >
                      <button
                        type="submit"
                        className={
                          customer.isActive
                            ? "rounded-xl border border-red-300 bg-red-50 px-5 py-3 font-semibold text-red-700 transition hover:bg-red-100"
                            : "rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-700"
                        }
                      >
                        {customer.isActive
                          ? "إيقاف العميل"
                          : "إعادة تفعيل العميل"}
                      </button>
                    </form>
                  </div>
                </div>
              </section>
            )}

            <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm sm:p-7">
              <h2 className="text-xl font-bold text-slate-950">سجل الحركات</h2>

              {customer.transactions.length === 0 ? (
                <p className="mt-5 text-slate-500">لا توجد حركات حتى الآن.</p>
              ) : (
                <div className="mt-5 divide-y divide-slate-100">
                  {customer.transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">
                          {transaction.type === "EARN"
                            ? "تمت إضافة رصيد ولاء"
                            : transaction.type === "REDEEM"
                              ? "تم استبدال مكافأة"
                              : "تم تعديل الرصيد"}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {transaction.createdAt.toLocaleString("ar-EG")}
                        </p>

                        {transaction.note && (
                          <p dir="auto" className="mt-1 text-xs text-slate-500">
                            {transaction.note}
                          </p>
                        )}

                        {transaction.createdBy && (
                          <p className="mt-1 text-xs text-slate-400">
                            By {transaction.createdBy.firstName}{" "}
                            {transaction.createdBy.lastName ?? ""}
                          </p>
                        )}
                      </div>

                      <div className="text-left sm:text-right">
                        <p
                          className={`text-lg font-bold ${
                            transaction.amount > 0
                              ? "text-emerald-600"
                              : "text-red-600"
                          }`}
                        >
                          {transaction.amount > 0 ? "+" : ""}
                          {transaction.amount}
                        </p>

                        <p className="text-xs text-slate-500">
                          الرصيد: {transaction.balanceAfter}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="h-fit rounded-3xl bg-white p-5 text-center shadow-sm sm:p-7">
            <h2 className="text-xl font-bold text-slate-950">
              كارت الولاء الرقمي
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              افتح الكارت أو أرسله للعميل.
            </p>

            <img
              src={qrCode}
              alt="رمز QR لكارت ولاء العميل"
              width={240}
              height={240}
              className="mx-auto mt-6 rounded-2xl border border-slate-200 p-3"
            />

            <p className="mt-4 break-all text-xs text-slate-400">{cardUrl}</p>

            <div className="mt-6 flex flex-col gap-3">
              <Link
                href={`/card/${customer.publicToken}`}
                target="_blank"
                className="rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white transition hover:bg-violet-700"
              >
                فتح كارت العميل
              </Link>

              <CopyLinkButton value={cardUrl} />

              <a
                href={welcomeWhatsAppUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-700 sm:w-auto"
              >
                إرسال رسالة الترحيب
              </a>

              <a
                href={balanceWhatsAppUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-cyan-600 px-5 py-3 font-semibold text-white transition hover:bg-cyan-700"
              >
                إرسال تحديث الرصيد
              </a>

              {rewardAvailable ? (
                <a
                  href={rewardWhatsAppUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl bg-amber-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-amber-400"
                >
                  إرسال رسالة المكافأة
                </a>
              ) : (
                <span className="cursor-not-allowed rounded-xl bg-slate-200 px-5 py-3 font-semibold text-slate-500">
                  رسالة المكافأة غير متاحة الآن
                </span>
              )}
            </div>

            <div className="mt-7 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-100 p-4">
                <p className="text-xs text-slate-500">إجمالي المكتسب</p>
                <p className="mt-1 text-xl font-bold">
                  {customer.lifetimeEarned}
                </p>
              </div>

              <div className="rounded-xl bg-slate-100 p-4">
                <p className="text-xs text-slate-500">المكافآت المستبدلة</p>
                <p className="mt-1 text-xl font-bold">
                  {customer._count.redemptions}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
