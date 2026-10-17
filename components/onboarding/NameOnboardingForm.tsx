"use client";

import { saveDisplayName } from "@/app/actions/display-name";
import { suggestHandle, validateHandle } from "@/lib/handles";
import { rootDomain } from "@/lib/hosts";
import { useEffect, useState } from "react";

type NameOnboardingFormProps = {
  next: string;
};

export function NameOnboardingForm({ next }: NameOnboardingFormProps) {
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("writer");
  const [handleTouched, setHandleTouched] = useState(false);
  const [handleHint, setHandleHint] = useState("");
  const domain = (() => {
    try {
      return rootDomain();
    } catch {
      return "localhost:3000";
    }
  })();

  useEffect(() => {
    if (!handleTouched) {
      setHandle(suggestHandle(name));
    }
  }, [name, handleTouched]);

  useEffect(() => {
    const checked = validateHandle(handle);
    if (!checked.ok) {
      if (checked.error === "length") {
        setHandleHint("Use 3 to 30 characters.");
      } else if (checked.error === "reserved") {
        setHandleHint("That address is reserved.");
      } else {
        setHandleHint("Lowercase letters, numbers and hyphens only.");
      }
      return;
    }
    const timer = window.setTimeout(() => {
      void (async () => {
        const res = await fetch(
          `/api/handles/check?h=${encodeURIComponent(checked.handle)}`,
        );
        const body = (await res.json().catch(() => null)) as {
          available?: boolean;
          reason?: string | null;
        } | null;
        if (!res.ok) {
          setHandleHint("");
          return;
        }
        if (body?.available) {
          setHandleHint("Available");
        } else if (body?.reason === "taken") {
          setHandleHint("Taken");
        } else {
          setHandleHint("");
        }
      })();
    }, 400);
    return () => window.clearTimeout(timer);
  }, [handle]);

  return (
    <form action={saveDisplayName} className="flex flex-col gap-6">
      <input type="hidden" name="next" value={next} />
      <label className="font-ui text-[13px] text-label">
        What name should appear on your writing?
        <input
          type="text"
          name="name"
          required
          maxLength={80}
          autoComplete="nickname"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-3 w-full border-b border-ink/20 bg-transparent py-2 font-ui text-[13px] text-ink outline-none"
        />
      </label>
      <label className="font-ui text-[13px] text-label">
        Your page address
        <div className="mt-3 flex items-baseline gap-0 border-b border-ink/20 font-ui text-[13px]">
          <input
            type="text"
            name="handle"
            required
            spellCheck={false}
            autoComplete="off"
            value={handle}
            onChange={(e) => {
              setHandleTouched(true);
              setHandle(e.target.value.toLowerCase());
            }}
            className="min-w-0 flex-1 bg-transparent py-2 text-ink outline-none"
          />
          <span className="shrink-0 text-label">.{domain}</span>
        </div>
        <span className="mt-2 block font-ui text-[12px] text-label">
          Lowercase letters, numbers and hyphens.
          {handleHint ? ` ${handleHint}` : ""}
        </span>
      </label>
      <label className="font-ui text-[13px] text-label">
        What city are you writing from?
        <input
          type="text"
          name="city"
          maxLength={80}
          autoComplete="address-level2"
          placeholder="Optional"
          className="mt-3 w-full border-b border-ink/20 bg-transparent py-2 font-ui text-[13px] text-ink outline-none placeholder:text-label/50"
        />
      </label>
      <button type="submit" className="editor-bar-btn mt-2 w-fit">
        Continue
      </button>
    </form>
  );
}
