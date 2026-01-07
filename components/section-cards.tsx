import * as React from "react"
import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type RequestStats = {
  requests24h: number
  requests7d: number
  deltaPct: number | null
  avgMs24h: number | null
  avgMsPrev24h: number | null
  avgMsDeltaPct: number | null
  p95Ms24h: number | null
}

const formatCompact = (value: number) => {
  const trim = (num: number) => {
    const fixed = num.toFixed(1)
    return fixed.endsWith(".0") ? fixed.slice(0, -2) : fixed
  }
  if (value >= 1_000_000) return `${trim(value / 1_000_000)}M`
  if (value >= 1_000) return `${trim(value / 1_000)}k`
  return `${value}`
}

const formatDelta = (value: number) => {
  const abs = Math.abs(value)
  const fixed = abs >= 10 ? abs.toFixed(0) : abs.toFixed(1)
  const trimmed = fixed.endsWith(".0") ? fixed.slice(0, -2) : fixed
  if (value > 0) return `+${trimmed}%`
  if (value < 0) return `-${trimmed}%`
  return "0%"
}

const formatSeconds = (valueMs: number) => {
  const seconds = valueMs / 1000
  const fixed = seconds >= 10 ? seconds.toFixed(0) : seconds.toFixed(1)
  return fixed.endsWith(".0") ? fixed.slice(0, -2) : fixed
}

export function SectionCards() {
  const [requestStats, setRequestStats] = React.useState<RequestStats | null>(
    null
  )

  React.useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch("/api/metrics/requests", { cache: "no-store" })
        if (!res.ok) return
        const payload = (await res.json()) as RequestStats
        if (!cancelled) setRequestStats(payload)
      } catch {
        if (!cancelled) setRequestStats(null)
      }
    }

    load()
    const interval = setInterval(load, 30_000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  const requestsLabel = requestStats
    ? `${formatCompact(requestStats.requests24h)} / ${formatCompact(
        requestStats.requests7d
      )}`
    : "-- / --"
  const deltaLabel =
    requestStats?.deltaPct == null ? "--" : formatDelta(requestStats.deltaPct)
  const trendUp = requestStats?.deltaPct != null && requestStats.deltaPct >= 0
  const badgeClassName =
    requestStats?.deltaPct == null
      ? "bg-muted text-muted-foreground dark:bg-muted/60 dark:text-muted-foreground"
      : trendUp
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200"
      : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-200"

  const avgMs = requestStats?.avgMs24h ?? null
  const latencyLabel = avgMs == null ? "--" : `${formatSeconds(avgMs)} s`
  const latencyDelta =
    requestStats?.avgMsDeltaPct == null
      ? null
      : requestStats.avgMsDeltaPct
  const latencyDeltaLabel =
    latencyDelta == null ? "--" : formatDelta(latencyDelta)
  const latencyImproved = latencyDelta != null && latencyDelta < 0
  const latencyWorse = latencyDelta != null && latencyDelta > 0
  const latencyBadgeClass =
    latencyDelta == null
      ? "bg-muted text-muted-foreground dark:bg-muted/60 dark:text-muted-foreground"
      : latencyImproved
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200"
      : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-200"

  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card shadow-none">
        <CardHeader>
          <CardDescription>Requêtes 24h / 7j</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {requestsLabel}
          </CardTitle>
          <CardAction>
            <Badge className={badgeClassName}>
              {requestStats?.deltaPct == null ? null : trendUp ? (
                <IconTrendingUp />
              ) : (
                <IconTrendingDown />
              )}
              {deltaLabel}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Requêtes servies vs. semaine passée
          </div>
          <div className="text-muted-foreground">SLA suivi en continu</div>
        </CardFooter>
      </Card>
      <Card className="@container/card shadow-none">
        <CardHeader>
          <CardDescription>Temps de réponse moyen</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {latencyLabel}
          </CardTitle>
          <CardAction>
            <Badge className={latencyBadgeClass}>
              {latencyDelta == null ? null : latencyImproved ? (
                <IconTrendingDown />
              ) : latencyWorse ? (
                <IconTrendingUp />
              ) : null}
              {latencyDeltaLabel}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Amélioration depuis tuning RAG
          </div>
          <div className="text-muted-foreground">P95 calculé sur 24h</div>
        </CardFooter>
      </Card>
      <Card className="@container/card shadow-none">
        <CardHeader>
          <CardDescription>Réponses avec sources suffisantes</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            87%
          </CardTitle>
          <CardAction>
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200">
              <IconTrendingUp />
              +4.1%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Coverage des citations 
          </div>
          <div className="text-muted-foreground">
            Score basé sur validation humaine + auto
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card shadow-none">
        <CardHeader>
          <CardDescription>Erreurs / timeout / pas de résultat</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            3.2%
          </CardTitle>
          <CardAction>
            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-200">
              <IconTrendingDown />
              -1.1%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Réductions via retrials + cache{" "}
          </div>
          <div className="text-muted-foreground">
            Requêtes en échec sur les 7 derniers jours
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
