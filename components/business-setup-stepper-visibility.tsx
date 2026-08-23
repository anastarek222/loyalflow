"use client";

import { useEffect } from "react";

export function BusinessSetupStepperVisibility() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(
      '[data-business-setup-route="true"]',
    );
    if (!root) return;

    let frame: number | null = null;

    const revealActiveStep = () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        frame = null;
        const stepper = root.querySelector<HTMLElement>(
          'form[data-business-setup-language] > div:first-child > div:first-child',
        );
        if (!stepper) return;

        const stepButtons = Array.from(
          stepper.querySelectorAll<HTMLButtonElement>('button[type="button"]'),
        );
        const activeStep = [...stepButtons]
          .reverse()
          .find((button) => !button.disabled);

        activeStep?.scrollIntoView({
          block: "nearest",
          inline: "nearest",
        });
      });
    };

    revealActiveStep();

    const observer = new MutationObserver((mutations) => {
      if (
        mutations.some(
          (mutation) =>
            mutation.type === "attributes" &&
            mutation.attributeName === "disabled",
        )
      ) {
        revealActiveStep();
      }
    });

    observer.observe(root, {
      subtree: true,
      attributes: true,
      attributeFilter: ["disabled"],
    });

    return () => {
      observer.disconnect();
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
