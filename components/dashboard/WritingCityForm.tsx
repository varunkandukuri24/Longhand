"use client";

import { saveWritingCity } from "@/app/actions/writing-city";
import { useState } from "react";

type WritingCityFormProps = {
  initialCity: string | null;
};

export function WritingCityForm({ initialCity }: WritingCityFormProps) {
  const [editing, setEditing] = useState(false);
  const [city, setCity] = useState(initialCity ?? "");

  if (!editing) {
    return (
      <p className="mt-2 font-ui text-[13px] text-ink/70">
        {initialCity ? (
          <>Writing from {initialCity}</>
        ) : (
          <>No city set</>
        )}
        <button
          type="button"
          className="ml-3 underline-offset-2 hover:underline"
          onClick={() => {
            setCity(initialCity ?? "");
            setEditing(true);
          }}
        >
          {initialCity ? "Change city" : "Add city"}
        </button>
      </p>
    );
  }

  return (
    <form
      action={async (formData) => {
        await saveWritingCity(formData);
        setEditing(false);
      }}
      className="mt-2 flex flex-wrap items-center gap-2"
    >
      <input type="hidden" name="next" value="/dashboard" />
      <input
        type="text"
        name="city"
        value={city}
        onChange={(e) => setCity(e.target.value)}
        maxLength={80}
        placeholder="What city are you writing from?"
        className="min-w-0 flex-1 border-b border-ink/20 bg-transparent py-1 font-ui text-[13px] text-ink outline-none placeholder:text-ink/35"
        aria-label="Writing city"
      />
      <button
        type="submit"
        className="editor-bar-btn min-h-0"
      >
        Save
      </button>
      {initialCity || city ? (
        <button
          type="button"
          className="font-ui text-[12px] text-ink/50 underline-offset-2 hover:underline"
          onClick={() => {
            const fd = new FormData();
            fd.set("next", "/dashboard");
            fd.set("city", "");
            void saveWritingCity(fd);
          }}
        >
          Clear
        </button>
      ) : null}
      <button
        type="button"
        className="font-ui text-[12px] text-ink/50 underline-offset-2 hover:underline"
        onClick={() => setEditing(false)}
      >
        Cancel
      </button>
    </form>
  );
}
