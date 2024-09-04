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
      console.error('User rooms error', userRoomsError)
      return NextResponse.json({ message: '사용자 참여 방 조회 중 오류 발생' }, { status: 400 })
    }

    const userRoomIds = userRooms.map((room) => room.competition_room_id)

    // 공개방 + 내가 참여한 비공개방
    const { data: rooms, error } = await supabase
      .from('competition_room')
      .select(
        `
        *,
        competition_record (count)
      `,
      )
      .or(`is_private.eq.false,id.in.(${userRoomIds.join(',')})`)

    if (error) {
      console.error('Supabase error', error)
      return NextResponse.json({ message: '경쟁방 목록 조회 중 오류 발생' }, { status: 400 })
    }

    const userParticipationSet = new Set(userRoomIds)

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
        is_participant: userParticipationSet.has(room.id),
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
    console.error('Unexpected error:', error)
    return NextResponse.json({ message: '예상치 못한 오류가 발생했습니다.' }, { status: 500 })
  }
}

// 경쟁방 생성
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const userId = req.headers.get('X-User-Id')
    
    if (!userId) {
      return NextResponse.json({ 
        status: 400, 
        message: '유저 ID가 필요합니다.' 
      }, { status: 400 })
    }

    const {
      title,
      max_members,
      competition_type,
      competition_theme,
      start_date,
      end_date,
      is_private,
      smartwatch,
    } = await req.json()

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
      return NextResponse.json({ message: `경쟁방 생성 중 오류 발생: ${roomError.message}`}, { status: 400 })
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
    return NextResponse.json({ message: error.message || '예상치 못한 오류가 발생했습니다.'}, { status: 500 })
  }
}