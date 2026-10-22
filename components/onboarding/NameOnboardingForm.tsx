"use client";

import { saveDisplayName } from "@/app/actions/display-name";
import { suggestHandle, validateHandle } from "@/lib/handles";
import { useEffect, useState } from "react";

type NameOnboardingFormProps = {
  next: string;
  domain: string;
  /** Pre-filled from Google when available. */
  initialName?: string;
};

export function NameOnboardingForm({
  next,
  domain,
  initialName = "",
}: NameOnboardingFormProps) {
  const [name, setName] = useState(initialName);
  const [handleDraft, setHandleDraft] = useState("");
  const [handleTouched, setHandleTouched] = useState(false);
  const [availability, setAvailability] = useState<string>("");

  const handle = handleTouched ? handleDraft : suggestHandle(name);
  const checked = validateHandle(handle);
  const handleKey = checked.ok ? checked.handle : "";
  const formatHint = !checked.ok
    ? checked.error === "length"
      ? "Use 3 to 30 characters."
      : checked.error === "reserved"
        ? "That address is reserved."
        : "Lowercase letters, numbers and hyphens only."
    : "";

  useEffect(() => {
    if (!handleKey) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        const res = await fetch(
          `/api/handles/check?h=${encodeURIComponent(handleKey)}`,
        );
        const body = (await res.json().catch(() => null)) as {
          available?: boolean;
          reason?: string | null;
        } | null;
        if (cancelled || !res.ok) return;
        if (body?.available) {
          setAvailability("Available");
        } else if (body?.reason === "taken") {
          setAvailability("Taken");
        } else {
          setAvailability("");
        }
      })();
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [handleKey]);

  const handleHint = formatHint || (handleKey ? availability : "");

  return (
    <form action={saveDisplayName} className="flex flex-col gap-6">
      <input type="hidden" name="next" value={next} />
      <h1
        className="font-writing text-[28px] leading-tight text-ink"
        data-paper-heading
      >
        What should we call you?
      </h1>
      <label className="font-ui text-[13px] text-label">
        Name
        <input
          type="text"
          name="name"
          required
          maxLength={80}
          autoComplete="nickname"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="field-underline mt-3 w-full py-2 font-ui text-[13px] text-ink"
        />
      </label>
      <label className="font-ui text-[13px] text-label">
        Your page
        <div className="field-underline-wrap mt-3 flex items-baseline gap-0 font-ui text-[13px]">
          <input
            type="text"
            name="handle"
            required
            spellCheck={false}
            autoComplete="off"
            value={handle}
            onChange={(e) => {
              setHandleTouched(true);
              setHandleDraft(e.target.value.toLowerCase());
            }}
            className="min-w-0 flex-1 bg-transparent py-2 text-ink"
          />
          <span className="shrink-0 text-label">.{domain}</span>
        </div>
        <span className="mt-2 block font-ui text-[12px] text-label">
          Lowercase letters, numbers and hyphens.
          {handleHint ? ` ${handleHint}` : ""}
        </span>
      </label>
      <button
        type="submit"
        className="mt-2 h-11 w-fit rounded px-[22px] bg-ink font-ui text-[13px] text-white"
      >
        Start writing
      </button>
    </form>
  );
}
