import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { getCurrentKoreanTime } from '@/utils/shared/date'

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
    // 1. 해당 유저의  생성된 date에 맞는 foodDiary를 찾는다.
    const { data: foodDirayResult } = await supabase
      .from('food_diary')
      .select('*')
      .eq('member_id', userId)
      .eq('date', date)
      .single()

    if (foodDirayResult === null) {
      return NextResponse.json({
        message: '데이터가 존재하지 않습니다',
        status: 200,
      })
    }
    const food_diray_Id = foodDirayResult.id
    // 해당 유저가 식사시간대에 기록한 food_record가 있는지 확인한다.
    const { data: foodRecordResult } = await supabase
      .from('food_record')
      .select('*')
      .eq('food_diary_id', food_diray_Id)
      .eq('meal_time', meal_time)
      .single()

    // 없다면 food_record에 해당식사시간대 데이터 생성
    if (foodRecordResult === null) {
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
          status: 500,
        })
      }
      const food_record_id = foodRecordInsertResult.id
      for (const food of foodItems) {
        const result = await supabase
          .from('food_record_info')
          .insert({
            carbs: food.carbs,
            protein: food.protein,
            fat: food.fat,
            serving_size: food.amount,
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
      const food_record_id = foodRecordResult.id
      const { error: foodRecordUpdateError } = await supabase
        .from('food_record')
        .update({
          edited_at: getCurrentKoreanTime(),
        })
        .eq('id', food_record_id)

      if (foodRecordUpdateError) {
        return NextResponse.json({
          error: foodRecordUpdateError.message,
          status: 500,
        })
      }

      const { data: foodRecordInfoResult, error: foodRecordInfoError } = await supabase
        .from('food_record_info')
        .select('*')
        .eq('food_record_id', food_record_id)

      if (foodRecordInfoError) {
        return NextResponse.json({
          error: foodRecordInfoError.message,
          status: 500,
        })
      }

      for (const food of foodRecordInfoResult) {
        const foundItem = foodItems.find((item) => item.id === food.id)
        if (!foundItem) {
          const { error } = await supabase.from('food_record_info').delete().eq('id', food.id)
          if (error) {
            return NextResponse.json({
              message: error.message,
              status: 500,
            })
          }
        }
      }

      for (const food of foodItems) {
        const foundItem = foodRecordInfoResult.find((item) => item.id === food.id)
        if (!foundItem) {
          const { error } = await supabase.from('food_record_info').insert({
            carbs: food.carbs,
            protein: food.protein,
            fat: food.fat,
            serving_size: food.amount,
            calories: food.calories,
            food_info_id: food.id,
            food_record_id: food_record_id,
          })
          if (error) {
            return NextResponse.json({
              message: error.message,
              status: 500,
            })
          }
        }
      }
      return NextResponse.json({
        food_record_id,
        message: '식단 일지에 기록 하였습니다!',
        status: 200,
      })
    }
  } catch (error) {
    return NextResponse.json({ error: error })
  }
}
