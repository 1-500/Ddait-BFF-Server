import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const userId = req.headers.get('X-User-Id')

    const { bookMarkedFoods } = await req.json()

    for (const food of bookMarkedFoods) {
      const { data: bookMarkedFoodsSearchResult, error: bookMarkedFoodsSearchError } = await supabase
        .from('food_bookmark_list')
        .select('*')
        .eq('member_id', userId)
        .eq('food_info_id', food.id)
        .single()
      if (bookMarkedFoodsSearchResult === null) {
        if (food.isBookMarked) {
          //음식이 체크되어있으면
          const result = await supabase.from('food_bookmark_list').insert({
            member_id: userId,
            food_info_id: food.id,
          })
          if (result.error) {
            return NextResponse.json({
              message: result.error.message,
              status: result.error.code,
            })
          }
        }
      } else {
        // 북마크한 경우
        if (!food.isBookMarked) {
          const result = await supabase.from('food_bookmark_list').delete().eq('id', bookMarkedFoodsSearchResult.id)
          if (result.error) {
            return NextResponse.json({
              message: '북마크한 음식을 삭제하였습니다.',
              status: result.error.code,
            })
          }
        }
      }
    }

    return NextResponse.json({
      message: 'DB에 정상적으로 반영되었습니다!',
      status: 200,
    })
  } catch (error) {
    return NextResponse.json({ error: error })
  }
}
