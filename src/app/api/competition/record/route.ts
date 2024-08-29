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

    const responseData: any = []

    let competitionRecord
    if (roomId) {
      if (memberId) {
        competitionRecord = await supabase
          .from('competition_record')
          .select('*')
          .eq('competition_room_id', roomId)
          .eq('member_id', memberId)
      } else {
        competitionRecord = await supabase.from('competition_record').select('*').eq('competition_room_id', roomId)
      }
    } else {
      competitionRecord = await supabase.from('competition_record').select('*')
    }

    if (competitionRecord.error) {
      return NextResponse.json({ message: competitionRecord.error.message }, { status: competitionRecord.status })
    }

    for (const recordElement of (competitionRecord.data || []).sort((a, b) => {
      if (roomId) {
        return b.total_score - a.total_score
      } else {
        if (a.competition_room_id === b.competition_room_id) {
          return b.total_score - a.total_score
        } else {
          return a.competition_room_id - b.competition_room_id
        }
      }
    })) {
      const scoreDetailData = []

      const competitionScore = await supabase
        .from('competition_score')
        .select('*')
        .eq('competition_record_id', recordElement.id)
      if (competitionScore.error) {
        return NextResponse.json({ message: competitionScore.error.message }, { status: competitionScore.status })
      }

      for (const scoreElement of (competitionScore.data || []).sort(
        (a, b) => a.exercise_name_id - b.exercise_name_id,
      )) {
        const exerciseName = await supabase
          .from('exercise_name')
          .select('name')
          .eq('id', scoreElement.exercise_name_id)
          .single()
        if (exerciseName.error) {
          return NextResponse.json({ message: exerciseName.error.message }, { status: exerciseName.status })
        }

        scoreDetailData.push({
          name: exerciseName.data.name,
          score: scoreElement.score,
        })
      }

      responseData.push({
        ...recordElement,
        score_detail: scoreDetailData,
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
    const { member_id, competition_room_id } = body

    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    if (!body) {
      // 요청 본문이 없거나 잘못된 경우 처리
      return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 })
    }
    const competitionRoom = await supabase.from('competition_room').select('*').eq('id', competition_room_id).single()
    if (competitionRoom.error) {
      return NextResponse.json({ message: competitionRoom.error.message }, { status: competitionRoom.status })
    }

    const insertResult = await supabase
      .from('competition_record')
      .insert([
        {
          member_id,
          competition_room_id,
        },
      ])
      .select('id')
      .single()
    if (insertResult.error) {
      console.error('Supabase Insert into competition_record Error:', insertResult.error)
      return NextResponse.json({ message: insertResult.error.message }, { status: insertResult.status })
    }

    const competitionRecordId = insertResult.data.id
    if (!competitionRecordId) {
      console.error('No competition record ID found')
      return NextResponse.json({ message: 'Failed to create competition record', status: 400 })
    }

    switch (competitionRoom.data.competition_type) {
      case '웨이트트레이닝':
        switch (competitionRoom.data.competition_theme) {
          case '3대측정내기':
            const deadliftInsertResult = await supabase.from('competition_score').insert([
              {
                competition_record_id: competitionRecordId,
                exercise_name_id: 1,
              },
            ])
            if (deadliftInsertResult.error) {
              console.error('Supabase Insert into competition_score Error:', deadliftInsertResult.error)
              return NextResponse.json(
                { message: deadliftInsertResult.error.message },
                { status: deadliftInsertResult.status },
              )
            }

            const squatInsertResult = await supabase.from('competition_score').insert([
              {
                competition_record_id: competitionRecordId,
                exercise_name_id: 2,
              },
            ])
            if (squatInsertResult.error) {
              console.error('Supabase Insert into competition_score Error:', squatInsertResult.error)
              return NextResponse.json(
                { message: squatInsertResult.error.message },
                { status: squatInsertResult.status },
              )
            }

            const benchpressInsertResult = await supabase.from('competition_score').insert([
              {
                competition_record_id: competitionRecordId,
                exercise_name_id: 3,
              },
            ])
            if (benchpressInsertResult.error) {
              console.error('Supabase Insert into competition_score Error:', benchpressInsertResult.error)
              return NextResponse.json(
                { message: benchpressInsertResult.error.message },
                { status: benchpressInsertResult.status },
              )
            }

            break
          default:
        }
      case '러닝':
      case '다이어트':
      default:
    }

    return NextResponse.json({ data: insertResult, status: 201 })
  } catch (error) {
    console.error('Error in POST request:', error)
    return NextResponse.json({ message: error || 'Unknown error occurred' }, { status: 400 })
  }
}

export async function PATCH(req: NextRequest) {
  function getExerciseIdByName(name: string): number {
    switch (name) {
      case '데드리프트':
        return 1
      case '벤치프레스':
        return 2
      case '스쿼트':
        return 3
      default:
        throw new Error(`Unknown exercise name: ${name}`)
    }
  }

  try {
    const body = await req.json()
    const { member_id, competition_room_id } = body

    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    if (!body) {
      // 요청 본문이 없거나 잘못된 경우 처리
      return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 })
    }

    // 운동 데이터 일지에서 가져오기
    const results: any = {}
    const scores: any = {}

    const member = await supabase.from('member').select('weight').eq('id', member_id).single()
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
      .eq('member_id', member_id)
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
            results['데드리프트'] = []
            results['스쿼트'] = []
            results['벤치프레스'] = []
            scores['데드리프트'] = 0
            scores['스쿼트'] = 0
            scores['벤치프레스'] = 0

            const workoutDiary = await supabase.from('workout_diary').select('*').eq('member_id', member_id)
            if (workoutDiary.error) {
              return NextResponse.json({ message: workoutDiary.error.message }, { status: workoutDiary.status })
            }

            for (const diaryElement of workoutDiary.data || []) {
              // 날짜 체크하기
              const diaryCreatedAt = new Date(diaryElement.created_at)
              const startDate = new Date(start_date)
              const endDate = new Date(end_date)

              if (diaryCreatedAt >= startDate && diaryCreatedAt <= endDate) {
                const resultData: any = {
                  created_at: diaryCreatedAt,
                  exercise_info: {
                    데드리프트: [],
                    스쿼트: [],
                    벤치프레스: [],
                  },
                }

                const exerciseInfo = await supabase
                  .from('exercise_info')
                  .select('*')
                  .eq('workout_diary_id', diaryElement.id)
                if (exerciseInfo.error) {
                  return NextResponse.json({ message: exerciseInfo.error.message }, { status: exerciseInfo.status })
                }

                for (const exerciseElement of exerciseInfo.data || []) {
                  const exerciseName = await supabase
                    .from('exercise_name')
                    .select('*')
                    .eq('id', exerciseElement.exercise_name_id)
                    .single()
                  if (exerciseName.error) {
                    return NextResponse.json({ message: exerciseName.error.message }, { status: exerciseName.status })
                  }

                  if (exerciseName.data) {
                    switch (exerciseName.data.name) {
                      case '데드리프트':
                      case '스쿼트':
                      case '벤치프레스':
                        resultData.exercise_info[exerciseName.data.name].push(exerciseElement)
                        break
                      default:
                        break
                    }
                  }
                }
                for (const key in results) {
                  if (resultData.exercise_info[key].length > 0) {
                    results[key].push({
                      created_at: resultData.created_at,
                      exercise_info: resultData.exercise_info[key],
                    })
                  }
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

    // 점수 계산 후 저장
    for (const key in results) {
      const value = results[key as keyof typeof results]
      if (value.length === 0) {
        // competition_score 테이블에서 key 값에 해당하는 점수 0으로 설정
        const updateZeroResult = await supabase
          .from('competition_score')
          .update({ score: 0 })
          .eq('exercise_name_id', getExerciseIdByName(key))
          .eq('competition_record_id', competitionRecord.data.id)
        if (updateZeroResult.error) {
          console.error('Error updating competition_score with zero:', updateZeroResult.error)
          return NextResponse.json({ message: updateZeroResult.error.message }, { status: updateZeroResult.status })
        }

        continue
      }

      // 날짜별 점수 계산 후 합
      let score = 0
      for (const diaryElement of value) {
        let totalWeight = 0
        let totalReps = 0

        for (const element of diaryElement.exercise_info) {
          totalWeight += element.weight * element.reps
          totalReps += element.reps
        }

        let scoreByDate = ((totalWeight / totalReps) * Math.log(totalReps + 1)) / weight

        if (key === '스쿼트') {
          scoreByDate *= 1.2
        } else if (key === '벤치프레스') {
          scoreByDate *= 1.4
        }

        score += Math.round(scoreByDate * 100) / 100
      }

      scores[key] = score

      // competition_score 테이블에서 key 값에 해당하는 점수 score으로 설정
      const updateScoreResult = await supabase
        .from('competition_score')
        .update({ score: scores[key] })
        .eq('exercise_name_id', getExerciseIdByName(key))
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
      .update({ score: totalScore })
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
