"use client";

import React from "react";
import { Gavel, Play, Pause, Hourglass, PowerOff, CheckCheck, Landmark } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ProjectStatusCardsProps {
  biddingsCount: number;
  testingsCount: number;
  runningsCount: number;
  holdsCount: number;
  awaitingsCount: number;
  closedCount: number;
  completedCount: number;
  onCardClick: (status: number) => void;
}

export default function ProjectStatusCards({
  biddingsCount,
  testingsCount,
  runningsCount,
  holdsCount,
  awaitingsCount,
  closedCount,
  completedCount,
  onCardClick
}: ProjectStatusCardsProps) {
  const statusCards = [
    {
      status: 1,
      title: "Bidding",
      count: biddingsCount,
      icon: Gavel,
      colorClass: "text-indigo-600 dark:text-indigo-400",
      borderColor: "border-indigo-100 dark:border-indigo-950/50",
      bgColor: "bg-indigo-50/20 hover:bg-indigo-50/40 dark:bg-indigo-950/10 dark:hover:bg-indigo-950/20"
    },
    {
      status: 2,
      title: "Testing",
      count: testingsCount,
      icon: Hourglass,
      colorClass: "text-amber-600 dark:text-amber-400",
      borderColor: "border-amber-100 dark:border-amber-950/50",
      bgColor: "bg-amber-50/20 hover:bg-amber-50/40 dark:bg-amber-950/10 dark:hover:bg-amber-950/20"
    },
    {
      status: 3,
      title: "Running",
      count: runningsCount,
      icon: Play,
      colorClass: "text-cyan-600 dark:text-cyan-400",
      borderColor: "border-cyan-100 dark:border-cyan-950/50",
      bgColor: "bg-cyan-50/20 hover:bg-cyan-50/40 dark:bg-cyan-950/10 dark:hover:bg-cyan-950/20"
    },
    {
      status: 4,
      title: "On Holds",
      count: holdsCount,
      icon: Pause,
      colorClass: "text-slate-800 dark:text-slate-300",
      borderColor: "border-slate-200 dark:border-slate-800",
      bgColor: "bg-slate-50/20 hover:bg-slate-50/40 dark:bg-slate-900/10 dark:hover:bg-slate-900/20"
    },
    {
      status: 6,
      title: "Awaiting - IDs",
      count: awaitingsCount,
      icon: Landmark,
      colorClass: "text-violet-600 dark:text-violet-400",
      borderColor: "border-violet-100 dark:border-violet-950/50",
      bgColor: "bg-violet-50/20 hover:bg-violet-50/40 dark:bg-violet-950/10 dark:hover:bg-violet-950/20"
    },
    {
      status: 7,
      title: "Closed",
      count: closedCount,
      icon: PowerOff,
      colorClass: "text-rose-600 dark:text-rose-400",
      borderColor: "border-rose-100 dark:border-rose-950/50",
      bgColor: "bg-rose-50/20 hover:bg-rose-50/40 dark:bg-rose-950/10 dark:hover:bg-rose-950/20"
    },
    {
      status: 5,
      title: "Completed",
      count: completedCount,
      icon: CheckCheck,
      colorClass: "text-emerald-600 dark:text-emerald-400",
      borderColor: "border-emerald-100 dark:border-emerald-950/50",
      bgColor: "bg-emerald-50/20 hover:bg-emerald-50/40 dark:bg-emerald-950/10 dark:hover:bg-emerald-950/20"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
      {statusCards.map((card) => {
        const IconComponent = card.icon;
        return (
          <Card
            key={card.title}
            onClick={() => onCardClick(card.status)}
            className={`cursor-pointer transition-all duration-200 border ${card.borderColor} ${card.bgColor} shadow-sm hover:translate-y-[-2px]`}
          >
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <div className={`p-2 rounded-full bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 ${card.colorClass} shadow-sm`}>
                <IconComponent size={20} />
              </div>
              <span className="text-xs font-semibold text-zinc-500 mt-2 uppercase tracking-wide">
                {card.title}
              </span>
              <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
                {card.count}
              </span>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
