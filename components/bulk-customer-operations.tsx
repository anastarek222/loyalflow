"use client";

import type { BulkCustomerOperation } from "@/lib/customers/bulk";
import { useMemo, useState, type FormEvent } from "react";

type SelectableCustomer = {
  id: string;
  name: string;
  phone: string;
};

type CustomerTag = { id: string; name: string };

type BulkCustomerOperationsProps = {
  customers: SelectableCustomer[];
  tags: CustomerTag[];
  exportUrl: string;
  campaignUrl: string;
  canExport: boolean;
  canUseCampaigns: boolean;
  action: (formData: FormData) => void | Promise<void>;
};

const destructiveOperations = new Set<BulkCustomerOperation>([
  "DEACTIVATE",
  "REMOVE_TAG",
]);

export default function BulkCustomerOperations({
  customers,
  tags,
  exportUrl,
  campaignUrl,
  canExport,
  canUseCampaigns,
  action,
}: BulkCustomerOperationsProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [operation, setOperation] = useState<BulkCustomerOperation>("ADD_TAG");
  const [tagId, setTagId] = useState("");
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedQuery = selectedIds.join(",");

  function toggleCustomer(customerId: string) {
    setSelectedIds((current) => current.includes(customerId)
      ? current.filter((id) => id !== customerId)
      : [...current, customerId]);
  }

  function selectVisible() {
    setSelectedIds(customers.map((customer) => customer.id));
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (selectedIds.length === 0) {
      event.preventDefault();
      return;
    }
    if ((operation === "ADD_TAG" || operation === "REMOVE_TAG") && !tagId) {
      event.preventDefault();
      return;
    }
    if (destructiveOperations.has(operation)) {
      const label = operation === "DEACTIVATE" ? "إيقاف" : "إزالة الوسم من";
      if (!window.confirm(`تأكيد ${label} ${selectedIds.length} عميل؟`)) {
        event.preventDefault();
      }
    }
  }

  if (customers.length === 0) return null;

  return (
    <section className="mb-5 rounded-3xl border border-violet-200 bg-violet-50 p-4 shadow-sm sm:p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-black text-violet-950">إجراءات جماعية للنتائج المعروضة</h2>
          <p className="mt-1 text-sm text-violet-800">
            {selectedIds.length} من {customers.length} محدد. الاختيار محدود لهذه الصفحة الحالية من نتائج البحث والفلاتر.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={selectVisible} className="rounded-xl border border-violet-300 bg-white px-3 py-2 text-sm font-bold text-violet-800 hover:bg-violet-100">
            تحديد المعروض
          </button>
          <button type="button" onClick={() => setSelectedIds([])} disabled={selectedIds.length === 0} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50">
            مسح الاختيار
          </button>
        </div>
      </div>

      <div className="mt-4 grid max-h-44 gap-2 overflow-y-auto rounded-2xl border border-violet-100 bg-white p-3 sm:grid-cols-2">
        {customers.map((customer) => (
          <label key={customer.id} className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-violet-50">
            <input
              type="checkbox"
              checked={selectedIdSet.has(customer.id)}
              onChange={() => toggleCustomer(customer.id)}
              className="size-4 accent-violet-600"
            />
            <span className="min-w-0">
              <strong className="block truncate text-sm text-slate-900">{customer.name}</strong>
              <span dir="ltr" className="block text-xs text-slate-500">{customer.phone}</span>
            </span>
          </label>
        ))}
      </div>

      <form action={action} onSubmit={onSubmit} className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <input type="hidden" name="customerIds" value={JSON.stringify(selectedIds)} />
        <label className="text-sm font-bold text-slate-700">
          الإجراء
          <select name="operation" value={operation} onChange={(event) => setOperation(event.target.value as BulkCustomerOperation)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-950">
            <option value="ADD_TAG">إضافة وسم</option>
            <option value="REMOVE_TAG">إزالة وسم</option>
            <option value="ACTIVATE">تفعيل العملاء</option>
            <option value="DEACTIVATE">إيقاف العملاء</option>
          </select>
        </label>

        {(operation === "ADD_TAG" || operation === "REMOVE_TAG") ? (
          <label className="text-sm font-bold text-slate-700">
            الوسم
            <select name="tagId" value={tagId} onChange={(event) => setTagId(event.target.value)} required className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-950">
              <option value="">اختر وسمًا</option>
              {tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
            </select>
          </label>
        ) : <div />}

        <button type="submit" disabled={selectedIds.length === 0 || ((operation === "ADD_TAG" || operation === "REMOVE_TAG") && !tagId)} className="self-end rounded-xl bg-violet-600 px-5 py-3 font-black text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300">
          تنفيذ على المحدد
        </button>
      </form>

      {selectedIds.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-violet-200 pt-4">
          {canExport ? (
            <a href={`${exportUrl}?ids=${encodeURIComponent(selectedQuery)}`} className="rounded-xl border border-emerald-300 bg-white px-4 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-50">
              تصدير المحدد CSV
            </a>
          ) : null}
          {canUseCampaigns ? (
            <a href={`${campaignUrl}?selected=${encodeURIComponent(selectedQuery)}`} className="rounded-xl border border-cyan-300 bg-white px-4 py-2 text-sm font-bold text-cyan-800 hover:bg-cyan-50">
              معاينة حملة للمحدد
            </a>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
