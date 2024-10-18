import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const { email, password } = await req.json()

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      const errorMessage = authError.message.toLowerCase()
      if (errorMessage.includes('invalid login credentials')) {
        return NextResponse.json(
          {
            status: 401,
            code: 'INVALID_CREDENTIALS',
            message: '아이디 또는 비밀번호가 잘못되었습니다.',
          },
          { status: 401 },
        )
      }

      return NextResponse.json(
        {
          status: authError.status || 500,
          code: 'AUTH_ERROR',
          message: authError.message || '로그인 중 오류가 발생했습니다.',
        },
        { status: authError.status || 500 },
      )
    }

    const { data: userData, error: userError } = await supabase
      .from('member')
      .select('id, nickname, profile_image, introduce, user_level')
      .eq('email', email)
      .single()

    if (userError) {
      return NextResponse.json(
        {
          status: 500,
          code: 'USER_FETCH_ERROR',
          message: userError.message || '회원 정보를 가져오는 중 오류가 발생했습니다.',
        },
        { status: 500 },
      )
    }

    return NextResponse.json(
      {
        status: 200,
        code: 'SUCCESS',
        message: '로그인 성공',
        data: {
          user: userData,
          session: authData.session,
        },
      },
      { status: 200 },
    )
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 500,
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || '서버 내부 오류가 발생했습니다.',
      },
      { status: 500 },
    )
  }
}
