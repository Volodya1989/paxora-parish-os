"use client";

import { useCallback, useState, useTransition } from "react";

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 10;

export default function PollComposer({
  onSubmit,
  onCancel
}: {
  onSubmit: (question: string, options: string[]) => Promise<void> | void;
  onCancel: () => void;
}) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [isPending, startTransition] = useTransition();

  const validOptions = options.map((o) => o.trim()).filter(Boolean);
  const canSubmit =
    !isPending && question.trim().length > 0 && validOptions.length >= MIN_OPTIONS;

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    startTransition(async () => {
      await onSubmit(question.trim(), validOptions);
    });
  }, [canSubmit, question, validOptions, onSubmit]);

  const addOption = () => {
    if (options.length < MAX_OPTIONS) {
      setOptions((prev) => [...prev, ""]);
    }
  };

  const removeOption = (index: number) => {
    if (options.length <= MIN_OPTIONS) return;
    setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, value: string) => {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  };

  return (
    <div className="space-y-3 rounded-xl border border-mist-200 bg-mist-50 p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink-900">Create a poll</h3>
        <button
          type="button"
          className="text-xs font-semibold text-ink-500 hover:text-ink-700"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>

      <input
        type="text"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Ask a question..."
        maxLength={300}
        className="w-full rounded-lg border border-mist-200 bg-white px-3 py-2 text-sm text-ink-700 placeholder:text-ink-400 focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-300"
        autoFocus
      />

      <div className="space-y-2">
        {options.map((option, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              type="text"
              value={option}
              onChange={(e) => updateOption(index, e.target.value)}
              placeholder={`Option ${index + 1}`}
              maxLength={100}
              className="flex-1 rounded-lg border border-mist-200 bg-white px-3 py-1.5 text-sm text-ink-700 placeholder:text-ink-400 focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-300"
            />
            {options.length > MIN_OPTIONS ? (
              <button
                type="button"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-400 hover:bg-mist-100 hover:text-ink-600"
                onClick={() => removeOption(index)}
                aria-label={`Remove option ${index + 1}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            ) : null}
          </div>
        ))}
      </div>

      {options.length < MAX_OPTIONS ? (
        <button
          type="button"
          className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
          onClick={addOption}
        >
          + Add option
        </button>
      ) : null}

      <button
        type="button"
        disabled={!canSubmit}
        className={
          canSubmit
            ? "w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 active:bg-emerald-700"
            : "w-full rounded-lg bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-400 cursor-not-allowed"
        }
        onClick={handleSubmit}
      >
        {isPending ? "Creating..." : "Create poll"}
      </button>
    </div>
  );
}
