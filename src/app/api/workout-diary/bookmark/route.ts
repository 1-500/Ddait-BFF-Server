import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const userId = req.headers.get('X-User-Id') // 유저 ID를 헤더에서 가져옴

    const { bookMarkedWorkouts } = await req.json() // 클라이언트에서 받은 북마크한 운동 목록 (name 기반)

    for (const workout of bookMarkedWorkouts) {
      // 운동 종목 이름을 기반으로 workout_info 테이블에서 UUID 조회
      const { data: workoutInfo, error: workoutInfoError } = await supabase
        .from('workout_info')
        .select('id')
        .eq('name', workout.name)
        .single()

      if (workoutInfoError || !workoutInfo) {
        // 운동 종목을 찾지 못하면 에러 반환
        return NextResponse.json({
          message: '해당 이름의 운동 종목을 찾을 수 없습니다.',
          status: 404,
        })
      }

      const workoutInfoId = workoutInfo.id // 찾은 workout_info_id

      // 2. 운동 북마크 검색
      const { data: bookMarkedWorkoutsSearchResult, error: bookMarkedWorkoutsSearchError } = await supabase
        .from('workout_bookmark_list')
        .select('*')
        .eq('member_id', userId)
        .eq('workout_info_id', workoutInfoId)
        .single()

      if (bookMarkedWorkoutsSearchResult === null) {
        // 3. 북마크가 없는 경우, 추가 처리
        if (workout.isBookMarked) {
          const result = await supabase.from('workout_bookmark_list').insert({
            member_id: userId,
            workout_info_id: workoutInfoId,
          })
          if (result.error) {
            return NextResponse.json({
              message: result.error.message,
              status: result.error.code,
            })
          }
        }
      } else {
        // 4. 북마크가 있는 경우, 삭제 처리
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
