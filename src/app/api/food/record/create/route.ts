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

    // 3. food_record_info 테이블에 사용자의 음식 데이터를 기록 , 그리고 해당음식과 food_info_id와 연결
    // 4. food_record 테이블의 food_record_id와 food_record_info id값과 연결
    if (date === null) {
      return NextResponse.json({
        error: '날짜를 입력해주세요',
        status: 400,
      })
    }
    const startOfDay = getStartOfDay(date)
    const endOfDay = getEndOfDay(date)
    // 1. food_diary에서 오늘날짜에 해당되는 diary id값을 가져온다.
    const { data: foodDiarySearchResult, error: foodDiarySearchError } = await supabase
      .from('food_diary')
      .select('*')
      .gte('created_at', startOfDay)
      .lt('created_at', endOfDay)
      .single()

    if (foodDiarySearchError) {
      return NextResponse.json({
        error: foodDiarySearchError.message,
        status: foodDiarySearchError.code,
      })
    }
    const dirayId = foodDiarySearchResult.id

    // food_record_info에 먼저 아이템 생성
    const insertedFoodIdList = []
    for (const food of foodItems) {
      const result = await supabase
        .from('food_record_info')
        .insert({
          carbs: food.carbs,
          protein: food.protein,
          fat: food.fat,
          serving_size: food.serving_size,
          calories: food.calories,
          food_info_id: food.id,
        })
        .select('id')
      if (result.error) {
        return NextResponse.json({
          error: result.error.message,
          status: result.error.code,
        })
      }
      const insertedId = result.data[0].id
      insertedFoodIdList.push(insertedId)
    }

    for (let i = 0; i < insertedFoodIdList.length; i++) {
      const foodRecordInsert = await supabase.from('food_record').insert({
        food_diary_id: dirayId,
        meal_time: meal_time,
        food_record_info_id: insertedFoodIdList[i],
      })
      if (foodRecordInsert.error) {
        return NextResponse.json({
          error: foodRecordInsert.error,
          status: foodRecordInsert.status,
        })
      }
    }

    return NextResponse.json({
      message: '데이터를 삽입 하였습니다!',
      status: 200,
    })
  } catch (error) {
    return NextResponse.json({ error: error })
  }
}

//sdf
