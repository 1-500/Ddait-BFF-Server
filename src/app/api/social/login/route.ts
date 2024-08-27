import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const { searchParams } = new URL(req.url)
    const email = searchParams.get('email')

    const searchResult = await supabase.from('social_login').select('*').eq('email', email).single()
    const memberResult = await supabase.from('member').select('*').eq('id', searchResult.data.member_id).single()

    const signInResult = await supabase.auth.signInWithPassword({
      email: memberResult.data.email,
      password: memberResult.data.password,
    })

    return NextResponse.json(signInResult.data.session)
  } catch (error) {
    console.log(error)
    return NextResponse.json({ message: error })
  }
}
