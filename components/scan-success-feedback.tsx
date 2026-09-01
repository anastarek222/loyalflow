"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Volume2, VolumeX } from "lucide-react";

import { Button } from "@/components/ui/button";

const FEEDBACK_PREFERENCE_KEY = "loyalflow:scan-success-feedback:v1";
const FEEDBACK_PREFERENCE_EVENT = "loyalflow:scan-success-feedback-change";

type FeedbackPreference = {
  enabled: boolean;
};

type ScanSuccessFeedbackProps = {
  enableLabel: string;
  disableLabel: string;
  enabledAnnouncement: string;
  disabledAnnouncement: string;
};

function loadFeedbackPreference() {
  try {
    const stored = window.localStorage.getItem(FEEDBACK_PREFERENCE_KEY);
    if (!stored) return false;

    const parsed = JSON.parse(stored) as Partial<FeedbackPreference>;
    return parsed.enabled === true;
  } catch {
    return false;
  }
}

function saveFeedbackPreference(preference: FeedbackPreference) {
  try {
    window.localStorage.setItem(
      FEEDBACK_PREFERENCE_KEY,
      JSON.stringify({ enabled: preference.enabled }),
    );
    window.dispatchEvent(new Event(FEEDBACK_PREFERENCE_EVENT));
  } catch {
    // Feedback is an optional enhancement and must never block Scan operations.
  }
}

function subscribeToFeedbackPreference(onStoreChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === FEEDBACK_PREFERENCE_KEY) onStoreChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(FEEDBACK_PREFERENCE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(FEEDBACK_PREFERENCE_EVENT, onStoreChange);
  };
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function playHapticFeedback() {
  if (prefersReducedMotion() || !("vibrate" in navigator)) return;
  navigator.vibrate(45);
}

function playSuccessChime() {
  const AudioContextConstructor =
    window.AudioContext ??
    (
      window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }
    ).webkitAudioContext;
  if (!AudioContextConstructor) return;

  try {
    const context = new AudioContextConstructor();
    const startAt = context.currentTime;

    [523.25, 659.25].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const noteStart = startAt + index * 0.09;

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, noteStart);
      gain.gain.setValueAtTime(0.0001, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.12, noteStart + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.16);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(noteStart);
      oscillator.stop(noteStart + 0.17);
    });

    window.setTimeout(() => void context.close(), 450);
  } catch {
    // Browsers may still block audio despite consent; visual feedback remains.
  }
}

function playFeedback() {
  playHapticFeedback();
  playSuccessChime();
}

export default function ScanSuccessFeedback({
  enableLabel,
  disableLabel,
  enabledAnnouncement,
  disabledAnnouncement,
}: ScanSuccessFeedbackProps) {
  const enabled = useSyncExternalStore(
    subscribeToFeedbackPreference,
    loadFeedbackPreference,
    () => false,
  );
  const [announcement, setAnnouncement] = useState("");
  const playedFromGestureRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    if (playedFromGestureRef.current) {
      playedFromGestureRef.current = false;
      return;
    }
    playFeedback();
  }, [enabled]);

  const toggleFeedback = () => {
    const nextEnabled = !enabled;
    playedFromGestureRef.current = nextEnabled;
    saveFeedbackPreference({ enabled: nextEnabled });
    setAnnouncement(nextEnabled ? enabledAnnouncement : disabledAnnouncement);

    if (nextEnabled) playFeedback();
    else if ("vibrate" in navigator) navigator.vibrate(0);
  };

  return (
    <div className="mt-5 border-t border-success/15 pt-4">
      <Button
        type="button"
        variant="ghost"
        size="lg"
        aria-pressed={enabled}
        onClick={toggleFeedback}
        className="min-h-11 gap-2 px-3 text-success hover:bg-success-subtle hover:text-success"
      >
        {enabled ? (
          <Volume2 className="size-4" aria-hidden="true" />
        ) : (
          <VolumeX className="size-4" aria-hidden="true" />
        )}
        {enabled ? disableLabel : enableLabel}
      </Button>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}
