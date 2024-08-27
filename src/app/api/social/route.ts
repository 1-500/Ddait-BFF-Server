import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const { searchParams } = new URL(req.url)
    const userid = searchParams.get('userId')
    const result = await supabase.from('social_login').select('*').eq('provider_user_id', userid).single()

    if (result.error) {
      return NextResponse.json({ message: result.error.message })
    }

    const { provider, member_id, email } = result.data

    if (!member_id) {
      //   아직 회원가입 안한 유저면 회원가입 온보딩으로 이동시켜 회원가입 을시켜야한다.
      // return NextResponse.json({
      //   user_level:result.data.user_level
      // })
      // const { data: hi, error: hiError } = await supabase.from('member').insert({
      //   nickname: '헬스보이',
      //   email,
      //   birthdate: '1992-11-12',
      //   password: 'asdfadsfzxcv234!',
      //   gender: 'M',
      //   preferred_sport: '웨이트',
      //   location: '33',
      //   user_level: 1,
      // })
      // const res = await supabase.from('member').select('*').eq('email', email).single()
      // await supabase.from('social_login').update({ member_id: res.data.id }).eq('email', email)
      // const { data, error } = await supabase.auth.signUp({
      //   email,
      //   password: res.data.password,
      // })
      // console.log(email, data, error)
      // 회원가입후 소셜로그인 member_id와 연결 시키기 => 소셜로그인으로 처음 로그인하고 회원가입하면 해야될 절차 .
    } else {
      // 가입한유저면 사용자의 소셜로그인 email값으로 member의 이메일 password를 가져온 뒤에
      // supabase.auth.signInWithpassword로 로그인을 하고 클라이언트로 토큰을 보내준다.
      const result = await supabase.from('member').select('*').eq('email', email).single()

      const data = await supabase.auth.signInWithPassword({
        email: result.data.email,
        password: result.data.password,
      })
      console.log(data, 123456)
    }
    return NextResponse.json({ 123: 123 })
  } catch (error) {
    console.log(error)
    return NextResponse.json({ message: error })
  }
}
