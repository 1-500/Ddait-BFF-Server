import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const { email, password } = await req.json()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return NextResponse.json({ message: error.message }, { status: error.status })
    }
    const result = await supabase.from('member').select('*').eq('email', email).single()
    const userId = result.data.id
    const nickname = result.data.nickname
    const profileImageUrl = result.data.profile_image
    const bio = result.data.bio

    return NextResponse.json({
      session: data.session,
      userId: userId,
      nickname: nickname,
      profileImageUrl: profileImageUrl,
      bio: bio,
      status: 200,
    })
  } catch (error) {
    return NextResponse.json({ message: error })
  }
}

//sdf
