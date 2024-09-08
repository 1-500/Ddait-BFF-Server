import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const userId = req.headers.get('X-User-Id')

    const { bookMarkedWorkouts } = await req.json()

    for (const workout of bookMarkedWorkouts) {
      const workoutInfoId = workout.id

      const { data: bookMarkedWorkoutsSearchResult, error: bookMarkedWorkoutsSearchError } = await supabase
        .from('workout_bookmark_list')
        .select('*')
        .eq('member_id', userId)
        .eq('workout_info_id', workoutInfoId)
        .maybeSingle()

      if (bookMarkedWorkoutsSearchError) {
        console.error('북마크 검색 중 오류 발생:', bookMarkedWorkoutsSearchError)
        return NextResponse.json({
          message: bookMarkedWorkoutsSearchError.message,
          status: 500,
        })
      }

      if (bookMarkedWorkoutsSearchResult === null) {
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
    console.error('서버 오류:', error)
    return NextResponse.json({ error: error.message, status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const userId = req.headers.get('X-User-Id')

    if (!userId) {
      return NextResponse.json({ message: '유저 정보를 찾을 수 없습니다.', status: 401 })
    }

    const { data: bookmarkList, error } = await supabase
      .from('workout_bookmark_list')
      .select('workout_info_id')
      .eq('member_id', userId)

    if (error) {
      return NextResponse.json({
        message: `북마크된 운동 목록을 불러오는 중 오류가 발생했습니다: ${error.message}`,
        status: error.code,
      })
    }

    return NextResponse.json({
      message: '북마크된 운동 목록을 성공적으로 불러왔습니다.',
      data: bookmarkList,
      status: 200,
    })
  } catch (error) {
    return NextResponse.json({ message: '서버 에러가 발생했습니다.', status: 500 })
  }
}
