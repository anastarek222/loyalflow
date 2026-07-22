"use client";

import { useState } from "react";

type Props = {
  action: (formData: FormData) => void;
};

const steps = [
  "Business",
  "Owner",
  "Loyalty",
  "Branding",
  "Review",
];

export default function BusinessSetupWizard({
  action,
}: Props) {
  const [step, setStep] = useState(0);

  return (
    <form
      action={action}
      className="mt-6 space-y-5"
    >

      <div className="mb-6">
        <div className="flex items-center justify-between">
          {steps.map((item,index)=>(
            <div
              key={item}
              className={`text-xs font-bold ${
                index === step
                  ? "text-violet-600"
                  : "text-slate-400"
              }`}
            >
              {index + 1}. {item}
            </div>
          ))}
        </div>

        <div className="mt-3 h-2 rounded-full bg-slate-100">
          <div
            className="h-2 rounded-full bg-violet-600 transition-all"
            style={{
              width: `${((step + 1) / steps.length) * 100}%`,
            }}
          />
        </div>
      </div>


      {step === 0 && (
        <section className="space-y-4">
          <h3 className="text-lg font-black">
            Business Information
          </h3>

          <input
            name="name"
            required
            placeholder="Business name"
            className="w-full rounded-xl border px-4 py-3"
          />

          <input
            name="contactPhone"
            placeholder="Phone"
            className="w-full rounded-xl border px-4 py-3"
          />

          <input
            name="industry"
            placeholder="Industry"
            className="w-full rounded-xl border px-4 py-3"
          />

          <input
            name="employeeCount"
            type="number"
            min="0"
            placeholder="Number of employees"
            className="w-full rounded-xl border px-4 py-3"
          />

          <input
            name="email"
            placeholder="Business email"
            className="w-full rounded-xl border px-4 py-3"
          />

          <input
            name="country"
            placeholder="Country"
            className="w-full rounded-xl border px-4 py-3"
          />

          <input
            name="city"
            placeholder="City"
            className="w-full rounded-xl border px-4 py-3"
          />

          <input
            name="website"
            type="url"
            placeholder="Website"
            className="w-full rounded-xl border px-4 py-3"
          />

          <input
            name="taxNumber"
            placeholder="Tax number"
            className="w-full rounded-xl border px-4 py-3"
          />
        </section>
      )}


      {step === 1 && (
        <section className="space-y-4">
          <h3 className="text-lg font-black">
            Owner Account
          </h3>

          <input
            name="ownerFirstName"
            required
            placeholder="First name"
            className="w-full rounded-xl border px-4 py-3"
          />

          <input
            name="ownerLastName"
            placeholder="Last name"
            className="w-full rounded-xl border px-4 py-3"
          />

          <input
            name="ownerEmail"
            type="email"
            required
            placeholder="Owner email"
            className="w-full rounded-xl border px-4 py-3"
          />

          <input
            name="ownerPassword"
            type="password"
            required
            placeholder="Password"
            className="w-full rounded-xl border px-4 py-3"
          />
        </section>
      )}


      {step === 2 && (
        <section className="space-y-4">
          <h3 className="text-lg font-black">
            Loyalty Setup
          </h3>

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
            defaultValue="زيارة"
            className="w-full rounded-xl border px-4 py-3"
          />

          <input
            name="rewardName"
            defaultValue="هدية مجانية"
            className="w-full rounded-xl border px-4 py-3"
          />

          <input
            name="rewardThreshold"
            type="number"
            defaultValue="5"
            className="w-full rounded-xl border px-4 py-3"
          />

          <input
            name="earnAmount"
            type="number"
            defaultValue="1"
            className="w-full rounded-xl border px-4 py-3"
          />
        </section>
      )}


      {step === 3 && (
        <section className="space-y-4">
          <h3 className="text-lg font-black">
            Branding
          </h3>

          <input
            name="primaryColor"
            type="color"
            defaultValue="#111827"
            className="h-12 w-full"
          />

          <input
            name="secondaryColor"
            type="color"
            defaultValue="#ffffff"
            className="h-12 w-full"
          />

        </section>
      )}


      {step === 4 && (
        <section className="rounded-2xl bg-slate-50 p-5">
          <h3 className="text-lg font-black">
            Ready to create
          </h3>

          <p className="text-sm text-slate-500">
            Review your information then create business.
          </p>
        </section>
      )}


      <div className="flex justify-between">

        {step > 0 && (
          <button
            type="button"
            onClick={()=>setStep(step-1)}
            className="rounded-xl border px-5 py-3"
          >
            Back
          </button>
        )}


        {step < 4 ? (
          <button
            type="button"
            onClick={()=>setStep(step+1)}
            className="ml-auto rounded-xl bg-slate-950 px-5 py-3 text-white"
          >
            Next
          </button>
        ) : (
          <button
            type="submit"
            className="ml-auto rounded-xl bg-violet-600 px-5 py-3 text-white"
          >
            Create Business
          </button>
        )}

      </div>

    </form>
  );
}
