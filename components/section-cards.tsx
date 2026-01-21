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

type QualityStats = {
  coveragePct: number | null
  coverageDeltaPct: number | null
  errorPct: number | null
  errorDeltaPct: number | null
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

const formatPercent = (value: number) => {
  const fixed = value >= 10 ? value.toFixed(0) : value.toFixed(1)
  return fixed.endsWith(".0") ? fixed.slice(0, -2) : fixed
}

export function SectionCards() {
  const [requestStats, setRequestStats] = React.useState<RequestStats | null>(
    null
  )
  const [qualityStats, setQualityStats] = React.useState<QualityStats | null>(
    null
  )

  React.useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [requestsRes, qualityRes] = await Promise.all([
          fetch("/api/metrics/requests", { cache: "no-store" }),
          fetch("/api/metrics/quality", { cache: "no-store" }),
        ])
        if (requestsRes.ok) {
          const payload = (await requestsRes.json()) as RequestStats
          if (!cancelled) setRequestStats(payload)
        }
        if (qualityRes.ok) {
          const payload = (await qualityRes.json()) as QualityStats
          if (!cancelled) setQualityStats(payload)
        }
      } catch {
        if (!cancelled) {
          setRequestStats(null)
          setQualityStats(null)
        }
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
  const latencyTrendUp = latencyDelta != null && latencyDelta >= 0
  const latencyBadgeClass =
    latencyDelta == null
      ? "bg-muted text-muted-foreground dark:bg-muted/60 dark:text-muted-foreground"
      : latencyTrendUp
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200"
      : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-200"

  const coveragePct = qualityStats?.coveragePct ?? null
  const coverageLabel = coveragePct == null ? "--" : `${formatPercent(coveragePct)}%`
  const coverageDelta =
    qualityStats?.coverageDeltaPct == null ? null : qualityStats.coverageDeltaPct
  const coverageDeltaLabel =
    coverageDelta == null ? "--" : formatDelta(coverageDelta)
  const coverageTrendUp = coverageDelta != null && coverageDelta >= 0
  const coverageBadgeClass =
    coverageDelta == null
      ? "bg-muted text-muted-foreground dark:bg-muted/60 dark:text-muted-foreground"
      : coverageTrendUp
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200"
      : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-200"

  const errorPct = qualityStats?.errorPct ?? null
  const errorLabel = errorPct == null ? "--" : `${formatPercent(errorPct)}%`
  const errorDelta =
    qualityStats?.errorDeltaPct == null ? null : qualityStats.errorDeltaPct
  const errorDeltaLabel = errorDelta == null ? "--" : formatDelta(errorDelta)
  const errorTrendUp = errorDelta != null && errorDelta >= 0
  const errorBadgeClass =
    errorDelta == null
      ? "bg-muted text-muted-foreground dark:bg-muted/60 dark:text-muted-foreground"
      : errorTrendUp
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
              {latencyDelta == null ? null : latencyTrendUp ? (
                <IconTrendingUp />
              ) : (
                <IconTrendingDown />
              )}
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
            {coverageLabel}
          </CardTitle>
          <CardAction>
            <Badge className={coverageBadgeClass}>
              {coverageDelta == null ? null : coverageTrendUp ? (
                <IconTrendingUp />
              ) : (
                <IconTrendingDown />
              )}
              {coverageDeltaLabel}
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
            {errorLabel}
          </CardTitle>
          <CardAction>
            <Badge className={errorBadgeClass}>
              {errorDelta == null ? null : errorTrendUp ? (
                <IconTrendingUp />
              ) : (
                <IconTrendingDown />
              )}
              {errorDeltaLabel}
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
