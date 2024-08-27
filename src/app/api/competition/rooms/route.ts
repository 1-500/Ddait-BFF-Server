import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/client'

// 전체 경쟁방 목록 조회
export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: allRooms, error } = await supabase
      .from('competition_room')
      .select('*')
      .order('start_date', { ascending: false })

    if (error) {
      console.error('supabase error', error)
      return NextResponse.json({ message: '경쟁방 목록 조회 중 오류 발생' }, { status: 400 })
    }

    return NextResponse.json(
      {
        message: '전체 경쟁방 목록 조회 성공',
        data: allRooms,
      },
      { status: 200 },
    )
  } catch (error) {
    return NextResponse.json({ message: error.message || '예상치 못한 오류가 발생했습니다.' }, { status: 500 })
  }
}
