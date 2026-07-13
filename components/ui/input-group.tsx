"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// Fused input + button joined by a 1px seam (the line-colored container shows
// through a 1px gap). Flat inputs: 1px border, tinted bg, no shadow.
export function InputGroup({
  placeholder,
  buttonLabel,
  type = "text",
  onSubmit,
  className,
  value: controlledValue,
  onChange,
}: {
  placeholder?: string;
  buttonLabel: string;
  type?: string;
  onSubmit?: (value: string) => void;
  className?: string;
  // Optional controlled mode: when `value`/`onChange` are supplied the caller
  // owns the text (e.g. so an emoji picker can insert tokens).
  value?: string;
  onChange?: (value: string) => void;
}) {
  const [internal, setInternal] = React.useState("");
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internal;
  const setValue = (next: string) => {
    if (isControlled) {
      onChange?.(next);
    } else {
      setInternal(next);
    }
  };
  const submit = () => {
    onSubmit?.(value);
    setValue("");
  };
  return (
    <div className={cn("flex gap-px border border-border bg-border", className)}>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        className="min-w-0 flex-1 border-none bg-input px-3 py-2.5 font-sans text-sm text-foreground outline-none"
      />
      <button
        type="button"
        onClick={submit}
        className="flex items-center bg-primary px-4 py-2.5 font-sans text-[13px] font-bold text-primary-foreground uppercase"
      >
        {buttonLabel}
      </button>
    </div>
  );
}
