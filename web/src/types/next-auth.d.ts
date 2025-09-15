import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      plexUserId?: string
      plexUsername?: string
      onboardingCompleted?: boolean
    }
  }

  interface User {
    plexUserId?: string
    plexUsername?: string
    onboardingCompleted?: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    plexUserId?: string
    plexUsername?: string
    onboardingCompleted?: boolean
  }
}
