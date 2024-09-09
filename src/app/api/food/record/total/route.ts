import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

// 사용자가 보내준 날짜와 식사시간 기준으로 조회
export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date')

    if (date === null) {
      return NextResponse.json({
        error: '날짜를 입력해주세요',
        status: 400,
      })
    }

    const userId = req.headers.get('X-User-Id')

    const memberFoodDiary = await supabase
      .from('food_diary')
      .select('*')
      .eq('member_id', userId)
      .eq('date', date)
      .single()

    let food_diary_id
    if (memberFoodDiary.data) {
      const { id } = memberFoodDiary.data
      food_diary_id = id
    } else {
      return NextResponse.json({
        data: '식단일지 데이터가 생성되지 않았습니다',
        status: 200,
      })
    }

    const { data: foodRecordResult } = await supabase.from('food_record').select('*').eq('food_diary_id', food_diary_id)

    if (!foodRecordResult?.length) {
      return NextResponse.json({
        data: [],
        message: '데이터가 존재하지 않습니다',
        status: 200,
      })
    }

    const data: Record<
      '아침' | '점심' | '저녁',
      {
        totalCalories: number
        totalCarbs: number
        totalProtein: number
        totalFat: number
      }
    > = {
      아침: {
        totalCalories: 0,
        totalCarbs: 0,
        totalProtein: 0,
        totalFat: 0,
      },
      점심: {
        totalCalories: 0,
        totalCarbs: 0,
        totalProtein: 0,
        totalFat: 0,
      },
      저녁: {
        totalCalories: 0,
        totalCarbs: 0,
        totalProtein: 0,
        totalFat: 0,
      },
    }
    for (const foodRecord of foodRecordResult) {
      const { data: foodRecordInfoResult } = await supabase
        .from('food_record_info')
        .select('*')
        .eq('food_record_id', foodRecord.id)
      if (foodRecordInfoResult) {
        let [totalCalories, totalCarbs, totalProtein, totalFat] = [0, 0, 0, 0]
        for (const foodRecordInfo of foodRecordInfoResult) {
          totalCalories += foodRecordInfo.calories
          totalCarbs += foodRecordInfo.carbs
          totalProtein += foodRecordInfo.protein
          totalFat += foodRecordInfo.fat
        }
        const mealTime = foodRecord.meal_time as '아침' | '점심' | '저녁'
        data[mealTime].totalCalories = totalCalories
        data[mealTime].totalCarbs = totalCarbs
        data[mealTime].totalProtein = totalProtein
        data[mealTime].totalFat = totalFat
      }
    }

    return NextResponse.json({
      data,
      message: '데이터를 정상적으로 조회하였습니다!',
      status: 200,
    })
  } catch (error) {
    return NextResponse.json({ error: error.message })
  }
}
