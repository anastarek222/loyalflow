"use client";

import { useEffect } from "react";

const WHATSAPP_TEMPLATE_ACTION_SELECTOR =
  'button[name="intent"][value="submit-template"], button[name="intent"][value="refresh-template"]';

function loadingLabel(intent: string, language: string) {
  const arabic = language.toLowerCase().startsWith("ar");
  if (intent === "refresh-template") {
    return arabic ? "جارٍ التحديث…" : "Refreshing…";
  }
  return arabic ? "جارٍ الإرسال…" : "Submitting…";
}

function restoreFormFeedback(
  form: HTMLFormElement,
  submitter: HTMLButtonElement,
  originalLabel: string,
) {
  if (!document.contains(form)) return;

  delete form.dataset.whatsappTemplatePending;
  form.removeAttribute("aria-busy");
  form
    .querySelectorAll<HTMLButtonElement>(WHATSAPP_TEMPLATE_ACTION_SELECTOR)
    .forEach((button) => {
      button.removeAttribute("aria-disabled");
      button.classList.remove("whatsapp-template-action--pending");
    });
  submitter.textContent = originalLabel;
}

export function WhatsAppTemplateActionFeedback() {
  useEffect(() => {
    const handleSubmit = (event: Event) => {
      const submitEvent = event as SubmitEvent;
      const submitter = submitEvent.submitter;
      if (
        !(submitter instanceof HTMLButtonElement) ||
        !submitter.matches(WHATSAPP_TEMPLATE_ACTION_SELECTOR)
      ) {
        return;
      }

      const form = submitter.form;
      if (!form) return;

      if (form.dataset.whatsappTemplatePending === "true") {
        event.preventDefault();
        return;
      }

      form.dataset.whatsappTemplatePending = "true";
      form.setAttribute("aria-busy", "true");

      const originalLabel = submitter.textContent?.trim() || "";
      const intent = submitter.value;
      const language = document.documentElement.lang || "en";

      form
        .querySelectorAll<HTMLButtonElement>(WHATSAPP_TEMPLATE_ACTION_SELECTOR)
        .forEach((button) => {
          button.setAttribute("aria-disabled", "true");
          button.classList.add("whatsapp-template-action--pending");
        });

      const spinner = document.createElement("span");
      spinner.className = "whatsapp-template-action__spinner";
      spinner.setAttribute("aria-hidden", "true");

      const label = document.createElement("span");
      label.textContent = loadingLabel(intent, language);

      submitter.replaceChildren(spinner, label);
      submitter.setAttribute("aria-live", "polite");

      window.setTimeout(() => {
        restoreFormFeedback(form, submitter, originalLabel);
      }, 30_000);
    };

    document.addEventListener("submit", handleSubmit, true);
    return () => document.removeEventListener("submit", handleSubmit, true);
  }, []);

  return (
    <style jsx global>{`
      button[name="intent"][value="submit-template"],
      button[name="intent"][value="refresh-template"] {
        transition:
          transform 160ms ease,
          box-shadow 160ms ease,
          filter 160ms ease,
          opacity 160ms ease,
          background-color 160ms ease,
          border-color 160ms ease;
        will-change: transform;
      }

      button[name="intent"][value="submit-template"]:hover:not(
          [aria-disabled="true"]
        ),
      button[name="intent"][value="refresh-template"]:hover:not(
          [aria-disabled="true"]
        ) {
        transform: translateY(-1px);
        box-shadow: 0 8px 18px rgb(0 0 0 / 12%);
        filter: brightness(1.04);
      }

      button[name="intent"][value="submit-template"]:active:not(
          [aria-disabled="true"]
        ),
      button[name="intent"][value="refresh-template"]:active:not(
          [aria-disabled="true"]
        ) {
        transform: translateY(0) scale(0.97);
        box-shadow: 0 3px 8px rgb(0 0 0 / 10%);
      }

      button[name="intent"][value="submit-template"]:focus-visible,
      button[name="intent"][value="refresh-template"]:focus-visible {
        outline: 2px solid currentColor;
        outline-offset: 3px;
      }

      button.whatsapp-template-action--pending {
        cursor: progress;
        pointer-events: none;
        opacity: 0.66;
      }

      button.whatsapp-template-action--pending[aria-live="polite"] {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        opacity: 0.86;
      }

      .whatsapp-template-action__spinner {
        width: 0.9rem;
        height: 0.9rem;
        flex: 0 0 auto;
        border: 2px solid currentColor;
        border-inline-end-color: transparent;
        border-radius: 999px;
        animation: whatsapp-template-action-spin 700ms linear infinite;
      }

      @keyframes whatsapp-template-action-spin {
        to {
          transform: rotate(360deg);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        button[name="intent"][value="submit-template"],
        button[name="intent"][value="refresh-template"] {
          transition: none;
        }

        .whatsapp-template-action__spinner {
          animation: none;
        }
      }
    `}</style>
  );
}
