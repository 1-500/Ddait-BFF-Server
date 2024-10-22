import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const { identityToken, nonce } = await req.json()

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: identityToken,
      nonce: nonce,
    })

    if (error) {
      return NextResponse.json({ message: error.message, status: error.status })
    }
    const { data: socialLoginData, error: socialLoginError } = await supabase
      .from('social_login')
      .select('*')
      .eq('provider', 'apple')
      .eq('provider_user_id', data.user.id)
      .eq('email', data.user.email)
      .single()

    if (!socialLoginData) {
      //처음 소셜로그인 하는사람 테이블등록
      const { data: memberResult, error: memberError } = await supabase
        .from('member')
        .insert({
          email: data.user.email,
          user_level: 0,
        })
        .select('*')
        .single()
      if (memberError) {
        return NextResponse.json({ message: memberError.message, status: 400 })
      }
      const member_id = memberResult.id
      console.log(memberError, member_id)

      const { data: socialLoginInsert, error: socialLoginInsertError } = await supabase
        .from('social_login')
        .insert({
          provider: 'apple',
          provider_user_id: data.user.id,
          email: data.user.email,
          member_id: member_id,
        })
        .select('*')
        .single()
      if (socialLoginInsertError) {
        return NextResponse.json({ message: socialLoginInsertError.message, status: 400 })
      }
    }

    return NextResponse.json({
      status: 200,
      message: '로그인 성공 !',
    })
  } catch (error) {
    return NextResponse.json({ message: error })
  }
}

//sdf
