import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { getEndOfDay, getStartOfDay } from '@/utils/shared/date'

// 사용자가 보내준 날짜와 식사시간 기준으로 조회
export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date')
    const mealTime = searchParams.get('meal_time')

    if (date === null) {
      return NextResponse.json({
        error: '날짜를 입력해주세요',
        status: 400,
      })
    }

    const userId = req.headers.get('X-User-Id')
    const startOfDay = getStartOfDay(date)
    const endOfDay = getEndOfDay(date)

    const memberFoodDiary = await supabase
      .from('food_diary')
      .select('*')
      .eq('member_id', userId)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      .single()

    let food_diary_id
    if (memberFoodDiary.data) {
      const { id } = memberFoodDiary.data
      food_diary_id = id
    } else {
      return NextResponse.json({
        data: [],
        status: 200,
      })
    }

    const { data: foodRecordResult, error: foodRecordError } = await supabase
      .from('food_record')
      .select('*')
      .eq('food_diary_id', food_diary_id)
      .eq('meal_time', mealTime)
      .single()

    const food_record_id = foodRecordResult.id

    if (foodRecordError) {
      return NextResponse.json({
        error: foodRecordError.message,
        status: foodRecordError.code,
      })
    }
    const { data: foodRecordInfoResult, error: foodRecordInfoError } = await supabase
      .from('food_record_info')
      .select('*')
      .eq('food_record_id', food_record_id)

    if (foodRecordInfoResult === null) {
      return NextResponse.json({
        error: '데이터 조회를 실패하였습니다',
        status: 400,
      })
    }
    const userFoodList = []
    for (const food of foodRecordInfoResult) {
      const { data: foodInfoResult, error: foodInfoResultError } = await supabase
        .from('food_info')
        .select('*')
        .eq('id', food.food_info_id)
        .single()

      if (foodInfoResultError) {
        return NextResponse.json({
          error: foodInfoResultError.message,
          status: foodInfoResultError.code,
        })
      }
      userFoodList.push({
        id: food.id,
        name: foodInfoResult.name,
        carbs: food.carbs,
        protein: food.protein,
        fat: food.fat,
        serving_size: food.serving_size,
        calories: food.calories,
      })
    }

    return NextResponse.json({
      data: userFoodList,
      message: '데이터를 정상적으로 조회하였습니다!',
      status: 200,
    })
  } catch (error) {
    return NextResponse.json({ error: error.message })
  }
}
