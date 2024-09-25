import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const userId = req.headers.get('X-User-Id')

    const result = await supabase.from('food_bookmark_list').select('*').eq('member_id', userId)

    if (result.error || result.data.length === 0) {
      return NextResponse.json({
        message: '데이터가 존재하지 않습니다',
        status: result.status.toFixed(),
      })
    }
    const foodBookMarkList = []
    for (const food of result.data) {
      const result = await supabase.from('food_info').select('*').eq('id', food.food_info_id).single()
      if (result.error || result.count === 0) {
        return NextResponse.json({
          message: '데이터가 존재하지 않습니다',
          status: result.status.toFixed(),
        })
      }
      foodBookMarkList.push(result.data)
    }
    return NextResponse.json({
      data: foodBookMarkList,
      message: '데이터를 정상적으로 조회하였습니다!',
      status: 200,
    })
  } catch (error) {
    return NextResponse.json({ error: error.message })
  }
}
