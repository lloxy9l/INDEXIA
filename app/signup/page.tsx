import Image from "next/image"

import { SignupForm } from "@/components/signup-form"

export default function SignupPage() {
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
