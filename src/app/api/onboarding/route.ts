import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const userId = req.headers.get('X-User-Id')

    const { birthdate, preferredSport, location, gender } = await req.json()
    console.log(birthdate, preferredSport, location, gender)
    if (!birthdate || !preferredSport || !location || !gender) {
      return NextResponse.json(
        {
          status: 400,
          code: 'MISSING_REQUIRED_FIELDS',
          message: '필수 입력 값이 누락되었습니다.',
        },
        { status: 400 },
      )
    }
    const { data, error: insertError } = await supabase.from('member').update({
      birthdate,
      preferred_sport: preferredSport,
      location,
      gender,
      user_level: 2,
    }).eq('id', userId);

    if (insertError) {
    console.log(insertError)
      return NextResponse.json(
        {
          status: 500,
          code: insertError.code || 'DATABASE_INSERT_ERROR',
          message: insertError.message || '회원 정보 저장 중 오류가 발생했습니다.',
        },
        { status: 500 },
      )
    }

    return NextResponse.json(
      {
        status: 200,
        code: 'SUCCESS',
        message: '온보딩 정보가 성공적으로 저장되었습니다.',
      },
      { status: 200 },
    )
  } catch (error) {
    console.log(error)
    return NextResponse.json(
      {
        status: 500,
        code: 'INTERNAL_SERVER_ERROR',
        message: error ? error : '서버 내부 오류가 발생했습니다.',
      },
      { status: 500 },
    )
  }
}
