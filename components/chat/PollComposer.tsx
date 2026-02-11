"use client";

import { useCallback, useState, useTransition } from "react";
import { useTranslations } from "@/lib/i18n/provider";

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 10;

export default function PollComposer({
  onSubmit,
  onCancel
}: {
  onSubmit: (question: string, options: string[]) => Promise<void> | void;
  onCancel: () => void;
}) {
  const t = useTranslations();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [isPending, startTransition] = useTransition();

  const validOptions = options.map((o) => o.trim()).filter(Boolean);
  const canSubmit = !isPending && question.trim().length > 0 && validOptions.length >= MIN_OPTIONS;

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    startTransition(async () => {
      await onSubmit(question.trim(), validOptions);
    });
  }, [canSubmit, question, validOptions, onSubmit]);

  return (
    <div className="space-y-3 rounded-xl border border-mist-200 bg-mist-50 p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink-900">{t("chat.poll.title")}</h3>
        <button type="button" className="text-xs font-semibold text-ink-500 hover:text-ink-700" onClick={onCancel}>
          {t("common.cancel")}
        </button>
      </div>

      <input value={question} onChange={(e)=>setQuestion(e.target.value)} placeholder={t("chat.poll.questionPlaceholder")} maxLength={300}
        className="w-full rounded-lg border border-mist-200 bg-white px-3 py-2 text-sm text-ink-700 placeholder:text-ink-400 focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-300" autoFocus />

      <div className="space-y-2">
        {options.map((option, index) => (
          <div key={index} className="flex items-center gap-2">
            <input value={option} onChange={(e)=>setOptions((prev)=>prev.map((o,i)=>i===index?e.target.value:o))}
              placeholder={t("chat.poll.option").replace("{index}", String(index + 1))}
              maxLength={100}
              className="flex-1 rounded-lg border border-mist-200 bg-white px-3 py-1.5 text-sm text-ink-700 placeholder:text-ink-400 focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-300" />
            {options.length > MIN_OPTIONS ? <button type="button" onClick={()=>setOptions((prev)=>prev.filter((_,i)=>i!==index))} className="text-xs">×</button> : null}
          </div>
        ))}
      </div>

      {options.length < MAX_OPTIONS ? <button type="button" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700" onClick={()=>setOptions((prev)=>[...prev, ""])}>{t("chat.poll.addOption")}</button> : null}

      <button type="button" disabled={!canSubmit} className={canSubmit ? "w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white" : "w-full rounded-lg bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-400 cursor-not-allowed"} onClick={handleSubmit}>
        {isPending ? t("chat.poll.creating") : t("chat.poll.create")}
      </button>
    </div>
  );
}
