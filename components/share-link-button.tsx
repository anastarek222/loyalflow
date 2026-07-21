"use client";

type ShareLinkButtonProps = {
  value: string;
  title: string;
  text: string;
  label: string;
  className?: string;
};

export default function ShareLinkButton({
  value,
  title,
  text,
  label,
  className,
}: ShareLinkButtonProps) {
  async function shareLink() {
    try {
      if (navigator.share) {
        await navigator.share({
          title,
          text,
          url: value,
        });

        return;
      }

      if (
        navigator.clipboard &&
        window.isSecureContext
      ) {
        await navigator.clipboard.writeText(
          value
        );

        return;
      }

      const textarea =
        document.createElement(
          "textarea"
        );

      textarea.value = value;
      textarea.style.position =
        "fixed";
      textarea.style.opacity = "0";

      document.body.appendChild(
        textarea
      );

      textarea.focus();
      textarea.select();

      document.execCommand(
        "copy"
      );

      textarea.remove();
    } catch {
      // Sharing can be cancelled or unavailable.
    }
  }

  return (
    <button
      type="button"
      onClick={shareLink}
      aria-label={label}
      className={
        className ??
        "rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-800 transition hover:bg-slate-50"
      }
    >
      {label}
    </button>
  );
}
