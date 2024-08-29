import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const { email, password } = await req.json()

    const result = await supabase.from('member').select('*').eq('email', email).single()
    const userId = result.data.id

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return NextResponse.json({ message: error.message }, { status: error.status })
    }

    console.log(userId)
    return NextResponse.json({
      session: data.session,
      userId: userId,
    })
  } catch (error) {
    return NextResponse.json({ message: error })
  }
}

//sdf
