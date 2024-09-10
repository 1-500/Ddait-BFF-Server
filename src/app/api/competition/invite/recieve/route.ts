import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const userId = req.headers.get('X-User-Id')

    const res = await supabase
      .from('competition_invite')
      .select(
        `id,
      created_at,
      competition_room: competition_room_id(id, title, competition_type, competition_theme),
      sender:sender_id(id, introduce, profile_image, nickname, preferred_sport),
      recipient:recipient_id(id, introduce, profile_image, nickname, preferred_sport)`,
      )
      .eq('recipient_id', userId)
    if (res.error) {
      console.error('Supabase Select from competition_invite Error:', res.error)
      return NextResponse.json({ message: res.error.message }, { status: res.status })
    }
    return NextResponse.json({ data: res }, { status: 200 })
  } catch (error) {
    console.error('Error in GET request:', error)
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

    const res = await supabase
      .from('competition_invite')
      .delete()
      .eq('competition_room_id', competition_room_id)
      .eq('recipient_id', userId)
    if (res.error) {
      console.error('Supabase Delete from competition_invite Error:', res.error)
      return NextResponse.json({ message: res.error.message }, { status: res.status })
    }

    return NextResponse.json({ data: res }, { status: 200 })
  } catch (error) {
    console.error('Error in DELETE request:', error)
    return NextResponse.json({ message: error || 'Unknown error occurred' }, { status: 400 })
  }
}
