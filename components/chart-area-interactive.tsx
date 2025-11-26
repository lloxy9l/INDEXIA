"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"

export const description = "An interactive area chart"

const chartData = [
  { date: "2024-04-01", ragStandard: 220, ragRerank: 140 },
  { date: "2024-04-02", ragStandard: 105, ragRerank: 190 },
  { date: "2024-04-03", ragStandard: 180, ragRerank: 130 },
  { date: "2024-04-04", ragStandard: 240, ragRerank: 260 },
  { date: "2024-04-05", ragStandard: 360, ragRerank: 300 },
  { date: "2024-04-06", ragStandard: 295, ragRerank: 335 },
  { date: "2024-04-07", ragStandard: 240, ragRerank: 190 },
  { date: "2024-04-08", ragStandard: 410, ragRerank: 320 },
  { date: "2024-04-09", ragStandard: 70, ragRerank: 115 },
  { date: "2024-04-10", ragStandard: 260, ragRerank: 195 },
  { date: "2024-04-11", ragStandard: 330, ragRerank: 355 },
  { date: "2024-04-12", ragStandard: 295, ragRerank: 220 },
  { date: "2024-04-13", ragStandard: 345, ragRerank: 385 },
  { date: "2024-04-14", ragStandard: 145, ragRerank: 225 },
  { date: "2024-04-15", ragStandard: 125, ragRerank: 180 },
  { date: "2024-04-16", ragStandard: 140, ragRerank: 195 },
  { date: "2024-04-17", ragStandard: 450, ragRerank: 365 },
  { date: "2024-04-18", ragStandard: 360, ragRerank: 415 },
  { date: "2024-04-19", ragStandard: 245, ragRerank: 185 },
  { date: "2024-04-20", ragStandard: 95, ragRerank: 155 },
  { date: "2024-04-21", ragStandard: 140, ragRerank: 205 },
  { date: "2024-04-22", ragStandard: 230, ragRerank: 175 },
  { date: "2024-04-23", ragStandard: 140, ragRerank: 235 },
  { date: "2024-04-24", ragStandard: 390, ragRerank: 295 },
  { date: "2024-04-25", ragStandard: 220, ragRerank: 255 },
  { date: "2024-04-26", ragStandard: 80, ragRerank: 135 },
  { date: "2024-04-27", ragStandard: 385, ragRerank: 425 },
  { date: "2024-04-28", ragStandard: 130, ragRerank: 185 },
  { date: "2024-04-29", ragStandard: 320, ragRerank: 245 },
  { date: "2024-04-30", ragStandard: 455, ragRerank: 385 },
  { date: "2024-05-01", ragStandard: 175, ragRerank: 225 },
  { date: "2024-05-02", ragStandard: 300, ragRerank: 315 },
  { date: "2024-05-03", ragStandard: 255, ragRerank: 195 },
  { date: "2024-05-04", ragStandard: 390, ragRerank: 430 },
  { date: "2024-05-05", ragStandard: 485, ragRerank: 395 },
  { date: "2024-05-06", ragStandard: 500, ragRerank: 525 },
  { date: "2024-05-07", ragStandard: 395, ragRerank: 305 },
  { date: "2024-05-08", ragStandard: 155, ragRerank: 215 },
  { date: "2024-05-09", ragStandard: 235, ragRerank: 185 },
  { date: "2024-05-10", ragStandard: 300, ragRerank: 335 },
  { date: "2024-05-11", ragStandard: 340, ragRerank: 275 },
  { date: "2024-05-12", ragStandard: 205, ragRerank: 245 },
  { date: "2024-05-13", ragStandard: 205, ragRerank: 170 },
  { date: "2024-05-14", ragStandard: 450, ragRerank: 495 },
  { date: "2024-05-15", ragStandard: 480, ragRerank: 385 },
  { date: "2024-05-16", ragStandard: 345, ragRerank: 405 },
  { date: "2024-05-17", ragStandard: 505, ragRerank: 425 },
  { date: "2024-05-18", ragStandard: 320, ragRerank: 355 },
  { date: "2024-05-19", ragStandard: 240, ragRerank: 185 },
  { date: "2024-05-20", ragStandard: 185, ragRerank: 235 },
  { date: "2024-05-21", ragStandard: 90, ragRerank: 145 },
  { date: "2024-05-22", ragStandard: 88, ragRerank: 125 },
  { date: "2024-05-23", ragStandard: 255, ragRerank: 295 },
  { date: "2024-05-24", ragStandard: 300, ragRerank: 225 },
  { date: "2024-05-25", ragStandard: 210, ragRerank: 255 },
  { date: "2024-05-26", ragStandard: 220, ragRerank: 180 },
  { date: "2024-05-27", ragStandard: 425, ragRerank: 465 },
  { date: "2024-05-28", ragStandard: 240, ragRerank: 195 },
  { date: "2024-05-29", ragStandard: 85, ragRerank: 135 },
  { date: "2024-05-30", ragStandard: 345, ragRerank: 285 },
  { date: "2024-05-31", ragStandard: 185, ragRerank: 235 },
  { date: "2024-06-01", ragStandard: 185, ragRerank: 205 },
  { date: "2024-06-02", ragStandard: 475, ragRerank: 415 },
  { date: "2024-06-03", ragStandard: 110, ragRerank: 165 },
  { date: "2024-06-04", ragStandard: 445, ragRerank: 385 },
  { date: "2024-06-05", ragStandard: 92, ragRerank: 145 },
  { date: "2024-06-06", ragStandard: 300, ragRerank: 255 },
  { date: "2024-06-07", ragStandard: 330, ragRerank: 375 },
  { date: "2024-06-08", ragStandard: 390, ragRerank: 325 },
  { date: "2024-06-09", ragStandard: 440, ragRerank: 485 },
  { date: "2024-06-10", ragStandard: 165, ragRerank: 205 },
  { date: "2024-06-11", ragStandard: 100, ragRerank: 155 },
  { date: "2024-06-12", ragStandard: 495, ragRerank: 425 },
  { date: "2024-06-13", ragStandard: 90, ragRerank: 135 },
  { date: "2024-06-14", ragStandard: 430, ragRerank: 385 },
  { date: "2024-06-15", ragStandard: 315, ragRerank: 355 },
  { date: "2024-06-16", ragStandard: 375, ragRerank: 315 },
  { date: "2024-06-17", ragStandard: 480, ragRerank: 525 },
  { date: "2024-06-18", ragStandard: 115, ragRerank: 175 },
  { date: "2024-06-19", ragStandard: 345, ragRerank: 295 },
  { date: "2024-06-20", ragStandard: 412, ragRerank: 455 },
  { date: "2024-06-21", ragStandard: 175, ragRerank: 215 },
  { date: "2024-06-22", ragStandard: 320, ragRerank: 275 },
  { date: "2024-06-23", ragStandard: 485, ragRerank: 535 },
  { date: "2024-06-24", ragStandard: 138, ragRerank: 185 },
  { date: "2024-06-25", ragStandard: 148, ragRerank: 195 },
  { date: "2024-06-26", ragStandard: 438, ragRerank: 385 },
  { date: "2024-06-27", ragStandard: 452, ragRerank: 495 },
  { date: "2024-06-28", ragStandard: 155, ragRerank: 205 },
  { date: "2024-06-29", ragStandard: 110, ragRerank: 170 },
  { date: "2024-06-30", ragStandard: 450, ragRerank: 405 },
]

const chartConfig = {
  visitors: {
    label: "Requêtes",
  },
  ragStandard: {
    label: "RAG standard",
    color: "#2563eb", // bleu
  },
  ragRerank: {
    label: "RAG + re-ranking",
    color: "#22c55e", // vert
  },
} satisfies ChartConfig

export function ChartAreaInteractive() {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState("90d")

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d")
    }
  }, [isMobile])

  const filteredData = chartData.filter((item) => {
    const date = new Date(item.date)
    const referenceDate = new Date("2024-06-30")
    let daysToSubtract = 90
    if (timeRange === "30d") {
      daysToSubtract = 30
    } else if (timeRange === "7d") {
      daysToSubtract = 7
    }
    const startDate = new Date(referenceDate)
    startDate.setDate(startDate.getDate() - daysToSubtract)
    return date >= startDate
  })

  return (
    <Card className="@container/card shadow-none bg-white/80 dark:bg-card border border-primary/15">
      <CardHeader>
        <CardTitle>Requêtes par jour</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Volume agrégé par pipeline RAG
          </span>
          <span className="@[540px]/card:hidden">Pipelines RAG</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">90 jours</ToggleGroupItem>
            <ToggleGroupItem value="30d">30 jours</ToggleGroupItem>
            <ToggleGroupItem value="7d">7 jours</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select a value"
            >
              <SelectValue placeholder="90 jours" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                90 jours
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                30 jours
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                7 jours
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillRagStandard" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-ragStandard)"
                  stopOpacity={1.0}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-ragStandard)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillRagRerank" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-ragRerank)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-ragRerank)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="ragRerank"
              type="natural"
              fill="url(#fillRagRerank)"
              stroke="var(--color-ragRerank)"
              stackId="a"
            />
            <Area
              dataKey="ragStandard"
              type="natural"
              fill="url(#fillRagStandard)"
              stroke="var(--color-ragStandard)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
