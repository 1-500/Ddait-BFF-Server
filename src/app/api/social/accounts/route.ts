import { NextResponse, NextRequest } from 'next/server'
import bcrypt from 'bcrypt'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const { email, password, nickname, birthdate, gender, location, preferred_sport, social_email } = await req.json()
    const hashedPassword = await bcrypt.hash(password, 10)

    const insertMember = await supabase
      .from('member')
      .insert({
        nickname,
        email,
        birthdate,
        password: hashedPassword,
        gender,
        preferred_sport,
        location,
        user_level: 1,
      })
      .select('*')
      .single()
    console.log(insertMember, insertMember.error, 123324234)

    if (insertMember.error) {
      return NextResponse.json({ message: insertMember.error }, { status: insertMember.status })
    }

    const updateUser = await supabase
      .from('social_login')
      .update({
        member_id: insertMember.data.id,
        user_level: 1,
      })
      .eq('email', social_email)
      .single()

    console.log(updateUser, updateUser.error)
    if (updateUser.error) {
      return NextResponse.json({ message: updateUser.error }, { status: updateUser.status })
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
