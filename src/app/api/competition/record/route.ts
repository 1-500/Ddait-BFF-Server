import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const roomId = searchParams.get('roomId')
    const memberId = searchParams.get('memberId')
    const supabase = createClient()

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

    const supabase = createClient()

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
    const competitionRecordId = insertResult.data ? insertResult.data[0].id : null

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
  try {
    const body = await req.json()
    const { member_id, competition_room_id } = body

    const supabase = createClient()

    if (!body) {
      // 요청 본문이 없거나 잘못된 경우 처리
      return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 })
    }

    // TODO: 운동 데이터 일지에서 가져오기
    const results: any = {}
    const scores: any = {}

    const competitionRoom = await supabase.from('competition_room').select('*').eq('id', competition_room_id).single()
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
                // TODO: 날짜 체크하기
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
    // TODO: 점수 계산 후 저장

    for (let key in results) {
      const value = results[key as keyof typeof results]
      if (value.length === 0) {
        // TODO: competition_score 테이블에서 key 값에 해당하는 점수 0으로 설정
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
      scores[key] = score
      // TODO: competition_score 테이블에서 key 값에 해당하는 점수 score으로 설정
    }
    console.log(scores)
    const totalScore = Object.values(scores as number[]).reduce((acc: number, cur: number) => acc + cur, 0)

    // TODO: competition_record 테이블에서 score 값 totalScore으로 설정

    return NextResponse.json({ status: 201 }) // 201: Created
  } catch (error) {
    console.error('Error in POST request:', error)
    return NextResponse.json({ message: error || 'Unknown error occurred' }, { status: 400 })
  }
}
