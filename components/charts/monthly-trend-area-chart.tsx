"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// One row per day, pre-aggregated - see buildDailyTrend in dashboard/page.tsx
// for how raw survey-information rows get grouped into this shape.
export interface DailyTrendRow {
  day: string;
  complete: number;
  disqualify: number;
  quotaFull: number;
  securityTerm: number;
  drop: number;
  reconcile: number;
}

const chartConfig = {
  complete: { label: "Completed", color: "var(--chart-1)" },
  disqualify: { label: "Disqualify", color: "var(--chart-2)" },
  quotaFull: { label: "Quota Full", color: "var(--chart-3)" },
  securityTerm: { label: "Security Term", color: "var(--chart-4)" },
  drop: { label: "Drop", color: "var(--chart-5)" },
  reconcile: { label: "Reconcile", color: "var(--chart-6)" },
} satisfies ChartConfig;

const SERIES = Object.keys(chartConfig) as Array<keyof typeof chartConfig>;

const RANGE_DAYS: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };

export default function MonthlyTrendAreaChart({ data }: { data: DailyTrendRow[] }) {
  const [range, setRange] = React.useState("90d");

  // Relative to the LAST day actually present in the data (not "today") -
  // this chart is fed a fixed calendar-month window from the backend
  // (dashboard/page.tsx's buildDailyTrend), so filtering should slice that
  // window, not assume the data runs up to the current moment.
  const filteredData = React.useMemo(() => {
    if (data.length === 0) return data;
    const days = RANGE_DAYS[range] ?? 90;
    const lastDay = new Date(data[data.length - 1].day);
    const startDate = new Date(lastDay);
    startDate.setDate(startDate.getDate() - days);
    return data.filter((row) => new Date(row.day) >= startDate);
  }, [data, range]);

  return (
    <Card className="border-zinc-200 shadow-sm bg-white dark:bg-zinc-900 pt-0">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b border-zinc-100 dark:border-zinc-800 py-4 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle className="text-sm font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
            Monthly Trend
          </CardTitle>
          <CardDescription className="text-xs">Survey outcomes over time</CardDescription>
        </div>
        <Select value={range} onValueChange={(value) => setRange(value ?? "90d")}>
          <SelectTrigger className="w-[140px] rounded-lg sm:ml-auto" aria-label="Select a range">
            <SelectValue placeholder="Last 3 months" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="90d" className="rounded-lg">Last 3 months</SelectItem>
            <SelectItem value="30d" className="rounded-lg">Last 30 days</SelectItem>
            <SelectItem value="7d" className="rounded-lg">Last 7 days</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {filteredData.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-sm text-zinc-400">
            No survey activity in this range.
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
            <AreaChart data={filteredData}>
              <defs>
                {SERIES.map((key) => (
                  <linearGradient key={key} id={`fill-${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={`var(--color-${key})`} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={`var(--color-${key})`} stopOpacity={0.1} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid vertical={false} className="stroke-zinc-200 dark:stroke-zinc-800" />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tick={{ fontSize: 11 }}
                tickFormatter={(value: string) => {
                  const date = new Date(value);
                  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                }}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) =>
                      new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                    }
                    indicator="dot"
                  />
                }
              />
              {SERIES.map((key) => (
                <Area
                  key={key}
                  dataKey={key}
                  type="natural"
                  fill={`url(#fill-${key})`}
                  stroke={`var(--color-${key})`}
                  stackId="1"
                />
              ))}
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
