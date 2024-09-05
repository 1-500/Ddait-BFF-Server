import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { getEndOfDay, getStartOfDay } from '@/utils/shared/date'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const { searchParams } = new URL(req.url)
    const userId = req.headers.get('X-User-Id')

    const { foodItems, meal_time, date } = await req.json()

    console.log(foodItems, meal_time, date)

    // 1. food_diary에서 오늘날짜에 해당되는 id값을 가져온다.
    // 2. food_record 테이블에 row을 생성 이떄 food_diary의 id값과 연결 , meal_time필요
    // 3. food_record_info 테이블에 사용자의 음식 데이터를 기록 , 그리고 해당음식과 food_info_id와 연결
    // 4. food_record 테이블의 food_record_id와 food_record_info id값과 연결
    if (date === null) {
      return NextResponse.json({
        error: '날짜를 입력해주세요',
        status: 400,
      })
    }

    return NextResponse.json({
      message: '데이터를 삽입 하였습니다!',
      status: 200,
    })
  } catch (error) {
    return NextResponse.json({ message: error })
  }
}

//sdf
