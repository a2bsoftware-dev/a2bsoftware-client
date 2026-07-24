"use client";

import { Pie, PieChart } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";

type StatusKey = "completed" | "disqualify" | "quotaFull" | "securityTerm" | "drop";

interface TodayStatusPieChartProps {
  completed: number;
  disqualify: number;
  quotaFull: number;
  securityTerm: number;
  drop: number;
  onSliceClick?: (key: StatusKey) => void;
}

const chartConfig = {
  completed: { label: "Completed", color: "var(--chart-1)" },
  disqualify: { label: "Disqualify", color: "var(--chart-2)" },
  quotaFull: { label: "Quota Full", color: "var(--chart-3)" },
  securityTerm: { label: "Security Term", color: "var(--chart-4)" },
  drop: { label: "Drop", color: "var(--chart-5)" },
} satisfies ChartConfig;

export default function TodayStatusPieChart({
  completed,
  disqualify,
  quotaFull,
  securityTerm,
  drop,
  onSliceClick,
}: TodayStatusPieChartProps) {
  const data = (
    [
      { key: "completed", value: completed, fill: "var(--color-completed)" },
      { key: "disqualify", value: disqualify, fill: "var(--color-disqualify)" },
      { key: "quotaFull", value: quotaFull, fill: "var(--color-quotaFull)" },
      { key: "securityTerm", value: securityTerm, fill: "var(--color-securityTerm)" },
      { key: "drop", value: drop, fill: "var(--color-drop)" },
    ] as const satisfies readonly { key: StatusKey; value: number; fill: string }[]
  ).filter((d) => d.value > 0);

  return (
    <Card className="border-zinc-200 shadow-sm bg-white dark:bg-zinc-900">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
          Today&apos;s Status Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-sm text-zinc-400">
            No survey activity yet today.
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-64">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent nameKey="key" hideLabel />} />
              <Pie
                data={data}
                dataKey="value"
                nameKey="key"
                innerRadius={50}
                outerRadius={90}
                onClick={(entry) => {
                  const key = (entry as unknown as { key?: StatusKey; payload?: { key?: StatusKey } }).key
                    ?? (entry as unknown as { payload?: { key?: StatusKey } }).payload?.key;
                  if (key) onSliceClick?.(key);
                }}
                className={onSliceClick ? "cursor-pointer" : undefined}
              />
              <ChartLegend content={<ChartLegendContent nameKey="key" />} />
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
