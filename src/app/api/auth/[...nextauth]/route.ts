import { createClient } from '@/utils/supabase/client'
import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'

const supabase = createClient()
const handler = NextAuth({
  // Configure one or more authentication providers
  providers: [
    Google({
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      clientSecret: process.env.NEXT_PUBLIC_GOOGLE_SECRET_ID,
    }),
    // ...add more providers here
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        const email = user.email
        let user_level
        const { data, error } = await supabase.from('social_login').select('*').eq('email', email).single()

        if (!data) {
          const { data: insertData, error: insertError } = await supabase.from('social_login').insert([
            {
              provider_user_id: account?.providerAccountId,
              provider: account?.provider,
              email: user.email,
            },
          ])

          user_level = 0
          if (insertError) {
            return false
          }
        } else {
          user_level = data.user_level
        }
        user.user_level = user_level

        return true
      } catch (error) {
        return false
      }
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.user_level = user.user_level
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.id
      session.user.email = token.email
      session.user.user_level = token.user_level
      return session
    },
  },
})
export { handler as GET, handler as POST }
