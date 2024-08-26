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
        const { data, error } = await supabase.from('social_login').select('*').eq('email', email).single()
        if (!data) {
          const { data: insertData, error: insertError } = await supabase.from('social_login').insert([
            {
              provider_user_id: account?.providerAccountId,
              provider: account?.provider,
              email: user.email,
            },
          ])
          if (insertError) {
            return false
          }
          await supabase.auth.signInWithIdToken({
            provider: account?.provider,
            token: account?.id_token,
          })
        } else {
          const { data: updateData, error: updateDataError } = await supabase
            .from('social_login')
            .update({ last_sign_in: new Date().toISOString() })
            .eq('provider_user_id', provider_id)

          if (updateDataError) {
            return false
          }
        }
        return true
      } catch (error) {
        return false
      }
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.id
      session.user.email = token.email
      return session
    },
  },
})
export { handler as GET, handler as POST }
