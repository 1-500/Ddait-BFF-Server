import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient()
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userid = searchParams.get('userId')
    const result = await supabase.from('social_login').select('*').eq('provider_user_id', userid).single()

    if (result.error) {
      return NextResponse.json({ message: result.error.message })
    }

    const { provider, member_id, email } = result.data

    if (!member_id) {
      //   아직 회원가입 안한 유저면 회원가입 온보딩으로 이동시켜 회원가입 을시켜야한다.
      const { data, error } = await supabase.from('member').insert({
        nickname: '헬스보이',
        email,
        birthdate: '1992-11-12',
        password: '1234',
        gender: 'M',
        preferred_sport: '웨이트',
        location: '33',
        user_level: 1,
      })
      const res = await supabase.from('member').select('*').eq('email', email).single()
      await supabase.from('social_login').update({ member_id: res.data.id }).eq('email', email)
      // 회원가입후 소셜로그인 member_id와 연결 시키기 => 소셜로그인으로 처음 로그인하고 회원가입하면 해야될 절차 .
    } else {
      //   const { data, error } = await supabase.from('member').select('*').eq('id', member_id).single()
      //   const { email, password } = data
      //   const {hi} = await supabase.auth.signInWithPassword({
      //     email,
      //     password,
      //   })
      //   console.log(hi, 12345)
      //   //   console.log(email, password)
      //회원가입 한유저면 member_id기반으로 member table에 접근해서 로그인후 토큰을 받음
    }
    return NextResponse.json({ 123: 123 })
  } catch (error) {
    return NextResponse.json({ message: error })
  }
}
