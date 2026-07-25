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
      className="mb-8 rounded-[var(--lf-radius-card)] border border-border bg-white p-6 shadow-sm sm:p-8"
    >
      <div>
        <p className="text-sm font-semibold text-primary">
          بيانات ثابتة لكل كروت البراند
        </p>

        <h2 className="mt-1 text-xl font-bold text-foreground">
          بيانات الكارت والتواصل
        </h2>

        <p className="mt-2 text-sm leading-6 text-foreground-subtle">
          يتم إدخال هذه البيانات مرة واحدة، ثم تظهر تلقائيًا
          في كل كروت عملاء هذا البراند.
        </p>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <label
            htmlFor="contactPhone"
            className="mb-2 block text-sm font-medium text-foreground-muted"
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
            className="w-full rounded-[var(--lf-radius-input)] border border-border px-4 py-4 text-foreground outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/20"
          />
        </div>

        <div>
          <label
            htmlFor="address"
            className="mb-2 block text-sm font-medium text-foreground-muted"
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
            className="w-full rounded-[var(--lf-radius-input)] border border-border px-4 py-4 text-foreground outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/20"
          />
        </div>
      </div>

      <div className="mt-6">
        <label
          htmlFor="cardTerms"
          className="mb-2 block text-sm font-medium text-foreground-muted"
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
          className="w-full resize-y rounded-[var(--lf-radius-input)] border border-border px-4 py-4 text-foreground outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/20"
        />

        <p className="mt-2 text-xs leading-5 text-foreground-subtle">
          اكتب كل شرط في سطر منفصل. سيظهر تلقائيًا كعنصر
          مستقل في ظهر الكارت.
        </p>

        <div className="mt-4 rounded-[var(--lf-radius-card)] border border-primary/30 bg-primary-subtle p-4 text-sm text-primary">
          <p className="font-bold">
            متغيرات يتم تحديثها تلقائيًا داخل الشروط:
          </p>

          <div className="mt-4 flex flex-wrap gap-2 font-mono text-xs">
            <code className="rounded-[var(--lf-radius-input)] bg-white px-2 py-1">
              {"{reward}"}
            </code>

            <code className="rounded-[var(--lf-radius-input)] bg-white px-2 py-1">
              {"{threshold}"}
            </code>

            <code className="rounded-[var(--lf-radius-input)] bg-white px-2 py-1">
              {"{unit}"}
            </code>

            <code className="rounded-[var(--lf-radius-input)] bg-white px-2 py-1">
              {"{earn}"}
            </code>
          </div>

          <p className="mt-4 text-xs leading-5">
            مثال: عند الوصول إلى {"{threshold}"} {"{unit}"}
            يحصل العميل على {"{reward}"}.
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-[var(--lf-radius-card)] border border-info/30 bg-info-subtle p-4 text-sm leading-6 text-info">
        اسم المكافأة والعدد المطلوب يتم التحكم فيهما من
        إعدادات برنامج الولاء الموجودة أسفل الصفحة، ولن
        تحتاج لتعديل تصميم الكارت عند تغيير المكافأة.
      </div>

      <button
        type="submit"
        className="mt-6 w-full rounded-[var(--lf-radius-input)] bg-foreground px-6 py-4 font-semibold text-white transition hover:bg-primary-subtle sm:w-auto"
      >
        حفظ بيانات الكارت
      </button>
    </form>
  );
}
