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

    const friends = await supabase
      .from('friends')
      .select('id, member_id, friend_member_id, friend_member:friend_member_id(nickname), status')
      .or(`member_id.eq.${userId},friend_member_id.eq.${userId}`)
    if (friends.error) {
      return NextResponse.json({ message: friends.error.message }, { status: friends.status })
    }

    const competitionRecord = await supabase
      .from('competition_record')
      .select(
        `
        id, total_score, member_id, rank,
        member: member(id, email, nickname, profile_image),
        competition_score!inner(
          score,
          workout_info(name)
        )
      `,
      )
      .eq('competition_room_id', roomId)
      .order('total_score', { ascending: false })

    if (competitionRecord.error) {
      return NextResponse.json({ message: competitionRecord.error.message }, { status: competitionRecord.status })
    }

    const responseData = competitionRecord.data.map((recordElement: any) => {
      const scoreDetailData = recordElement.competition_score
        .map((scoreElement: any) => ({
          name: scoreElement.workout_info.name,
          score: scoreElement.score,
        }))
        .sort((a: any, b: any) => a.name.localeCompare(b.name))

      const isMyRecord = recordElement.member_id === userId
      const friend = isMyRecord
        ? []
        : friends.data.filter(
            (friend) =>
              friend.member_id === recordElement.member_id || friend.friend_member_id === recordElement.member_id,
          )

      return {
        rank: recordElement.rank,
        total_score: recordElement.total_score,
        is_friend: friend.length > 0 && friend[0]?.status === '승인',
        friend_info:
          friend.length > 0
            ? {
                id: friend[0].id,
                status: friend[0].status,
                friend_member_nickname: friend[0].friend_member.nickname,
              }
            : { status: 'none' },
        is_my_record: isMyRecord,
        member_info: recordElement.member,
        score_detail: scoreDetailData,
      }
    })

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

    const competitionRoom = await supabase
      .from('competition_room')
      .select('competition_type, competition_theme')
      .eq('id', competition_room_id)
      .single()
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
            ;['데드리프트', '스쿼트', '벤치프레스'].forEach(async (name) => {
              const workoutInfo = await supabase.from('workout_info').select('id').eq('name', name).single()
              if (workoutInfo.error) {
                return NextResponse.json({ message: workoutInfo.error.message }, { status: workoutInfo.status })
              }

              const scoreInsertResult = await supabase
                .from('competition_score')
                .insert([
                  {
                    competition_record_id: competitionRecordId,
                    workout_info_id: workoutInfo.data.id,
                  },
                ])
                .select('*')
                .single()
              if (scoreInsertResult.error) {
                console.error('Supabase Insert into competition_score Error:', scoreInsertResult.error)
                return NextResponse.json(
                  { message: scoreInsertResult.error.message },
                  { status: scoreInsertResult.status },
                )
              }
              responseData.data.competition_score[name] = scoreInsertResult
            })

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

    // 운동 데이터 일지에서 가져오기
    const scores: any = {}

    const competitionData = await supabase
      .from('competition_record')
      .select(
        `
        *,
        member: member(weight),
        competition_room: competition_room(*)
      `,
      )
      .eq('member_id', userId)
      .eq('competition_room_id', competition_room_id)
      .single()

    if (competitionData.error) {
      return NextResponse.json({ message: competitionData.error.message }, { status: competitionData.status })
    }

    // const member = await supabase.from('member').select('weight').eq('id', userId).single()
    // if (member.error) {
    //   return NextResponse.json({ message: member.error.message }, { status: member.status })
    // }

    // const competitionRoom = await supabase.from('competition_room').select('*').eq('id', competition_room_id).single()
    // if (competitionRoom.error) {
    //   return NextResponse.json({ message: competitionRoom.error.message }, { status: competitionRoom.status })
    // }

    // const competitionRecord = await supabase
    //   .from('competition_record')
    //   .select('*')
    //   .eq('member_id', userId)
    //   .eq('competition_room_id', competition_room_id)
    //   .single()
    // if (competitionRecord.error) {
    //   return NextResponse.json({ message: competitionRecord.error.message }, { status: competitionRecord.status })
    // }

    const weight = competitionData.data.member.weight
    const { competition_type, competition_theme, start_date, end_date } = competitionData.data.competition_room

    switch (competition_type) {
      case '웨이트트레이닝':
        switch (competition_theme) {
          case '3대측정내기':
            const workoutDiary = await supabase
              .from('workout_diary')
              .select(
                `
                  id, created_at,
                  workout_record(
                    set, weight, reps,
                    workout_info(name)
                  )
                `,
              )
              .eq('member_id', userId)
              .filter('workout_record.workout_info.name', 'in', '("데드리프트","스쿼트","벤치프레스")')
              .gte('created_at', competitionData.data.competition_room.start_date) // start_date 이상
              .lte('created_at', competitionData.data.competition_room.end_date) // end_date 이하
              .order('created_at', { ascending: true })
            if (workoutDiary.error) {
              return NextResponse.json({ message: workoutDiary.error.message }, { status: workoutDiary.status })
            }

            // return NextResponse.json({ data: workoutDiary }, { status: 200 })

            ;['데드리프트', '스쿼트', '벤치프레스'].forEach((name) => {
              scores[name] = 0

              for (const diaryElement of workoutDiary.data || []) {
                let weightPerDate = 0
                let repsPerDate = 0
                let scorePerDate = 0

                for (const workoutRecordElement of diaryElement.workout_record.filter(
                  (element) => element.workout_info.name === name,
                ) || []) {
                  weightPerDate += workoutRecordElement.weight * workoutRecordElement.reps
                  repsPerDate += workoutRecordElement.reps
                }
                if (repsPerDate === 0) {
                  scorePerDate = 0
                } else {
                  scorePerDate = ((weightPerDate / repsPerDate) * Math.log(repsPerDate + 1)) / weight
                }

                if (name === '스쿼트') {
                  scorePerDate *= 1.2
                } else if (name === '벤치프레스') {
                  scorePerDate *= 1.4
                }

                scorePerDate = Math.round(scorePerDate * 100) / 100
                scores[name] += scorePerDate
              }
            })
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

    const workoutInfo = await supabase
      .from('workout_info')
      .select('id, name')
      .in('name', ['데드리프트', '스쿼트', '벤치프레스'])
    if (workoutInfo.error) {
      return NextResponse.json({ message: workoutInfo.error.message }, { status: workoutInfo.status })
    }

    // competition_score 테이블에서 각 운동에 대한 score 값 업데이트
    await Promise.all(
      workoutInfo.data.map(async (element) => {
        const workoutInfoId = element.id
        const updateScoreResult = await supabase
          .from('competition_score')
          .update({ score: scores[element.name] })
          .eq('workout_info_id', workoutInfoId)
          .eq('competition_record_id', competitionData.data.id)
        if (updateScoreResult.error) {
          console.error('Error updating competition_score:', updateScoreResult.error)
          return NextResponse.json({ message: updateScoreResult.error.message }, { status: updateScoreResult.status })
        }
      }),
    )

    // competition_record 테이블에서 score 값 totalScore으로 업데이트
    const totalScore = Object.values(scores as number[]).reduce((acc: number, cur: number) => acc + cur, 0)
    const updateTotalScoreResult = await supabase
      .from('competition_record')
      .update({ total_score: totalScore })
      .eq('id', competitionData.data.id)
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
