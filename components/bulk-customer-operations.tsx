"use client";

import type { BulkCustomerOperation } from "@/lib/customers/bulk";
import { customerUiCopy } from "@/lib/customers/ui-copy";
import type { AppLanguage } from "@/lib/i18n";
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
  language: AppLanguage;
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
  language,
  action,
}: BulkCustomerOperationsProps) {
  const copy = customerUiCopy(language);
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
      const label = operation === "DEACTIVATE" ? copy.deactivateCustomers : copy.removeTagAction;
      if (!window.confirm(copy.confirmBulk(label, selectedIds.length))) {
        event.preventDefault();
      }
    }
  }

  if (customers.length === 0) return null;

  return (
    <section className="mb-6 rounded-[var(--lf-radius-card)] border border-primary/30 bg-primary-subtle p-4 shadow-sm sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-black text-primary">{selectedIds.length > 0 ? copy.bulkActions : copy.selectCustomers}</h2>
          <p className="mt-1 text-sm text-primary">
            {selectedIds.length > 0 ? copy.selectedSummary(selectedIds.length, customers.length) : copy.selectCustomersDescription}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={selectVisible} className="rounded-[var(--lf-radius-input)] border border-primary/30 bg-white px-4 py-2 text-sm font-bold text-primary hover:bg-primary-subtle">
            {copy.selectVisible}
          </button>
          <button type="button" onClick={() => setSelectedIds([])} disabled={selectedIds.length === 0} className="rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-2 text-sm font-bold text-foreground-muted disabled:cursor-not-allowed disabled:opacity-50">
            {copy.clearSelection}
          </button>
        </div>
      </div>

      <div className="mt-4 grid max-h-44 gap-2 overflow-y-auto rounded-[var(--lf-radius-card)] border border-primary/30 bg-white p-4 sm:grid-cols-2">
        {customers.map((customer) => (
          <label key={customer.id} className="flex cursor-pointer items-center gap-4 rounded-[var(--lf-radius-input)] px-2 py-1.5 hover:bg-primary-subtle">
            <input
              type="checkbox"
              checked={selectedIdSet.has(customer.id)}
              onChange={() => toggleCustomer(customer.id)}
              className="size-4 accent-[var(--lf-primary)]"
            />
            <span className="min-w-0">
              <strong className="block truncate text-sm text-foreground">{customer.name}</strong>
              <span dir="ltr" className="block text-xs text-foreground-subtle">{customer.phone}</span>
            </span>
          </label>
        ))}
      </div>

      {selectedIds.length > 0 ? <form action={action} onSubmit={onSubmit} className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <input type="hidden" name="customerIds" value={JSON.stringify(selectedIds)} />
        <label className="text-sm font-bold text-foreground-muted">
          {copy.bulkAction}
          <select name="operation" value={operation} onChange={(event) => setOperation(event.target.value as BulkCustomerOperation)} className="mt-1 w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-2.5 text-foreground">
            <option value="ADD_TAG">{copy.addTag}</option>
            <option value="REMOVE_TAG">{copy.removeTagAction}</option>
            <option value="ACTIVATE">{copy.activateCustomers}</option>
            <option value="DEACTIVATE">{copy.deactivateCustomers}</option>
          </select>
        </label>

        {(operation === "ADD_TAG" || operation === "REMOVE_TAG") ? (
          <label className="text-sm font-bold text-foreground-muted">
            {copy.tag}
            <select name="tagId" value={tagId} onChange={(event) => setTagId(event.target.value)} required className="mt-1 w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-2.5 text-foreground">
              <option value="">{copy.selectTag}</option>
              {tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
            </select>
          </label>
        ) : <div />}

        <button type="submit" disabled={selectedIds.length === 0 || ((operation === "ADD_TAG" || operation === "REMOVE_TAG") && !tagId)} className="self-end rounded-[var(--lf-radius-input)] bg-primary px-6 py-4 font-black text-[var(--lf-primary-foreground)] hover:bg-primary-subtle disabled:cursor-not-allowed disabled:bg-surface-subtle">
          {copy.runSelected}
        </button>
      </form> : null}

      {selectedIds.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-primary/30 pt-4">
          {canExport ? (
            <a href={`${exportUrl}?ids=${encodeURIComponent(selectedQuery)}`} className="rounded-[var(--lf-radius-input)] border border-success/30 bg-white px-4 py-2 text-sm font-bold text-success hover:bg-success-subtle">
              {copy.exportSelected}
            </a>
          ) : null}
          {canUseCampaigns ? (
            <a href={`${campaignUrl}?selected=${encodeURIComponent(selectedQuery)}`} className="rounded-[var(--lf-radius-input)] border border-info/30 bg-white px-4 py-2 text-sm font-bold text-info hover:bg-info-subtle">
              {copy.campaignSelected}
            </a>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
