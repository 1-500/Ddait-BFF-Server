import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const roomId = searchParams.get('roomId')
    const memberId = searchParams.get('memberId')

    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const responseData: any = {
      weight: null,
      rank: null,
      total_score: null,
      score_detail: [],
    }

    const competitionRoom = await supabase.from('competition_room').select('*').eq('id', roomId).single()
    if (competitionRoom.error) {
      return NextResponse.json({ message: competitionRoom.error.message }, { status: competitionRoom.status })
    }

    // weight
    const member = await supabase.from('member').select('weight').eq('id', memberId).single()
    if (member.error) {
      return NextResponse.json({ message: member.error.message }, { status: member.status })
    }

    responseData.weight = member.data.weight

    // total_score
    const competitionRecord = await supabase
      .from('competition_record')
      .select('*')
      .eq('competition_room_id', roomId)
      .eq('member_id', memberId)
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
      const exerciseName = await supabase
        .from('exercise_name')
        .select('*')
        .eq('id', scoreElement.exercise_name_id)
        .single()
      if (exerciseName.error) {
        return NextResponse.json({ message: exerciseName.error.message }, { status: exerciseName.status })
      }

      scoreData.name = exerciseName.data.name

      // score_detail[i].diary
      const workoutDiary = await supabase.from('workout_diary').select('*').eq('member_id', memberId)
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
          const exerciseInfo = await supabase
            .from('exercise_info')
            .select('set, weight, reps')
            .eq('workout_diary_id', diaryElement.id)
            .eq('exercise_name_id', exerciseName.data.id)
          if (exerciseInfo.error) {
            return NextResponse.json({ message: exerciseInfo.error.message }, { status: exerciseInfo.status })
          }

          diaryData.record = (exerciseInfo.data || []).sort((a, b) => a.set - b.set)
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
