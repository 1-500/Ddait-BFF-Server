// pages/api/sendNotification.js
import admin from 'firebase-admin'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

// Firebase Admin SDK 초기화
const serviceAccount = require('../../../../firebase-adminsdk.json')

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  })
}

export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const userId = req.headers.get('X-User-Id')

    const res = await supabase
      .from('notification')
      .select('*')
      .eq('member_id', userId)
      .order('created_at', { ascending: false })

    if (res.error) {
      return NextResponse.json({ message: res.error.message }, { status: res.status })
    }

    return NextResponse.json({ data: res.data, status: 200 })
  } catch (error) {
    console.log(error)
    return NextResponse.json({ message: error }, { status: 400 })
  }
}

export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const body = await req.json()
  const { token, notification } = body

  if (!token || !notification) {
    return NextResponse.json({ message: 'Invalid request payload' }, { status: 400 })
  }

  const data: any = {
    notification_id: notification.id,
    type: notification.type,
  }

  switch (notification.type) {
    case 'competition_invite':
      const competitionRoom = await supabase
        .from('competition_room')
        .select('max_members')
        .eq('id', notification.relation_table_id)
        .single()
      if (competitionRoom.error) {
        console.error('Supabase Select from competition_room Error:', competitionRoom.error)
        return NextResponse.json({ message: competitionRoom.error.message }, { status: competitionRoom.status })
      }

      data.screen = competitionRoom.data.max_members === 2 ? 'CompetitionRoom1VS1' : 'CompetitionRoomRanking'
      data.competition_room_id = notification.relation_table_id
      break
    case 'friends':
      data.screen = 'Friend'
      break
  }

  // FCM 메시지 생성
  const message = {
    notification: {
      title: notification.title,
      body: notification.message,
    },
    data,
    token,
  }

  try {
    // Firebase Admin SDK를 사용하여 푸시 알림 전송
    await admin.messaging().send(message)
    return NextResponse.json({ message: 'Notification sent successfully' }, { status: 200 })
  } catch (error) {
    console.error('Error sending notification:', error)
    return NextResponse.json({ message: 'Failed to send notification' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const body = await req.json()
    const { notification_id, read } = body

    if (!notification_id || read === undefined) {
      return NextResponse.json({ message: 'Invalid body' }, { status: 400 })
    }

    const res = await supabase.from('notification').update({ read }).eq('id', notification_id).select('*')
    if (res.error) {
      return NextResponse.json({ message: error }, { status: 400 })
    }

    return NextResponse.json({ data: { id: notification_id, read }, status: 200 })
  } catch (error) {
    console.log(error)
    return NextResponse.json({ message: error }, { status: 400 })
  }
}
