import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/client'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient() // supabase 클라이언트 생성

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

    const { data, error } = await supabase.from('competition_room').insert([
      {
        title,
        max_members,
        competition_type,
        competition_theme,
        start_date,
        end_date,
        is_private,
        smartwatch,
      },
    ]).select() // 데이터 명시적으로 반환

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 400 })
    }

    // 데이터가 여전히 null인 경우 확인
    if (!data || data.length === 0) {
      return NextResponse.json({ message: 'No data returned after insert' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Competition room created successfully', room: data[0] }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ message: error.message || 'An unexpected error occurred' }, { status: 500 })
  }
}