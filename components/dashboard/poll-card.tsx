"use client";

import * as React from "react";
import { useMutation } from "convex/react";

import { TitledCard } from "@/components/ui/titled-card";
import { api } from "@/convex/_generated/api";

const INPUT_CLASS =
  "w-full border border-border bg-input px-2.5 py-2 font-sans text-sm text-foreground outline-none";

export function PollCard() {
  const create = useMutation(api.polls.create);
  const [question, setQuestion] = React.useState("");
  const [options, setOptions] = React.useState(["", ""]);
  const [minutes, setMinutes] = React.useState("5");
  const [status, setStatus] = React.useState("");
  const [sending, setSending] = React.useState(false);

  const setOption = (i: number, value: string) =>
    setOptions((prev) => prev.map((o, j) => (j === i ? value : o)));

  const ready =
    question.trim().length > 0 &&
    options.every((o) => o.trim().length > 0) &&
    Number.isFinite(Number(minutes)) &&
    Number(minutes) > 0;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ready) return;
    setSending(true);
    setStatus("");
    try {
      await create({
        question,
        options,
        durationMinutes: Number(minutes),
      });
      setQuestion("");
      setOptions(["", ""]);
      setStatus("Poll is live — pinned to the top of chat.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not create poll");
    } finally {
      setSending(false);
    }
  };

  return (
    <TitledCard title="Chat Poll">
      <form onSubmit={submit}>
        <label className="mb-[5px] block text-[11px] font-bold tracking-[.06em] uppercase">
          Question
        </label>
        <input
          aria-label="Poll question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="What should we do next?"
          className={INPUT_CLASS}
        />

        <label className="mt-3 mb-[5px] block text-[11px] font-bold tracking-[.06em] uppercase">
          Options
        </label>
        <div className="flex flex-col gap-1.5">
          {options.map((option, i) => (
            <div key={i} className="flex gap-1.5">
              <input
                aria-label={`Option ${i + 1}`}
                value={option}
                onChange={(event) => setOption(i, event.target.value)}
                placeholder={`Option ${i + 1}`}
                className={INPUT_CLASS}
              />
              {options.length > 2 && (
                <button
                  type="button"
                  aria-label={`Remove option ${i + 1}`}
                  onClick={() => setOptions((prev) => prev.filter((_, j) => j !== i))}
                  className="cursor-pointer border border-border px-2.5 font-mono text-[12px] text-muted-foreground hover:border-primary hover:text-primary"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setOptions((prev) => [...prev, ""])}
          className="mt-1.5 cursor-pointer border border-border px-2.5 py-1 font-mono text-[12px] text-muted-foreground hover:border-primary hover:text-primary"
        >
          + Add option
        </button>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <label className="mb-[5px] block text-[11px] font-bold tracking-[.06em] uppercase">
              Duration (minutes)
            </label>
            <input
              aria-label="Poll duration in minutes"
              type="number"
              min={1}
              value={minutes}
              onChange={(event) => setMinutes(event.target.value)}
              className={`${INPUT_CLASS} w-24`}
            />
          </div>
          <button
            type="submit"
            disabled={sending || !ready}
            className="border-2 border-border bg-primary px-[18px] py-[9px] font-display text-[12px] text-primary-foreground uppercase shadow-brutal-sm transition-transform hover:-translate-x-px hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? "Starting..." : "Start poll"}
          </button>
        </div>
        {status && (
          <div aria-live="polite" className="mt-2 font-mono text-[12px] text-muted-foreground">
            {status}
          </div>
        )}
      </form>
    </TitledCard>
  );
}
