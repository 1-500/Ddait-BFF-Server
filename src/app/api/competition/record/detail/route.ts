import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const roomId = searchParams.get('roomId')

    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const userId = req.headers.get('X-User-Id')

    if (!roomId) {
      return NextResponse.json({ message: 'Invalid Request Params' }, { status: 400 })
    }

    const responseData: any = {
      rank: null,
      total_score: null,
      member_info: {},
      score_detail: [],
    }

    const competitionData = await supabase
      .from('competition_record')
      .select(
        `
        id, rank, total_score,
        member: member(nickname, profile_image, weight),
        competition_room: competition_room(start_date, end_date)
      `,
      )
      .eq('member_id', userId)
      .eq('competition_room_id', roomId)
      .single()

    if (competitionData.error) {
      return NextResponse.json({ message: competitionData.error.message }, { status: competitionData.status })
    }

    responseData.member_info = competitionData.data.member
    responseData.rank = competitionData.data.rank
    responseData.total_score = competitionData.data.total_score

    // score_detail
    const competitionScore = await supabase
      .from('competition_score')
      .select(
        `
        score,
        workout_info(name)
      `,
      )
      .eq('competition_record_id', competitionData.data.id)
    if (competitionScore.error) {
      return NextResponse.json(
        { message: `competitionScore error: ${competitionScore.error.message}` },
        { status: competitionScore.status },
      )
    }

    const workoutDiary = await supabase
      .from('workout_diary')
      .select(
        `
          id, created_at, title,
          workout_record(
            set, weight, reps,
            workout_info(name)
          )
        `,
      )
      .eq('member_id', userId)
      .gte('created_at', competitionData.data.competition_room.start_date) // start_date 이상
      .lte('created_at', competitionData.data.competition_room.end_date) // end_date 이하
      .order('created_at', { ascending: true })
    if (workoutDiary.error) {
      return NextResponse.json({ message: workoutDiary.error.message }, { status: workoutDiary.status })
    }

    for (const scoreElement of competitionScore.data || []) {
      console.log(scoreElement.workout_info.name)
      const scoreDetail: any = {
        name: scoreElement.workout_info.name,
        score: scoreElement.score,
        diary: [],
      }

      for (const diaryElement of workoutDiary.data || []) {
        const filteredRecord = diaryElement.workout_record
          .filter((element) => element.workout_info.name === scoreElement.workout_info.name)
          .sort((a, b) => a.set - b.set)
          .map(({ workout_info, ...rest }) => rest)

        if (filteredRecord.length > 0) {
          scoreDetail.diary.push({
            title: diaryElement.title,
            created_at: new Date(diaryElement.created_at),
            record: filteredRecord,
          })
        }
      }

      responseData.score_detail.push(scoreDetail)
    }

    return NextResponse.json({ data: responseData, status: 200 })
  } catch (error) {
    console.log(error)
    return NextResponse.json({ message: error }, { status: 400 })
  }
}
