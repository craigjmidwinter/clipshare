import { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Handle Plex authentication
        if (credentials.password === "plex-auth") {
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email
            }
          })

          if (!user) {
            return null
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            plexUserId: user.plexUserId || undefined,
            plexUsername: user.plexUsername || undefined,
            onboardingCompleted: user.onboardingCompleted,
          }
        }

        // This app only supports Plex OAuth authentication
        // Regular password authentication is not implemented
        return null
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.plexUserId = (user as any).plexUserId
        token.plexUsername = (user as any).plexUsername
        token.onboardingCompleted = (user as any).onboardingCompleted
      } else if (token.id) {
        // Fetch fresh user data from database to get updated onboarding status
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: {
              onboardingCompleted: true,
              plexUserId: true,
              plexUsername: true,
            }
          })
          
          if (dbUser) {
            token.onboardingCompleted = dbUser.onboardingCompleted
            token.plexUserId = dbUser.plexUserId
            token.plexUsername = dbUser.plexUsername
          }
        } catch (error) {
          console.error("Error fetching user data in JWT callback:", error)
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.plexUserId = token.plexUserId as string
        session.user.plexUsername = token.plexUsername as string
        session.user.onboardingCompleted = token.onboardingCompleted as boolean
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
}
