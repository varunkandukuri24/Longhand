"use client";

import { saveDisplayName } from "@/app/actions/display-name";
import { useState } from "react";

type DisplayNameFormProps = {
  initialName: string;
};

export function DisplayNameForm({ initialName }: DisplayNameFormProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);

  if (!editing) {
    return (
      <p className="mt-2 font-ui text-[13px] text-ink/70">
        {initialName}
        <button
          type="button"
          className="ml-3 underline-offset-2 hover:underline"
          onClick={() => {
            setName(initialName);
            setEditing(true);
          }}
        >
          Change name
        </button>
      </p>
    );
  }

  return (
    <form
      action={async (formData) => {
        await saveDisplayName(formData);
        setEditing(false);
      }}
      className="mt-2 flex flex-wrap items-center gap-2"
    >
      <input type="hidden" name="next" value="/" />
      <input
        type="text"
        name="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        maxLength={80}
        className="field-underline min-w-0 flex-1 py-1 font-ui text-[13px] text-ink"
        aria-label="Display name"
      />
      <button
        type="submit"
        className="editor-bar-btn min-h-0"
      >
        Save
      </button>
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
