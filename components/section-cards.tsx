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

export function SectionCards() {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card shadow-none">
        <CardHeader>
          <CardDescription>Requêtes 24h / 7j</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            1.2k / 6.8k
          </CardTitle>
          <CardAction>
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200">
              <IconTrendingUp />
              +14%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Requêtes servies vs. semaine passée{" "}
          </div>
          <div className="text-muted-foreground">SLA suivi en continu</div>
        </CardFooter>
      </Card>
      <Card className="@container/card shadow-none">
        <CardHeader>
          <CardDescription>Temps de réponse moyen</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            1.9 s
          </CardTitle>
          <CardAction>
            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-200">
              <IconTrendingDown />
              -12%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Amélioration depuis tuning RAG{" "}
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
