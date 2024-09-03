import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/client'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const url = new URL(request.url)
    const nickname = url.searchParams.get('nickname')

    if (!nickname) {
      return NextResponse.json({ status: 400, message: '닉네임이 필요합니다.' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('member')
      .select('introduce, profile_image, nickname, preferred_sport, id')
      .ilike('nickname', `%${nickname}%`) // 부분 일치

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 400 })
    }

    if (data.length === 0) {
      return NextResponse.json({ message: `${nickname}을 포함한 닉네임을 가진 유저가 없어요.`}, { status:  204 })
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    return NextResponse.json({ message: error.message || 'An unexpected error occurred' }, { status: 500 })
  }
}