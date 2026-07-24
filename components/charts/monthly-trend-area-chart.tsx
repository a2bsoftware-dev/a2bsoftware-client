"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";

// One row per day, pre-aggregated - see buildDailyTrend in dashboard/page.tsx
// for how raw survey-information rows get grouped into this shape.
export interface DailyTrendRow {
  day: string;
  complete: number;
  disqualify: number;
  quotaFull: number;
  securityTerm: number;
  drop: number;
}

const chartConfig = {
  complete: { label: "Completed", color: "var(--chart-1)" },
  disqualify: { label: "Disqualify", color: "var(--chart-2)" },
  quotaFull: { label: "Quota Full", color: "var(--chart-3)" },
  securityTerm: { label: "Security Term", color: "var(--chart-4)" },
  drop: { label: "Drop", color: "var(--chart-5)" },
} satisfies ChartConfig;

export default function MonthlyTrendAreaChart({ data }: { data: DailyTrendRow[] }) {
  return (
    <Card className="border-zinc-200 shadow-sm bg-white dark:bg-zinc-900">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
          Monthly Trend
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-sm text-zinc-400">
            No survey activity yet this month.
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="max-h-64 w-full">
            <AreaChart data={data}>
              <CartesianGrid vertical={false} className="stroke-zinc-200 dark:stroke-zinc-800" />
              <XAxis
                dataKey="day"
                tickFormatter={(d: string) => d.slice(5)}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
              />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Area
                type="monotone"
                dataKey="complete"
                stackId="1"
                stroke="var(--color-complete)"
                fill="var(--color-complete)"
                fillOpacity={0.4}
              />
              <Area
                type="monotone"
                dataKey="disqualify"
                stackId="1"
                stroke="var(--color-disqualify)"
                fill="var(--color-disqualify)"
                fillOpacity={0.4}
              />
              <Area
                type="monotone"
                dataKey="quotaFull"
                stackId="1"
                stroke="var(--color-quotaFull)"
                fill="var(--color-quotaFull)"
                fillOpacity={0.4}
              />
              <Area
                type="monotone"
                dataKey="securityTerm"
                stackId="1"
                stroke="var(--color-securityTerm)"
                fill="var(--color-securityTerm)"
                fillOpacity={0.4}
              />
              <Area
                type="monotone"
                dataKey="drop"
                stackId="1"
                stroke="var(--color-drop)"
                fill="var(--color-drop)"
                fillOpacity={0.4}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
