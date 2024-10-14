import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const userId = req.headers.get('X-User-Id')

    const body = await req.json()
    const { reported_member_id, competition_room_id, type, description } = body

    if (!reported_member_id || !type) {
      return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 })
    }

    const insertResult = await supabase.from('member_report').insert([
      {
        member_id: userId,
        reported_member_id,
        competition_room_id,
        type,
        description,
      },
    ])
    if (insertResult.error) {
      console.error('Supabase Insert into member_report Error:', insertResult.error)
      return NextResponse.json({ message: insertResult.error.message }, { status: insertResult.status })
    }

    return NextResponse.json({ message: '신고가 제출되었습니다.' }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error })
  }
}
