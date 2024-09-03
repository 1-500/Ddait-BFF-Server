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

    const competitionRoom = await supabase.from('competition_room').select('*').eq('id', roomId).single()
    if (competitionRoom.error) {
      return NextResponse.json({ message: competitionRoom.error.message }, { status: competitionRoom.status })
    }

    // member_info
    const member = await supabase.from('member').select('nickname, profile_image, weight').eq('id', userId).single()
    if (member.error) {
      return NextResponse.json({ message: member.error.message }, { status: member.status })
    }

    responseData.member_info = member.data

    // total_score
    const competitionRecord = await supabase
      .from('competition_record')
      .select('*')
      .eq('competition_room_id', roomId)
      .eq('member_id', userId)
      .single()
    if (competitionRecord.error) {
      return NextResponse.json({ message: competitionRecord.error.message }, { status: competitionRecord.status })
    }

    responseData.rank = competitionRecord.data.rank
    responseData.total_score = competitionRecord.data.total_score

    // score_detail
    const competitionScore = await supabase
      .from('competition_score')
      .select('*')
      .eq('competition_record_id', competitionRecord.data.id)
    if (competitionScore.error) {
      return NextResponse.json({ message: competitionScore.error.message }, { status: competitionScore.status })
    }

    for (const scoreElement of competitionScore.data || []) {
      const scoreData: any = {
        name: null,
        score: scoreElement.score,
        diary: [],
      }

      // score_detail[i].name
      const workoutInfo = await supabase
        .from('workout_info')
        .select('*')
        .eq('id', scoreElement.workout_info_id)
        .single()
      if (workoutInfo.error) {
        return NextResponse.json({ message: workoutInfo.error.message }, { status: workoutInfo.status })
      }

      scoreData.name = workoutInfo.data.name

      // score_detail[i].diary
      const workoutDiary = await supabase.from('workout_diary').select('*').eq('member_id', userId)
      if (workoutDiary.error) {
        return NextResponse.json({ message: workoutDiary.error.message }, { status: workoutDiary.status })
      }

      for (const diaryElement of (workoutDiary.data || []).sort((a, b) => a.created_at - b.created_at)) {
        const startDate = new Date(competitionRoom.data.start_date)
        const endDate = new Date(competitionRoom.data.end_date)

        const diaryData: any = {
          created_at: new Date(diaryElement.created_at),
          record: null,
        }

        if (diaryData.created_at >= startDate && diaryData.created_at <= endDate) {
          const workoutRecord = await supabase
            .from('workout_record')
            .select('set, weight, reps')
            .eq('workout_diary_id', diaryElement.id)
            .eq('workout_info_id', workoutInfo.data.id)
          if (workoutRecord.error) {
            return NextResponse.json({ message: workoutRecord.error.message }, { status: workoutRecord.status })
          }

          diaryData.record = (workoutRecord.data || []).sort((a, b) => a.set - b.set)
          if (diaryData.record.length > 0) {
            scoreData.diary.push(diaryData)
          }
        }
      }

      responseData.score_detail.push(scoreData)
    }

    return NextResponse.json({ data: responseData, status: 200 })
  } catch (error) {
    console.log(error)
    return NextResponse.json({ message: error }, { status: 400 })
  }
}
