import { NextResponse, NextRequest } from 'next/server'
import bcrypt from 'bcrypt'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const { email, password, nickname, birthdate, gender, location, preferred_sport } = await req.json()
    const hashedPassword = await bcrypt.hash(password, 10)

    if (
      email.length === 0 ||
      password.length === 0 ||
      nickname.length === 0 ||
      birthdate.length === 0 ||
      gender.length === 0 ||
      location.length === 0 ||
      preferred_sport.length == 0
    ) {
      return NextResponse.json({ messsage: '유저 입력에 빈값이 존재합니다' }, { status: 400 })
    }

    const result = await supabase.from('member').insert({
      nickname,
      email,
      birthdate,
      password: hashedPassword,
      gender,
      preferred_sport,
      location,
      user_level: 1,
    })

    console.log(result, result.error, nickname, email, password, birthdate, gender, preferred_sport, location)
    if (result.error) {
      return NextResponse.json({ message: result.error }, { status: result.status })
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (signUpError) {
      return NextResponse.json({ message: signUpError }, { status: signUpError.status })
    }

    return NextResponse.json({ message: '계정이 생성되었습니다' }, { status: 200 })
  } catch (error) {
    console.log(error, 1232345)
    return NextResponse.json({ message: error }, { status: 400 })
  }
}
