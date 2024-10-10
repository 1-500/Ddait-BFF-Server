import { NextResponse, NextRequest } from 'next/server'
import bcrypt from 'bcrypt'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const { email, password, nickname, birthdate, gender, location, preferred_sport } = await req.json()

    if (!email || !password || !nickname) {
      return NextResponse.json(
        {
          status: 400,
          code: 'MISSING_REQUIRED_FIELDS',
          message: '필수 입력 값이 누락되었습니다.',
          details: null,
        },
        { status: 400 },
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const { data, error: insertError } = await supabase.from('member').insert({
      nickname,
      email,
      password: hashedPassword,
      user_level: 1,
    })

    if (insertError) {
      return NextResponse.json(
        {
          status: 500,
          code: insertError.code || 'INSERT_ERROR',
          message: insertError.message || '회원 정보 저장 중 오류가 발생했습니다.',
          details: insertError.hint || null, 
        },
        { status: 500 },
      )
    }

    // Supabase auth 가입 처리
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (signUpError) {
      return NextResponse.json(
        {
          status: 500,
          code: 'SIGNUP_ERROR',
          message: signUpError.message || '회원가입 처리 중 오류가 발생했습니다.',
          details: null,
        },
        { status: 500 },
      )
    }

    return NextResponse.json(
      {
        status: 200,
        code: 'SUCCESS',
        message: '계정이 성공적으로 생성되었습니다.',
        details: null,
      },
      { status: 200 },
    )
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 500,
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || '서버 내부 오류가 발생했습니다.',
        details: error.stack || null,
      },
      { status: 500 },
    )
  }
}
