"use client";

import { Label, PolarGrid, PolarRadiusAxis, RadialBar, RadialBarChart } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer } from "@/components/ui/chart";

interface CompletionRadialChartProps {
  completed: number;
  totalHits: number;
}

const chartConfig = {
  rate: { label: "Completion Rate", color: "var(--chart-1)" },
} satisfies ChartConfig;

export default function CompletionRadialChart({ completed, totalHits }: CompletionRadialChartProps) {
  const rate = totalHits > 0 ? Math.round((completed / totalHits) * 100) : 0;
  const data = [{ name: "rate", value: rate, fill: "var(--color-rate)" }];

  return (
    <Card className="border-zinc-200 shadow-sm bg-white dark:bg-zinc-900">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
          Completion Rate
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-64">
          <RadialBarChart
            data={data}
            innerRadius={70}
            outerRadius={110}
            startAngle={90}
            endAngle={90 - 360 * (rate / 100)}
          >
            <PolarGrid
              gridType="circle"
              radialLines={false}
              stroke="none"
              className="first:fill-zinc-100 dark:first:fill-zinc-800"
              polarRadius={[74, 66]}
            />
            <RadialBar dataKey="value" background cornerRadius={10} />
            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-zinc-800 dark:fill-zinc-100 text-3xl font-bold"
                        >
                          {rate}%
                        </tspan>
                        <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 24} className="fill-zinc-500 text-xs">
                          Completed
                        </tspan>
                      </text>
                    );
                  }
                  return null;
                }}
              />
            </PolarRadiusAxis>
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
