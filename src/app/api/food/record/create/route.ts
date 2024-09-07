import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { getEndOfDay, getStartOfDay } from '@/utils/shared/date'
import { error } from 'console'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const userId = req.headers.get('X-User-Id')

    const { foodItems, meal_time, date } = await req.json()

    if (date === null) {
      return NextResponse.json({
        error: '날짜를 입력해주세요',
        status: 400,
      })
    }
    const startOfDay = getStartOfDay(date)
    const endOfDay = getEndOfDay(date)
    // 1. 해당 유저의 오늘 생성된 foodDiary를 찾는다.
    const { data: foodDiarySearchResult, error: foodDiarySearchError } = await supabase
      .from('food_diary')
      .select('*')
      .eq('member_id', userId)
      .gte('edited_at', startOfDay)
      .lt('edited_at', endOfDay)
      .single()
    if (foodDiarySearchError) {
      return NextResponse.json({
        error: foodDiarySearchError.message,
        status: foodDiarySearchError.code,
      })
    }
    const food_diray_Id = foodDiarySearchResult.id
    // 해당 유저가 식사시간대에 기록한 food_record가 있는지 확인한다.
    const { data: foodRecordSearchResult, error: foodRecordSearchResultError } = await supabase
      .from('food_record')
      .select('*')
      .eq('food_diary_id', food_diray_Id)
      .eq('meal_time', meal_time)

    if (foodRecordSearchResultError) {
      return NextResponse.json({
        error: foodRecordSearchResultError.message,
        status: foodRecordSearchResultError.code,
      })
    }
    // 없다면 food_record에 해당식사시간대 데이터 생성
    if (!foodRecordSearchResult.length) {
      const { data: foodRecordInsertResult, error: foodRecordInsertResultError } = await supabase
        .from('food_record')
        .insert({
          food_diary_id: food_diray_Id,
          meal_time: meal_time,
        })
        .select('*')
        .single()
      if (foodRecordInsertResultError) {
        return NextResponse.json({
          error: foodRecordInsertResultError.message,
          status: foodRecordInsertResultError.code,
        })
      }
      const food_record_id = foodRecordInsertResult.id
      // food_record_info에 음식 데이터 삽입
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
            food_record_id: food_record_id,
          })
          .select('id')
        if (result.error) {
          return NextResponse.json({
            error: result.error.message,
            status: result.error.code,
          })
        }
      }
    } else {
      //이미 기록한게 존재한다면 데이터 추가삽입
      const food_record_id = foodRecordSearchResult[0].id
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
            food_record_id: food_record_id,
          })
          .select('id')
        if (result.error) {
          return NextResponse.json({
            error: result.error.message,
            status: result.error.code,
          })
        }
      }
    }
    return NextResponse.json({
      message: '식단 일지에 기록 하였습니다!',
      status: 200,
    })
  } catch (error) {
    return NextResponse.json({ error: error })
  }
}

//sdf
