"use client";

import React from "react";
import { CheckCircle2, XCircle, AlertTriangle, ShieldX, ArrowDownCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface DashboardStatsCardsProps {
  completsCount: number;
  disqualifiesCount: number;
  quotaFullsCount: number;
  securityTermsCount: number;
  dropsCount: number;
  onCardClick: (type: number) => void;
}

export default function DashboardStatsCards({
  completsCount,
  disqualifiesCount,
  quotaFullsCount,
  securityTermsCount,
  dropsCount,
  onCardClick
}: DashboardStatsCardsProps) {
  const cards = [
    {
      type: 1,
      title: "Completed",
      count: completsCount,
      icon: CheckCircle2,
      colorClass: "text-cyan-600 dark:text-cyan-400",
      borderColor: "border-cyan-200 dark:border-cyan-900/50",
      bgColor: "bg-cyan-50/50 dark:bg-cyan-950/20 hover:bg-cyan-50 dark:hover:bg-cyan-950/30"
    },
    {
      type: 2,
      title: "Disqualify",
      count: disqualifiesCount,
      icon: XCircle,
      colorClass: "text-red-600 dark:text-red-400",
      borderColor: "border-red-200 dark:border-red-900/50",
      bgColor: "bg-red-50/50 dark:bg-red-950/20 hover:bg-red-50 dark:hover:bg-red-950/30"
    },
    {
      type: 3,
      title: "Quota Full",
      count: quotaFullsCount,
      icon: AlertTriangle,
      colorClass: "text-amber-600 dark:text-amber-400",
      borderColor: "border-amber-200 dark:border-amber-900/50",
      bgColor: "bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-50 dark:hover:bg-amber-950/30"
    },
    {
      type: 4,
      title: "Security Term",
      count: securityTermsCount,
      icon: ShieldX,
      colorClass: "text-slate-600 dark:text-slate-400",
      borderColor: "border-slate-200 dark:border-slate-800",
      bgColor: "bg-slate-50/50 dark:bg-slate-900/20 hover:bg-slate-50 dark:hover:bg-slate-900/30"
    },
    {
      type: 0,
      title: "Drop",
      count: dropsCount,
      icon: ArrowDownCircle,
      colorClass: "text-emerald-600 dark:text-emerald-400",
      borderColor: "border-emerald-200 dark:border-emerald-900/50",
      bgColor: "bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card) => {
        const IconComponent = card.icon;
        return (
          <Card
            key={card.title}
            onClick={() => onCardClick(card.type)}
            className={`cursor-pointer transition-all duration-300 border ${card.borderColor} ${card.bgColor} shadow-sm active:scale-95`}
          >
            <CardContent className="p-5 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">
                  {card.title}
                </span>
                <span className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-50 mt-1">
                  {card.count}
                </span>
              </div>
              <div className={`p-3 rounded-full bg-white dark:bg-zinc-900 shadow-sm border border-zinc-100 dark:border-zinc-800 ${card.colorClass}`}>
                <IconComponent size={24} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
