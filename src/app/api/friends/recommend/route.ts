import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/client'

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('X-User-Id')
    const page = Number(req.nextUrl.searchParams.get('page'))
    const size = Number(req.nextUrl.searchParams.get('size'))

    if (!userId) {
      return NextResponse.json(
        {
          status: 400,
          code: 'MISSING_USER_ID',
          message: '사용자 ID가 필요합니다.',
        },
        { status: 400 },
      )
    }

    const supabase = createClient()

    const { data: userPreferenceData, error: preferenceError } = await supabase
      .from('member')
      .select('preferred_sport')
      .eq('id', userId)
      .single()

    if (preferenceError || !userPreferenceData) {
      return NextResponse.json(
        {
          status: 400,
          code: 'PREFERENCE_ERROR',
          message: '사용자의 선호 운동 정보를 가져오는 중 오류가 발생했습니다.',
        },
        { status: 400 },
      )
    }

    const preferredSport = userPreferenceData.preferred_sport

    // 페이지네이션
    const { data: matchingUsers, error: usersError } = await supabase
      .from('member')
      .select('*')
      .eq('preferred_sport', preferredSport)
      .range((page - 1) * size, page * size - 1) // 범위 설정

    if (usersError) {
      return NextResponse.json(
        {
          status: 400,
          code: 'USER_FETCH_ERROR',
          message: '선호 운동이 같은 사용자 목록을 가져오는 중 오류가 발생했습니다.',
        },
        { status: 400 },
      )
    }
    return NextResponse.json(
      {
        status: 200,
        code: 'SUCCESS',
        message: '선호 운동이 같은 사용자 목록 조회에 성공했습니다.',
        data: matchingUsers,
        page,
        size,
      },
      { status: 200 },
    )
  } catch (error: any) {
    return NextResponse.json(
      {
        status: error.status || 500,
        code: error.code || 'INTERNAL_SERVER_ERROR',
        message: error.message || '예상치 못한 오류가 발생했습니다.',
      },
      { status: error.status || 500 },
    )
  }
}
