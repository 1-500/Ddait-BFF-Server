import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const userId = req.headers.get('X-User-Id')

    const searchParams = new URL(req.url).searchParams
    const searchTerm = searchParams.get('q') || ''

    console.log('검색어:', searchTerm)

    // 사용자 ID 검증
    if (!userId) {
      return NextResponse.json({ message: '사용자 ID가 필요합니다.', status: 401 })
    }

    // 1차 검색: 이름에서 검색
    let { data: workoutInfos = [], error: workoutInfoError } = await supabase
      .from('workout_info')
      .select('*')
      .ilike('name', `%${searchTerm}%`)

    // 오류가 발생하면 즉시 반환
    if (workoutInfoError) {
      return NextResponse.json({
        message: '운동 목록을 조회하는 중 오류가 발생했습니다.',
        error: workoutInfoError,
        status: 500,
      })
    }

    // 이름에서 검색 결과가 없을 경우 설명에서 검색
    if (workoutInfos?.length === 0) {
      console.log('이름에서 검색 결과 없음, 설명에서 검색 중...')
      const { data: descriptionMatches = [], error: descriptionError } = await supabase
        .from('workout_info')
        .select('*')
        .ilike('description', `%${searchTerm}%`)

      // 설명에서 검색된 결과를 할당
      workoutInfos = descriptionMatches

      // 설명에서도 오류가 발생했을 경우 처리
      if (descriptionError) {
        return NextResponse.json({
          message: '운동 목록을 조회하는 중 오류가 발생했습니다.',
          error: descriptionError,
          status: 500,
        })
      }
    }

    console.log('찾은 운동 정보:', workoutInfos)

    // workoutInfos가 비어있는 경우 빈 배열로 처리
    if (!workoutInfos || workoutInfos.length === 0) {
      return NextResponse.json({
        data: [],
        message: '검색 결과가 없습니다.',
        status: 200,
      })
    }

    // workout_info의 ID 배열 추출
    const workoutInfoIds = workoutInfos.map((workout) => workout.id)

    // 북마크 정보 조회
    const { data: bookmarks = [], error: bookmarkError } = await supabase
      .from('workout_bookmark_list')
      .select('workout_info_id')
      .eq('member_id', userId)
      .in('workout_info_id', workoutInfoIds)

    if (bookmarkError) {
      return NextResponse.json({
        message: '북마크 정보를 조회하는 중 오류가 발생했습니다.',
        error: bookmarkError,
        status: 500,
      })
    }

    console.log('찾은 북마크 정보:', bookmarks)

    // 북마크된 운동 목록의 ID들 추출
    const bookmarkedWorkoutIds = bookmarks?.map((bookmark) => bookmark.workout_info_id)

    // 운동 목록에 북마크 여부 추가
    const workoutListWithBookmarks = workoutInfos.map((workout) => ({
      ...workout,
      isBookmarked: bookmarkedWorkoutIds?.includes(workout.id),
    }))

    return NextResponse.json({
      data: workoutListWithBookmarks,
      message: '운동 목록을 성공적으로 불러왔습니다.',
      status: 200,
    })
  } catch (error) {
    console.error('서버 오류:', error)
    return NextResponse.json({ error: error.message, status: 500 })
  }
}
