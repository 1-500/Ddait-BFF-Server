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

    let result
    if (roomId) {
      if (memberId) {
        result = await supabase.from('competition_record').select('*').eq('roomId', roomId).eq('memberId', memberId)
      } else {
        result = await supabase.from('competition_record').select('*').eq('roomId', roomId)
      }
    } else {
      result = await supabase.from('competition_record').select('*')
    }
    console.log(result)

    if (result.error) {
      return NextResponse.json({ message: result.error.message }, { status: result.status })
    }

    return NextResponse.json({ data: result.data, status: result.status })
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
    const competitionRecordId = insertResult.data?.id

    if (!competitionRecordId) {
      console.error('No competition record ID found')
      return NextResponse.json({ message: 'Failed to create competition record', status: 400 })
    }

    if (insertResult.error) {
      console.error('Supabase Insert into competition_record Error:', insertResult.error)
      return NextResponse.json({ message: insertResult.error.message }, { status: 400 })
    }

    switch (competitionRoom?.data.competition_type) {
      case '웨이트트레이닝':
        switch (competitionRoom.data.competition_theme) {
          case '3대측정':
            const deadliftInsertResult = await supabase.from('competition_score').insert([
              {
                competition_record_id: competitionRecordId,
                exercise_name_id: 1,
              },
            ])
            if (deadliftInsertResult.error) {
              console.error('Supabase Insert into competition_score Error:', deadliftInsertResult.error)
              return NextResponse.json({ message: deadliftInsertResult.error.message }, { status: 400 })
            }

            const squatInsertResult = await supabase.from('competition_score').insert([
              {
                competition_record_id: competitionRecordId,
                exercise_name_id: 2,
              },
            ])
            if (squatInsertResult.error) {
              console.error('Supabase Insert into competition_score Error:', squatInsertResult.error)
              return NextResponse.json({ message: squatInsertResult.error.message }, { status: 400 })
            }

            const benchpressInsertResult = await supabase.from('competition_score').insert([
              {
                competition_record_id: competitionRecordId,
                exercise_name_id: 3,
              },
            ])
            if (benchpressInsertResult.error) {
              console.error('Supabase Insert into competition_score Error:', benchpressInsertResult.error)
              return NextResponse.json({ message: benchpressInsertResult.error.message }, { status: 400 })
            }

            break
          default:
        }
      case '러닝':
      case '다이어트':
      default:
    }

    return NextResponse.json({ data: insertResult, status: 201 }) // 201:
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

    const competitionRoom = await supabase.from('competition_room').select('*').eq('id', competition_room_id).single()
    const competitionRecord = await supabase
      .from('competition_record')
      .select('*')
      .eq('member_id', member_id)
      .eq('competition_room_id', competition_room_id)
      .single()
    const member = await supabase.from('member').select('weight').eq('id', member_id).single()
    const weight = member.data?.weight

    if (competitionRoom.data) {
      const { competition_type, competition_theme, start_date, end_date } = competitionRoom.data

      switch (competition_type) {
        case '웨이트트레이닝':
          switch (competition_theme) {
            case '3대측정':
              results['데드리프트'] = []
              results['스쿼트'] = []
              results['벤치프레스'] = []
              scores['데드리프트'] = 0
              scores['스쿼트'] = 0
              scores['벤치프레스'] = 0

              const workoutDiary = await supabase.from('workout_diary').select('*').eq('member_id', member_id)

              for (const diaryElement of workoutDiary.data || []) {
                // 날짜 체크하기
                const diaryCreatedAt = new Date(diaryElement.created_at)
                const startDate = new Date(start_date)
                const endDate = new Date(end_date)

                if (diaryCreatedAt >= startDate && diaryCreatedAt <= endDate) {
                  const exerciseInfo = await supabase
                    .from('exercise_info')
                    .select('*')
                    .eq('workout_diary_id', diaryElement.id)

                  for (const exerciseElement of exerciseInfo.data || []) {
                    const exerciseName = await supabase
                      .from('exercise_name')
                      .select('*')
                      .eq('id', exerciseElement.exercise_name_id)
                      .single()

                    if (exerciseName.data) {
                      switch (exerciseName.data.name) {
                        case '데드리프트':
                        case '스쿼트':
                        case '벤치프레스':
                          results[exerciseName.data.name].push(exerciseElement)
                          break
                        default:
                          break
                      }
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
    }

    // 점수 계산 후 저장
    for (let key in results) {
      const value = results[key as keyof typeof results]
      if (value.length === 0) {
        // competition_score 테이블에서 key 값에 해당하는 점수 0으로 설정
        const updateZeroResult = await supabase
          .from('competition_score')
          .update({ score: 0 })
          .eq('exercise_name_id', getExerciseIdByName(key))
          .eq('competition_record_id', competitionRecord.data?.id)

        if (updateZeroResult.error) {
          console.error('Error updating competition_score with zero:', updateZeroResult.error)
          return NextResponse.json({ message: updateZeroResult.error.message }, { status: 400 })
        }

        continue
      }

      let totalWeight = 0
      let totalReps = 0

      for (const element of value) {
        totalWeight += element.weight * element.reps
        totalReps += element.reps
      }

      let score = ((totalWeight / totalReps) * Math.log(totalReps + 1)) / weight

      if (key === '스쿼트') {
        score *= 1.2
      } else if (key === '벤치프레스') {
        score *= 1.4
      }
      scores[key] = Math.round(score * 100) / 100
      // competition_score 테이블에서 key 값에 해당하는 점수 score으로 설정
      const updateScoreResult = await supabase
        .from('competition_score')
        .update({ score: scores[key] })
        .eq('exercise_name_id', getExerciseIdByName(key))
        .eq('competition_record_id', competitionRecord.data?.id)

      if (updateScoreResult.error) {
        console.error('Error updating competition_score:', updateScoreResult.error)
        return NextResponse.json({ message: updateScoreResult.error.message }, { status: 400 })
      }
    }

    // competition_record 테이블에서 score 값 totalScore으로 설정
    const totalScore = Object.values(scores as number[]).reduce((acc: number, cur: number) => acc + cur, 0)
    const updateTotalScoreResult = await supabase
      .from('competition_record')
      .update({ score: totalScore })
      .eq('id', competitionRecord.data?.id)
    if (updateTotalScoreResult.error) {
      console.error('Error updating competition_record:', updateTotalScoreResult.error)
      return NextResponse.json({ message: updateTotalScoreResult.error.message }, { status: 400 })
    }

    return NextResponse.json({ data: { total_score: totalScore, ...scores }, status: 201 }) // 201: Created
  } catch (error) {
    console.error('Error in POST request:', error)
    return NextResponse.json({ message: error || 'Unknown error occurred' }, { status: 400 })
  }
}
