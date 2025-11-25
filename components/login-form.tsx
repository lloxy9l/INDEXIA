"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { FormEvent, useEffect, useState } from "react"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [status, setStatus] = useState<{
    type: "error" | "success" | null
    message: string
  }>({ type: null, message: "" })
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (!status.type) return
    const timeoutId = setTimeout(() => {
      setStatus({ type: null, message: "" })
    }, 3500)
    return () => clearTimeout(timeoutId)
  }, [status.type, status.message])

  useEffect(() => {
    if (status.type === "success") {
      const to = setTimeout(() => router.push("/chat"), 1500)
      return () => clearTimeout(to)
    }
  }, [status.type, router])

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)
    setStatus({ type: null, message: "" })

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const payload = await response.json()

      if (!response.ok) {
        setStatus({ type: "error", message: payload?.error ?? "Erreur" })
        return
      }

      setStatus({
        type: "success",
        message: payload?.message ?? "Connexion réussie.",
      })
    } catch (error) {
      setStatus({ type: "error", message: "Impossible de se connecter." })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      {status.type ? (
        <div
          className={cn(
            "fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-md px-4 py-3 text-sm shadow-lg transition-opacity",
            status.type === "error"
              ? "bg-destructive text-destructive-foreground"
              : "bg-emerald-600 text-white"
          )}
        >
          {status.message}
        </div>
      ) : null}
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={onSubmit}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Content de vous revoir</h1>
                <p className="text-muted-foreground text-balance">
                  Connectez-vous à votre compte IndexIA
                </p>
              </div>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
                  <a
                    href="#"
                    className="ml-auto text-sm underline-offset-2 hover:underline"
                  >
                    Mot de passe oublié ?
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </Field>
              <Field>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Connexion..." : "Se connecter"}
                </Button>
              </Field>
              <FieldDescription className="text-center">
                Vous n&apos;avez pas de compte ? <a href="/signup">Inscrivez-vous</a>
              </FieldDescription>
            </FieldGroup>
          </form>
          <div className="bg-muted relative hidden md:block">
            <img
              src="https://media.istockphoto.com/id/1327611460/photo/interior-of-a-modern-luxurious-open-plan-co-working-office-space.jpg?s=612x612&w=0&k=20&c=A_Ht3AiGgXpcxTfH9XZPV01yZobdlswKTMu0r8-J1CU="
              alt="Image"
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
            />
          </div>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        En cliquant sur continuer, vous acceptez nos{" "}
        <a href="#">Conditions d&apos;utilisation</a> et notre{" "}
        <a href="#">Politique de confidentialité</a>.
      </FieldDescription>
    </div>
  )
}
