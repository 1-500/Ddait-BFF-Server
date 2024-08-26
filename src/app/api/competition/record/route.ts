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

    // TODO: 운동 데이터 일지에서 가져오기
    const results: { deadlift: any[]; squat: any[]; benchpress: any[] } = {
      deadlift: [],
      squat: [],
      benchpress: [],
    }
    const competitionRoom = await supabase.from('competition_room').select('*').eq('id', competition_room_id).single()
    if (competitionRoom.data) {
      const { competition_type, competition_theme, start_date, end_date } = competitionRoom.data
      switch (competition_type) {
        case '웨이트트레이닝':
          switch (competition_theme) {
            case '3대측정':
              const workoutDiary = await supabase.from('workout_diary').select('*').eq('member_id', member_id)
              // console.log(workoutDiary)
              workoutDiary.data?.forEach(async (element) => {
                const exerciseInfo = await supabase.from('exercise_info').select('*').eq('workout_diary_id', element.id)
                // console.log(exerciseInfo)
                exerciseInfo.data?.forEach(async (element) => {
                  const exerciseName = await supabase
                    .from('exercise_name')
                    .select('*')
                    .eq('id', element.exercise_name_id)
                    .single()
                  // console.log(exerciseName)
                  if (exerciseName.data) {
                    switch (exerciseName.data.name) {
                      case '데드리프트':
                        // console.log(element)
                        results.deadlift.push(element)
                        console.log(results.deadlift)
                        break
                      case '스쿼트':
                        results.squat.push(element)
                        break
                      case '벤치프레스':
                        results.benchpress.push(element)
                        break
                      default:
                        return
                    }
                  }
                })
              })
          }
        case '러닝':
        case '다이어트':
        default:
      }
    }
    console.log(results)
    // TODO: 점수 계산 로직

    // const result = await supabase.from('competition_room').insert([
    //   {
    //     title,
    //     max_members,
    //     competition_type,
    //     competition_theme,
    //     start_date,
    //     end_date,
    //   },
    // ])

    // if (result.error) {
    //   console.error('Supabase Insert Error:', result.error)
    //   return NextResponse.json({ message: result.error.message }, { status: 400 })
    // }

    return NextResponse.json({ data: results, status: 201 }) // 201: Created
  } catch (error) {
    console.error('Error in POST request:', error)
    return NextResponse.json({ message: error || 'Unknown error occurred' }, { status: 400 })
  }
}
