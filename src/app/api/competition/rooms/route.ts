import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/client'
import { cookies } from 'next/headers'

// 전체 경쟁방 목록 조회
export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const userId = req.headers.get('X-User-Id')
    if (!userId) {
      return NextResponse.json({ message: '유저 ID가 필요합니다.' }, { status: 400 })
    }

    // 사용자가 참여한 방 ID 조회
    const { data: userRooms, error: userRoomsError } = await supabase
      .from('competition_record')
      .select('competition_room_id')
      .eq('member_id', userId)

    if (userRoomsError) {
      return NextResponse.json({ message: '사용자 참여 방 조회 중 오류 발생' }, { status: userRoomsError.status })
    }

    const userRoomIds = userRooms.map((room) => room.competition_room_id)

    // 공개방 + 내가 참여한 비공개방
    const { data: rooms, error: fetchRoomsError } = await supabase
      .from('competition_room')
      .select(
        `
        *,
        competition_record (count)
      `,
      )
      .or(`is_private.eq.false,id.in.(${userRoomIds.join(',')})`)

    if (fetchRoomsError) {
      return NextResponse.json(
        { message: '경쟁방 목록 조회 중 오류 발생', error: fetchRoomsError.message },
        { status: fetchRoomsError.status },
      )
    }

    const allRoomsData = rooms.map((room) => ({
      id: room.id,
      title: room.title,
      info: {
        max_members: room.max_members,
        current_members: room.competition_record[0].count,
        competition_type: room.competition_type,
        competition_theme: room.competition_theme,
      },
      date: {
        start_date: room.start_date,
        end_date: room.end_date,
      },
      settings: {
        is_private: room.is_private,
        smartwatch: room.smartwatch,
      },
      user_status: {
        is_host: room.host_id === userId,
        is_participant: userRoomIds.includes(room.id),
      },
    }))

    return NextResponse.json(
      {
        message: '전체 경쟁방 목록 조회 성공',
        data: allRoomsData,
      },
      { status: 200 },
    )
  } catch (error) {
    return NextResponse.json({ message: '예상치 못한 오류가 발생했습니다.' }, { status: error.status })
  }
}

// 경쟁방 생성
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const userId = req.headers.get('X-User-Id')

    if (!userId) {
      return NextResponse.json(
        {
          status: 400,
          message: '유저 ID가 필요합니다.',
        },
        { status: 400 },
      )
    }

    const { title, max_members, competition_type, competition_theme, start_date, end_date, is_private, smartwatch } =
      await req.json()

    const { data: roomData, error: roomError } = await supabase
      .from('competition_room')
      .insert([
        {
          title,
          max_members,
          competition_type,
          competition_theme,
          start_date,
          end_date,
          is_private,
          smartwatch,
          host_id: userId,
        },
      ])
      .select()
      .single() // 단일 객체로 반환

    if (roomError) {
      return NextResponse.json({ message: `경쟁방 생성 중 오류 발생: ${roomError.message}` }, { status: 400 })
    }

    if (!roomData || !roomData.id) {
      return NextResponse.json({ message: '경쟁방 생성에 실패했습니다.' }, { status: 500 })
    }

    const responseData = {
      room_id: roomData.id,
      title: roomData.title,
    }

    return NextResponse.json({ message: '경쟁방이 성공적으로 생성되었습니다.', data: responseData }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ message: error.message || '예상치 못한 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json()
    const { competition_room_id } = body

    const supabase = createClient()
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

    const res = await supabase.from('competition_room').delete().eq('id', competition_room_id).eq('host_id', userId)
    if (res.error) {
      return NextResponse.json({ message: res.error.message }, { status: res.status })
    }

    return NextResponse.json({ message: 'Data deleted successfully' }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ message: error || '예상치 못한 오류가 발생했습니다.' }, { status: 500 })
  }
}
