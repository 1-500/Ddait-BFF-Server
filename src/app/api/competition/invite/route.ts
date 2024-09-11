import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { competition_room_id, recipient_id } = body

    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const userId = req.headers.get('X-User-Id')

    if (!competition_room_id || !recipient_id) {
      // 요청 본문이 없거나 잘못된 경우 처리
      return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 })
    }

    const competitionRoom = await supabase.from('competition_room').select('*').eq('id', competition_room_id).single()
    if (competitionRoom.error) {
      console.error('Supabase Select from competition_room Error:', competitionRoom.error)
      return NextResponse.json({ message: competitionRoom.error.message }, { status: competitionRoom.status })
    }

    const competitionRecord = await supabase
      .from('competition_record')
      .select('*')
      .eq('competition_room_id', competition_room_id)
    if (competitionRecord.error) {
      console.error('Supabase Select from competition_room Error:', competitionRecord.error)
      return NextResponse.json({ message: competitionRecord.error.message }, { status: competitionRecord.status })
    }

    if (competitionRecord.data.length < competitionRoom.data.max_members) {
      if (!competitionRecord.data.some((record) => record.member_id === userId)) {
        const res = await supabase.from('competition_invite').insert([
          {
            competition_room_id,
            sender_id: userId,
            recipient_id,
          },
        ])
        if (res.error) {
          console.error('Supabase Insert into competition_invite Error:', res.error)
          return NextResponse.json({ message: res.error.message }, { status: res.status })
        }

        return NextResponse.json({ data: res }, { status: 201 })
      } else {
        return NextResponse.json({ message: '해당 유저는 이미 경쟁방에 참가중입니다.' }, { status: 400 })
      }
    } else {
      return NextResponse.json({ message: '인원이 가득차 초대가 불가능합니다.' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in POST request:', error)
    return NextResponse.json({ message: error || 'Unknown error occurred' }, { status: 400 })
  }
}
