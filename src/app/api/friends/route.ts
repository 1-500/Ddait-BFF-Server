import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/client'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()

    const userId = req.headers.get('X-User-Id')
    if (!userId) {
      return NextResponse.json({ status: 401, message: '로그인된 사용자 ID가 필요합니다.' }, { status: 401 })
    }

    const { friend_member_id } = await req.json()
    if (!friend_member_id) {
      return NextResponse.json({ status: 400, message: '친구 회원 ID가 필요합니다.' }, { status: 400 })
    }

    // friend_member_id가 member table에 있는지 확인
    const { data: memberData, error: memberError } = await supabase
      .from('member')
      .select('id, nickname')
      .eq('id', friend_member_id)
      .single()

    if (memberError || !memberData) {
      return NextResponse.json({ status: 400, message: '유효하지 않은 친구 회원 ID입니다.' }, { status: 400 })
    }

    // 친구 신청 추가
    const { data: friendRequest, error: insertError } = await supabase
      .from('friends')
      .insert([{ member_id: userId, friend_member_id, status: '대기 중'}])
      .select()
      .single()

    if (insertError) {
      console.error('Supabase error:', insertError)
      return NextResponse.json({ status: 400, message: insertError.message }, { status: 400 })
    }

    // 성공 응답
    const responseData = {
      status: friendRequest.status,
      friend_member_nickname: memberData.nickname
    }

    return NextResponse.json({ message: '친구 신청이 완료되었습니다.', data: responseData }, { status: 201 })
  } catch (error) {
    console.error('Unhandled error:', error)
    return NextResponse.json({ status: 500, message: error.message || '예상치 못한 오류가 발생했습니다.' }, { status: 500 })
  }
}