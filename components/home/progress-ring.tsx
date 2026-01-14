import React from "react";

type ProgressRingProps = {
  percent: number;
};

export default function ProgressRing({ percent }: ProgressRingProps) {
  const clampedPercent = Math.max(0, Math.min(100, Math.round(percent)));
  const radius = 22;
  const stroke = 4;
  const normalizedRadius = radius - stroke;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (clampedPercent / 100) * circumference;

  return (
    <div className="relative flex h-14 w-14 items-center justify-center" aria-label="Week completion">
      <svg height={radius * 2} width={radius * 2} className="-rotate-90">
        <circle
          stroke="#e7e5e4"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke="#10b981"
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset }}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <span className="absolute text-xs font-semibold text-ink-700">
        {clampedPercent}%
      </span>
    </div>
  );
}
