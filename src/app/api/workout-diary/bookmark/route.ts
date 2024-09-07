import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const userId = req.headers.get('X-User-Id') // 유저 ID를 헤더에서 가져옴

    const { bookMarkedWorkouts } = await req.json() // 북마크한 운동 목록을 요청에서 추출

    for (const workout of bookMarkedWorkouts) {
      // 운동 북마크 검색
      const { data: bookMarkedWorkoutsSearchResult, error: bookMarkedWorkoutsSearchError } = await supabase
        .from('workout_bookmark_list')
        .select('*')
        .eq('member_id', userId)
        .eq('workout_info_id', workout.id)
        .single()

      if (bookMarkedWorkoutsSearchResult === null) {
        // 북마크가 없는 경우, 추가 처리
        if (workout.isBookMarked) {
          const result = await supabase.from('workout_bookmark_list').insert({
            member_id: userId,
            workout_info_id: workout.id,
          })
          if (result.error) {
            return NextResponse.json({
              message: result.error.message,
              status: result.error.code,
            })
          }
        }
      } else {
        // 북마크가 있는 경우, 삭제 처리
        if (!workout.isBookMarked) {
          const result = await supabase
            .from('workout_bookmark_list')
            .delete()
            .eq('id', bookMarkedWorkoutsSearchResult.id)
          if (result.error) {
            return NextResponse.json({
              message: '북마크한 운동 종목을 삭제하는 중 오류가 발생했습니다.',
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
    return NextResponse.json({ error: error.message, status: 500 })
  }
}
