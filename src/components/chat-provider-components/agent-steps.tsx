"use client";

import React, { useState } from "react";
import type { AgentStep } from "@/types/types";
import { IoChevronDown, IoChevronUp } from "react-icons/io5";
import { RiRobot2Line } from "react-icons/ri";

const statusLabel: Record<AgentStep["status"], string> = {
  running: "Running…",
  done: "Done",
  error: "Error",
};

const AgentSteps = ({ steps }: { steps?: AgentStep[] }) => {
  const [open, setOpen] = useState(true);

  if (!steps || steps.length === 0) return null;

  const visibleSteps = steps.filter((s) => s.status !== "running");

  return (
    <div className="w-full md:w-[90%] mt-4 mx-auto overflow-hidden rounded-2xl border border-violet-500/25 bg-violet-500/5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 p-4 text-left"
      >
        <span className="flex items-center gap-2 font-medium text-violet-600 dark:text-violet-300">
          <RiRobot2Line className="text-xl" />
          Agent steps ({visibleSteps.length || steps.length})
        </span>
        {open ? <IoChevronUp /> : <IoChevronDown />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2">
          {steps.map((step, index) => (
            <div
              key={`${step.tool}-${index}`}
              className="rounded-xl bg-white/60 dark:bg-black/20 p-3 text-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{step.label}</p>
                <span className="text-xs opacity-70">
                  {statusLabel[step.status]}
                  {step.latencyMs != null ? ` · ${step.latencyMs}ms` : ""}
                </span>
              </div>
              {step.preview && (
                <p className="mt-1 opacity-80 whitespace-pre-wrap">{step.preview}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AgentSteps;
