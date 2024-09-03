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
    const meal_time = searchParams.get('meal_time')

    const userId = req.headers.get('X-User-Id')

    const dateObj = new Date(date)
    const startOfDay = new Date(dateObj.setHours(0, 0, 0, 0) + 9 * 60 * 60 * 1000).toISOString()
    const endOfDay = new Date(dateObj.setHours(23, 59, 59, 999) + 9 * 60 * 60 * 1000).toISOString()
    const member_food_diary = await supabase
      .from('food_diary')
      .select('*')
      .eq('member_id', userId)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      .single()

    let food_diary_id
    if (member_food_diary.data) {
      const { id } = member_food_diary.data
      food_diary_id = id
    } else {
      return NextResponse.json({
        error: member_food_diary.error?.message,
        status: member_food_diary.status,
      })
    }

    const food_record_list = await supabase
      .from('food_record')
      .select('*')
      .eq('food_diary_id', food_diary_id)
      .eq('meal_time', meal_time)

    const foodRecordInfoList = []
    if (food_record_list.data) {
      for (const food of food_record_list.data) {
        const result = await supabase.from('food_record_info').select('*').eq('id', food.food_record_id).single()
        if (result.error) {
          return NextResponse.json({
            error: result.error?.message,
            status: result.status,
          })
        }
        foodRecordInfoList.push({
          id: result.data.id,
          food_info_id: result.data.food_info_id,
          carbs: result.data.carbs,
          protein: result.data.protein,
          fat: result.data.fat,
          serving_size: result.data.serving_size,
          calories: result.data.calories,
        })
      }
    } else {
      return NextResponse.json({
        error: food_record_list.error?.message,
        status: food_record_list.status,
      })
    }

    let userFoodList = []
    for (const food of foodRecordInfoList) {
      const result = await supabase.from('food_info_list').select('*').eq('id', food.food_info_id).single()
      if (result.error) {
        return NextResponse.json({
          error: result.error?.message,
          status: result.status,
        })
      }
      userFoodList.push({
        id: food.id,
        name: result.data.name,
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
