"use client";

type CardBusinessDetailsFormProps = {
  contactPhone: string;
  address: string;
  cardTerms: string;
  action: (
    formData: FormData
  ) => void | Promise<void>;
};

export default function CardBusinessDetailsForm({
  contactPhone,
  address,
  cardTerms,
  action,
}: CardBusinessDetailsFormProps) {
  return (
    <form
      action={action}
      className="mb-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
    >
      <div>
        <p className="text-sm font-semibold text-violet-600">
          بيانات ثابتة لكل كروت البراند
        </p>

        <h2 className="mt-1 text-xl font-bold text-slate-950">
          بيانات الكارت والتواصل
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          يتم إدخال هذه البيانات مرة واحدة، ثم تظهر تلقائيًا
          في كل كروت عملاء هذا البراند.
        </p>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="contactPhone"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            رقم الهاتف
          </label>

          <input
            id="contactPhone"
            name="contactPhone"
            type="tel"
            defaultValue={contactPhone}
            required
            maxLength={25}
            placeholder="01033196610"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
          />
        </div>

        <div>
          <label
            htmlFor="address"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            العنوان
          </label>

          <input
            id="address"
            name="address"
            dir="auto"
            defaultValue={address}
            required
            maxLength={250}
            placeholder="١ شارع دكتور لاشين..."
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
          />
        </div>
      </div>

      <div className="mt-5">
        <label
          htmlFor="cardTerms"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          شروط الكارت
        </label>

        <textarea
          id="cardTerms"
          name="cardTerms"
          dir="auto"
          rows={5}
          required
          maxLength={1200}
          defaultValue={cardTerms}
          className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
        />

        <p className="mt-2 text-xs leading-5 text-slate-500">
          اكتب كل شرط في سطر منفصل. سيظهر تلقائيًا كعنصر
          مستقل في ظهر الكارت.
        </p>

        <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900">
          <p className="font-bold">
            متغيرات يتم تحديثها تلقائيًا داخل الشروط:
          </p>

          <div className="mt-3 flex flex-wrap gap-2 font-mono text-xs">
            <code className="rounded-lg bg-white px-2 py-1">
              {"{reward}"}
            </code>

            <code className="rounded-lg bg-white px-2 py-1">
              {"{threshold}"}
            </code>

            <code className="rounded-lg bg-white px-2 py-1">
              {"{unit}"}
            </code>

            <code className="rounded-lg bg-white px-2 py-1">
              {"{earn}"}
            </code>
          </div>

          <p className="mt-3 text-xs leading-5">
            مثال: عند الوصول إلى {"{threshold}"} {"{unit}"}
            يحصل العميل على {"{reward}"}.
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
        اسم المكافأة والعدد المطلوب يتم التحكم فيهما من
        إعدادات برنامج الولاء الموجودة أسفل الصفحة، ولن
        تحتاج لتعديل تصميم الكارت عند تغيير المكافأة.
      </div>

      <button
        type="submit"
        className="mt-6 w-full rounded-xl bg-slate-950 px-6 py-3 font-semibold text-white transition hover:bg-violet-700 sm:w-auto"
      >
        حفظ بيانات الكارت
      </button>
    </form>
  );
}
