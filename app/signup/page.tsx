import Image from "next/image"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { SignupForm } from "@/components/signup-form"

export default async function SignupPage() {
  const cookieStore = await cookies()
  const authCookie = cookieStore.get("auth_state")
  if (authCookie?.value) {
    redirect("/chat")
  }

  const logoSrc = "/logo.png"

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="mb-6 flex items-center justify-center">
        <Image
          src={logoSrc}
          alt="Logo"
          width={180}
          height={180}
          priority
          unoptimized
        />
      </div>
      <br />
      <div className="w-full max-w-sm md:max-w-4xl">
        <SignupForm />
      </div>
    </div>
  )
}
