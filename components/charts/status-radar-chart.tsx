"use client";

import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface StatusRadarChartProps {
  completed: number;
  disqualify: number;
  quotaFull: number;
  securityTerm: number;
  drop: number;
}

const chartConfig = {
  value: { label: "Count", color: "var(--chart-1)" },
} satisfies ChartConfig;

export default function StatusRadarChart({
  completed,
  disqualify,
  quotaFull,
  securityTerm,
  drop,
}: StatusRadarChartProps) {
  const data = [
    { status: "Completed", value: completed },
    { status: "Disqualify", value: disqualify },
    { status: "Quota Full", value: quotaFull },
    { status: "Security Term", value: securityTerm },
    { status: "Drop", value: drop },
  ];

  return (
    <Card className="border-zinc-200 shadow-sm bg-white dark:bg-zinc-900">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
          Status Radar
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-64">
          <RadarChart data={data}>
            <ChartTooltip content={<ChartTooltipContent />} />
            <PolarAngleAxis dataKey="status" tick={{ fontSize: 11 }} />
            <PolarGrid />
            <Radar dataKey="value" fill="var(--color-value)" fillOpacity={0.5} stroke="var(--color-value)" />
          </RadarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
