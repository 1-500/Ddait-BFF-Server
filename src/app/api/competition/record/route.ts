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

    const responseData: any = []

    let competitionRecord
    competitionRecord = await supabase
      .from('competition_record')
      .select('*')
      .eq('competition_room_id', roomId)
      .order('total_score', { ascending: false })

    if (competitionRecord.error) {
      return NextResponse.json({ message: competitionRecord.error.message }, { status: competitionRecord.status })
    }

    for (const recordElement of competitionRecord.data || []) {
      const scoreDetailData = []

      const member = await supabase
        .from('member')
        .select('nickname, profile_image')
        .eq('id', recordElement.member_id)
        .single()
      if (member.error) {
        return NextResponse.json({ message: member.error.message }, { status: member.status })
      }

      const competitionScore = await supabase
        .from('competition_score')
        .select('*')
        .eq('competition_record_id', recordElement.id)
      if (competitionScore.error) {
        return NextResponse.json({ message: competitionScore.error.message }, { status: competitionScore.status })
      }

      for (const scoreElement of competitionScore.data || []) {
        const workoutInfo = await supabase
          .from('workout_info')
          .select('name')
          .eq('id', scoreElement.workout_info_id)
          .single()
        if (workoutInfo.error) {
          return NextResponse.json({ message: workoutInfo.error.message }, { status: workoutInfo.status })
        }

        scoreDetailData.push({
          name: workoutInfo.data.name,
          score: scoreElement.score,
        })
      }

      responseData.push({
        // ...recordElement,
        rank: recordElement.rank,
        total_score: recordElement.total_score,
        is_my_record: recordElement.member_id === userId,
        member_info: member.data,
        score_detail: scoreDetailData.sort((a, b) => a.name.localeCompare(b.name)),
      })
    }

    return NextResponse.json({ data: responseData, status: 200 })
  } catch (error) {
    console.log(error)
    return NextResponse.json({ message: error }, { status: 400 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { competition_room_id } = body

    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const userId = req.headers.get('X-User-Id')

    if (!competition_room_id) {
      // 요청 본문이 없거나 잘못된 경우 처리
      return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 })
    }

    const responseData: any = {
      data: {
        competition_record: null,
        competition_score: {},
      },
      status: 201,
    }

    const competitionRoom = await supabase.from('competition_room').select('*').eq('id', competition_room_id).single()
    if (competitionRoom.error) {
      return NextResponse.json({ message: competitionRoom.error.message }, { status: competitionRoom.status })
    }

    const insertResult = await supabase
      .from('competition_record')
      .insert([
        {
          member_id: userId,
          competition_room_id,
        },
      ])
      .select('id')
      .single()
    if (insertResult.error) {
      console.error('Supabase Insert into competition_record Error:', insertResult.error)
      return NextResponse.json({ message: insertResult.error.message }, { status: insertResult.status })
    }
    responseData.data.competition_record = insertResult

    const competitionRecordId = insertResult.data.id
    if (!competitionRecordId) {
      console.error('No competition record ID found')
      return NextResponse.json({ message: 'Failed to create competition record', status: 400 })
    }

    switch (competitionRoom.data.competition_type) {
      case '웨이트트레이닝':
        switch (competitionRoom.data.competition_theme) {
          case '3대측정내기':
            const deadliftInfo = await supabase.from('workout_info').select('id').eq('name', '데드리프트').single()
            if (deadliftInfo.error) {
              return NextResponse.json({ message: deadliftInfo.error.message }, { status: deadliftInfo.status })
            }

            const deadliftInsertResult = await supabase
              .from('competition_score')
              .insert([
                {
                  competition_record_id: competitionRecordId,
                  workout_info_id: deadliftInfo.data.id,
                },
              ])
              .select('*')
              .single()
            if (deadliftInsertResult.error) {
              console.error('Supabase Insert into competition_score Error:', deadliftInsertResult.error)
              return NextResponse.json(
                { message: deadliftInsertResult.error.message },
                { status: deadliftInsertResult.status },
              )
            }
            responseData.data.competition_score['데드리프트'] = deadliftInsertResult

            const squatInfo = await supabase.from('workout_info').select('id').eq('name', '스쿼트').single()
            if (squatInfo.error) {
              return NextResponse.json({ message: squatInfo.error.message }, { status: squatInfo.status })
            }

            const squatInsertResult = await supabase
              .from('competition_score')
              .insert([
                {
                  competition_record_id: competitionRecordId,
                  workout_info_id: squatInfo.data.id,
                },
              ])
              .select('*')
              .single()
            if (squatInsertResult.error) {
              console.error('Supabase Insert into competition_score Error:', squatInsertResult.error)
              return NextResponse.json(
                { message: squatInsertResult.error.message },
                { status: squatInsertResult.status },
              )
            }
            responseData.data.competition_score['스쿼트'] = squatInsertResult

            const benchpressInfo = await supabase.from('workout_info').select('id').eq('name', '벤치프레스').single()
            if (benchpressInfo.error) {
              return NextResponse.json({ message: benchpressInfo.error.message }, { status: benchpressInfo.status })
            }
            const benchpressInsertResult = await supabase
              .from('competition_score')
              .insert([
                {
                  competition_record_id: competitionRecordId,
                  workout_info_id: benchpressInfo.data.id,
                },
              ])
              .select('*')
              .single()
            if (benchpressInsertResult.error) {
              console.error('Supabase Insert into competition_score Error:', benchpressInsertResult.error)
              return NextResponse.json(
                { message: benchpressInsertResult.error.message },
                { status: benchpressInsertResult.status },
              )
            }
            responseData.data.competition_score['벤치프레스'] = benchpressInsertResult

            break
          default:
        }
      case '러닝':
      case '다이어트':
      default:
    }

    return NextResponse.json(responseData)
  } catch (error) {
    console.error('Error in POST request:', error)
    return NextResponse.json({ message: error || 'Unknown error occurred' }, { status: 400 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { competition_room_id } = body

    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const userId = req.headers.get('X-User-Id')

    if (!body) {
      // 요청 본문이 없거나 잘못된 경우 처리
      return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 })
    }

    const getWorkoutInfoIdByName = async (name: string) => {
      const workoutInfo = await supabase.from('workout_info').select('id').eq('name', name).single()
      if (workoutInfo.error) {
        return NextResponse.json({ message: workoutInfo.error.message }, { status: workoutInfo.status })
      }
      return workoutInfo.data.id
    }

    // 운동 데이터 일지에서 가져오기
    const workoutInfoIdList: any = {}
    const scores: any = {}

    const member = await supabase.from('member').select('weight').eq('id', userId).single()
    if (member.error) {
      return NextResponse.json({ message: member.error.message }, { status: member.status })
    }

    const competitionRoom = await supabase.from('competition_room').select('*').eq('id', competition_room_id).single()
    if (competitionRoom.error) {
      return NextResponse.json({ message: competitionRoom.error.message }, { status: competitionRoom.status })
    }

    const competitionRecord = await supabase
      .from('competition_record')
      .select('*')
      .eq('member_id', userId)
      .eq('competition_room_id', competition_room_id)
      .single()
    if (competitionRecord.error) {
      return NextResponse.json({ message: competitionRecord.error.message }, { status: competitionRecord.status })
    }

    const weight = member.data.weight
    const { competition_type, competition_theme, start_date, end_date } = competitionRoom.data

    switch (competition_type) {
      case '웨이트트레이닝':
        switch (competition_theme) {
          case '3대측정내기':
            workoutInfoIdList['데드리프트'] = await getWorkoutInfoIdByName('데드리프트')
            workoutInfoIdList['스쿼트'] = await getWorkoutInfoIdByName('스쿼트')
            workoutInfoIdList['벤치프레스'] = await getWorkoutInfoIdByName('벤치프레스')
            scores['데드리프트'] = 0
            scores['스쿼트'] = 0
            scores['벤치프레스'] = 0

            const workoutDiary = await supabase.from('workout_diary').select('*').eq('member_id', userId)
            if (workoutDiary.error) {
              return NextResponse.json({ message: workoutDiary.error.message }, { status: workoutDiary.status })
            }

            for (const diaryElement of workoutDiary.data || []) {
              // 날짜 체크하기
              const diaryCreatedAt = new Date(diaryElement.created_at)
              const startDate = new Date(start_date)
              const endDate = new Date(end_date)

              if (diaryCreatedAt >= startDate && diaryCreatedAt <= endDate) {
                for (const key in workoutInfoIdList) {
                  const workoutInfoId = workoutInfoIdList[key]
                  const workoutRecord = await supabase
                    .from('workout_record')
                    .select('*')
                    .eq('workout_diary_id', diaryElement.id)
                    .eq('workout_info_id', workoutInfoId)
                  if (workoutRecord.error) {
                    return NextResponse.json({ message: workoutRecord.error.message }, { status: workoutRecord.status })
                  }

                  let weightPerDate = 0
                  let repsPerDate = 0
                  let scorePerDate = 0

                  for (const workoutRecordElement of workoutRecord.data || []) {
                    weightPerDate += workoutRecordElement.weight * workoutRecordElement.reps
                    repsPerDate += workoutRecordElement.reps
                  }
                  if (repsPerDate === 0) {
                    scorePerDate = 0
                  } else {
                    scorePerDate = ((weightPerDate / repsPerDate) * Math.log(repsPerDate + 1)) / weight
                  }

                  if (key === '스쿼트') {
                    scorePerDate *= 1.2
                  } else if (key === '벤치프레스') {
                    scorePerDate *= 1.4
                  }

                  scorePerDate = Math.round(scorePerDate * 100) / 100
                  scores[key] += scorePerDate
                }
              }
            }
            break
          default:
            break
        }
        break
      case '러닝':
      case '다이어트':
      default:
        break
    }

    for (const key in scores) {
      // competition_score 테이블에서 key 값에 해당하는 점수 score으로 설정
      const updateScoreResult = await supabase
        .from('competition_score')
        .update({ score: scores[key] })
        .eq('workout_info_id', workoutInfoIdList[key])
        .eq('competition_record_id', competitionRecord.data.id)
      if (updateScoreResult.error) {
        console.error('Error updating competition_score:', updateScoreResult.error)
        return NextResponse.json({ message: updateScoreResult.error.message }, { status: updateScoreResult.status })
      }
    }

    // competition_record 테이블에서 score 값 totalScore으로 설정
    const totalScore = Object.values(scores as number[]).reduce((acc: number, cur: number) => acc + cur, 0)
    const updateTotalScoreResult = await supabase
      .from('competition_record')
      .update({ total_score: totalScore })
      .eq('id', competitionRecord.data.id)
    if (updateTotalScoreResult.error) {
      console.error('Error updating competition_record:', updateTotalScoreResult.error)
      return NextResponse.json(
        { message: updateTotalScoreResult.error.message },
        { status: updateTotalScoreResult.status },
      )
    }

    return NextResponse.json({ data: { total_score: totalScore, ...scores }, status: 200 })
  } catch (error) {
    console.error('Error in POST request:', error)
    return NextResponse.json({ message: error || 'Unknown error occurred' }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json()
    const { competition_room_id } = body

    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const userId = req.headers.get('X-User-Id')

    if (!competition_room_id) {
      // 요청 본문이 없거나 잘못된 경우 처리
      return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 })
    }

    if (!userId) {
      return NextResponse.json(
        {
          status: 400,
          message: '유저 ID가 필요합니다.',
        },
        { status: 400 },
      )
    }

    const competitionRecord = await supabase
      .from('competition_record')
      .select('id')
      .eq('competition_room_id', competition_room_id)
      .eq('member_id', userId)
      .single()
    if (competitionRecord.error) {
      return NextResponse.json({ message: competitionRecord.error.message }, { status: competitionRecord.status })
    }

    const res = await supabase.from('competition_record').delete().eq('id', competitionRecord.data.id)
    if (res.error) {
      return NextResponse.json({ message: res.error.message }, { status: res.status })
    }

    return NextResponse.json({ message: 'Data deleted successfully' }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ message: error || '예상치 못한 오류가 발생했습니다.' }, { status: 500 })
  }
}
