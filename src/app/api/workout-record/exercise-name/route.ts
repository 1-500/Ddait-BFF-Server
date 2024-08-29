import { createClient } from '@/utils/supabase/client'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  try {
    // Supabase 서버 클라이언트 생성
    const supabase = createClient(cookies())

    // exercise_name 테이블의 모든 데이터를 가져옴
    const { data: exerciseNames, error } = await supabase.from('exercise_name').select('id, name, description')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(exerciseNames, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
