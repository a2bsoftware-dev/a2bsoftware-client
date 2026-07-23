"use client";

import React from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";

interface MonthlyStatsSectionProps {
  completsMonthlyCount: number;
  disqualifiesMonthlyCount: number;
  quotaFullsMonthlyCount: number;
  securityTermMonthlyCount: number;
  totalMonthlyCount: number;
}

export default function MonthlyStatsSection({
  completsMonthlyCount,
  disqualifiesMonthlyCount,
  quotaFullsMonthlyCount,
  securityTermMonthlyCount,
  totalMonthlyCount
}: MonthlyStatsSectionProps) {
  const getPercentage = (count: number) => {
    if (!totalMonthlyCount || totalMonthlyCount === 0) return 0;
    return (count / totalMonthlyCount) * 100;
  };

  const stats = [
    {
      title: "Completed",
      count: completsMonthlyCount,
      percentage: getPercentage(completsMonthlyCount),
      colorClass: "text-cyan-600 dark:text-cyan-400",
      progressColor: "bg-cyan-500",
      bgColor: "bg-cyan-500/10"
    },
    {
      title: "Disqualified",
      count: disqualifiesMonthlyCount,
      percentage: getPercentage(disqualifiesMonthlyCount),
      colorClass: "text-red-600 dark:text-red-400",
      progressColor: "bg-red-500",
      bgColor: "bg-red-500/10"
    },
    {
      title: "Quotafull",
      count: quotaFullsMonthlyCount,
      percentage: getPercentage(quotaFullsMonthlyCount),
      colorClass: "text-amber-600 dark:text-amber-400",
      progressColor: "bg-amber-500",
      bgColor: "bg-amber-500/10"
    },
    {
      title: "Security Term",
      count: securityTermMonthlyCount,
      percentage: getPercentage(securityTermMonthlyCount),
      colorClass: "text-slate-600 dark:text-slate-400",
      progressColor: "bg-slate-500",
      bgColor: "bg-slate-500/10"
    }
  ];

  return (
    <Card className="border border-zinc-200 shadow-sm bg-white dark:bg-zinc-900">
      <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
        <CardTitle className="text-lg font-bold text-zinc-800 dark:text-zinc-100 uppercase tracking-wide">
          Monthly Statistics
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <div key={stat.title} className="flex flex-col space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                  {stat.title}
                </span>
              </div>
              <div className="flex justify-between items-baseline mt-1">
                <span className={`text-2xl font-extrabold ${stat.colorClass}`}>
                    {stat.count} / {totalMonthlyCount}
                </span>
                <span className="text-xs text-zinc-400 font-mono">
                    {stat.percentage.toFixed(2)}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden mt-1">
                <div
                  className={`h-full rounded-full ${stat.progressColor} transition-all duration-500`}
                  style={{ width: `${stat.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
