"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface ProjectStatusBarChartProps {
  bidding: number;
  testing: number;
  running: number;
  hold: number;
  awaiting: number;
  closed: number;
  completed: number;
  // Matches the legacy numeric project status codes (1=Bidding...7=Closed).
  onBarClick?: (statusCode: number) => void;
}

const chartConfig = {
  count: { label: "Projects", color: "var(--chart-1)" },
} satisfies ChartConfig;

export default function ProjectStatusBarChart({
  bidding,
  testing,
  running,
  hold,
  awaiting,
  closed,
  completed,
  onBarClick,
}: ProjectStatusBarChartProps) {
  const data: { status: string; count: number; statusCode: number }[] = [
    { status: "Bidding", count: bidding, statusCode: 1 },
    { status: "Testing", count: testing, statusCode: 2 },
    { status: "Running", count: running, statusCode: 3 },
    { status: "Hold", count: hold, statusCode: 4 },
    { status: "Completed", count: completed, statusCode: 5 },
    { status: "Awaiting", count: awaiting, statusCode: 6 },
    { status: "Closed", count: closed, statusCode: 7 },
  ];

  return (
    <Card className="border-zinc-200 shadow-sm bg-white dark:bg-zinc-900">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
          Project Status Counters
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="max-h-64 w-full">
          <BarChart data={data}>
            <CartesianGrid vertical={false} className="stroke-zinc-200 dark:stroke-zinc-800" />
            <XAxis dataKey="status" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar
              dataKey="count"
              fill="var(--color-count)"
              radius={4}
              onClick={(entry) => {
                const statusCode = (entry as unknown as { payload?: { statusCode?: number } }).payload?.statusCode;
                if (statusCode !== undefined) onBarClick?.(statusCode);
              }}
              className={onBarClick ? "cursor-pointer" : undefined}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
