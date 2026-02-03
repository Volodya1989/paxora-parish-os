"use client";

import { useState, useTransition } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { updateGratitudeSettings, updateMilestoneSettings } from "@/server/actions/gratitude";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/ui/cn";

type GratitudeSettingsPanelProps = {
  enabled: boolean;
  limit: number;
  bronzeHours: number;
  silverHours: number;
  goldHours: number;
};

export default function GratitudeSettingsPanel({
  enabled,
  limit,
  bronzeHours,
  silverHours,
  goldHours
}: GratitudeSettingsPanelProps) {
  const { addToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [spotlightEnabled, setSpotlightEnabled] = useState(enabled);
  const [spotlightLimit, setSpotlightLimit] = useState(limit.toString());
  const [bronze, setBronze] = useState(bronzeHours.toString());
  const [silver, setSilver] = useState(silverHours.toString());
  const [gold, setGold] = useState(goldHours.toString());
  const [isEditingSpotlight, setIsEditingSpotlight] = useState(false);
  const [isEditingMilestones, setIsEditingMilestones] = useState(false);

  const handleSpotlightSave = () => {
    const parsedLimit = Number(spotlightLimit);
    if (Number.isNaN(parsedLimit)) {
      addToast({ title: "Enter a valid spotlight limit.", status: "warning" });
      return;
    }
    startTransition(async () => {
      try {
        await updateGratitudeSettings({ enabled: spotlightEnabled, limit: parsedLimit });
        addToast({ title: "Spotlight settings saved", status: "success" });
        setIsEditingSpotlight(false);
      } catch (error) {
        addToast({
          title: "Unable to save settings",
          description: error instanceof Error ? error.message : "Please try again.",
          status: "error"
        });
      }
    });
  };

  const handleMilestonesSave = () => {
    const parsedBronze = Number(bronze);
    const parsedSilver = Number(silver);
    const parsedGold = Number(gold);
    if ([parsedBronze, parsedSilver, parsedGold].some((value) => Number.isNaN(value))) {
      addToast({ title: "Enter valid milestone values.", status: "warning" });
      return;
    }
    startTransition(async () => {
      try {
        await updateMilestoneSettings({
          bronzeHours: parsedBronze,
          silverHours: parsedSilver,
          goldHours: parsedGold
        });
        addToast({ title: "Milestones saved", status: "success" });
        setIsEditingMilestones(false);
      } catch (error) {
        addToast({
          title: "Unable to save milestones",
          description: error instanceof Error ? error.message : "Please try again.",
          status: "error"
        });
      }
    });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink-900">Spotlight settings</p>
            <p className="text-xs text-ink-500">Control weekly gratitude highlights.</p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setIsEditingSpotlight(true)}
            disabled={isEditingSpotlight}
          >
            Edit settings
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-mist-200 bg-mist-50/60 px-3 py-2 text-xs text-ink-600">
          <div>
            <p className="text-xs font-semibold text-ink-700">Spotlight enabled</p>
            <p className="text-[11px] text-ink-500">Hide highlights when off.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={spotlightEnabled}
            aria-label="Toggle spotlight"
            onClick={() => setSpotlightEnabled((current) => !current)}
            disabled={!isEditingSpotlight}
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full border transition focus-ring disabled:cursor-not-allowed disabled:opacity-60",
              spotlightEnabled ? "border-primary-500 bg-primary-500" : "border-mist-200 bg-mist-200"
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition",
                spotlightEnabled ? "translate-x-5" : "translate-x-1"
              )}
            />
          </button>
        </div>
        <label className="space-y-1 text-xs font-medium text-ink-700">
          Weekly spotlight limit
          <Input
            type="number"
            min="1"
            max="20"
            value={spotlightLimit}
            onChange={(event) => setSpotlightLimit(event.target.value)}
            disabled={!isEditingSpotlight}
          />
        </label>
        {isEditingSpotlight ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={handleSpotlightSave} isLoading={isPending}>
              Save spotlight settings
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setSpotlightEnabled(enabled);
                setSpotlightLimit(limit.toString());
                setIsEditingSpotlight(false);
              }}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <p className="text-xs text-ink-400">Settings are saved and read-only.</p>
        )}
      </Card>

      <Card className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink-900">Milestone benchmarks</p>
            <p className="text-xs text-ink-500">Share personal milestones for yearly hours.</p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setIsEditingMilestones(true)}
            disabled={isEditingMilestones}
          >
            Edit milestones
          </Button>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="space-y-1 text-xs font-medium text-ink-700">
            Bronze
            <Input
              type="number"
              min="0"
              value={bronze}
              onChange={(event) => setBronze(event.target.value)}
              disabled={!isEditingMilestones}
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-ink-700">
            Silver
            <Input
              type="number"
              min="0"
              value={silver}
              onChange={(event) => setSilver(event.target.value)}
              disabled={!isEditingMilestones}
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-ink-700">
            Gold
            <Input
              type="number"
              min="0"
              value={gold}
              onChange={(event) => setGold(event.target.value)}
              disabled={!isEditingMilestones}
            />
          </label>
        </div>
        {isEditingMilestones ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={handleMilestonesSave} isLoading={isPending}>
              Save milestones
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setBronze(bronzeHours.toString());
                setSilver(silverHours.toString());
                setGold(goldHours.toString());
                setIsEditingMilestones(false);
              }}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <p className="text-xs text-ink-400">Milestones are saved and read-only.</p>
        )}
      </Card>
    </div>
  );
}
