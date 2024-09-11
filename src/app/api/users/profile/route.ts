import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/client'
import { cookies } from 'next/headers'

export async function PATCH(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const userId = req.headers.get('X-User-Id')

    const { nickname, introduce, profile_image } = await req.json()

    // 업데이트할 데이터 객체 생성 (undefined 값 제외)
    const updateData = Object.fromEntries(
      Object.entries({ nickname, introduce, profile_image }).filter(([_, value]) => value !== undefined),
    )

    // 업데이트할 데이터가 없으면 early return
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: '업데이트할 정보가 없습니다.' }, { status: 200 })
    }

    // 프로필 업데이트 & 데이터 조회
    const { data: updatedData, error } = await supabase
      .from('member')
      .update(updateData)
      .eq('id', userId)
      .select('nickname, introduce, profile_image, preferred_sport')
      .single()

    if (error) {
      console.error('Update error:', error)
      return NextResponse.json({ message: '프로필 업데이트 실패' }, { status: 400 })
    }

    return NextResponse.json({ message: '프로필이 성공적으로 업데이트되었습니다', data: updatedData }, { status: 200 })
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json({ message: '서버 오류' }, { status: 500 })
  }
}
