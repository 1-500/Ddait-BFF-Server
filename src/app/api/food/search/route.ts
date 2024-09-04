import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

export async function GET(req: NextRequest) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  const { searchParams } = new URL(req.url)
  const term = searchParams.get('term')?.trim()

  try {
    if (!term) {
      return NextResponse.json({
        data: [],
        message: '검색어가 비어 있습니다. 빈 배열을 반환합니다.',
        status: 200,
      })
    }

    const { data: foodInfoList, error: foodInfoListError } = await supabase
      .from('food_info_list')
      .select('*')
      .ilike('name', `${term}%`)

    if (foodInfoListError) {
      return NextResponse.json({
        message: foodInfoListError.message,
        status: foodInfoListError.code || 500, // 기본 에러 코드 설정
      })
    }

    return NextResponse.json({
      data: foodInfoList,
      message: '데이터를 정상적으로 조회하였습니다!',
      status: 200,
    })
  } catch (error) {
    return NextResponse.json({
      message: '서버에서 오류가 발생했습니다.',
      error: error.message,
      status: 500,
    })
  }
}
