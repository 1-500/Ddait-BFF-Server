// pages/api/sendNotification.js
import admin from 'firebase-admin'
import { NextRequest, NextResponse } from 'next/server'

// Firebase Admin SDK 초기화
const serviceAccount = require('../../../../firebase-adminsdk.json')

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  })
}
export async function POST(req: NextRequest) {
  const reqBody = await req.json()
  const { token, title, body } = reqBody

  if (!token || !title || !body) {
    return NextResponse.json({ message: 'Invalid request payload' }, { status: 400 })
  }

  // FCM 메시지 생성
  const message = {
    notification: {
      title,
      body,
    },
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
