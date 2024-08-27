'use client'

import { Button } from '@/components/ui/button'
import { signIn, signOut, useSession } from 'next-auth/react'
import { useEffect } from 'react'

const SocialLoginPageLayout = () => {
  const { data: session, status } = useSession()
  useEffect(() => {
    const handleMessage = (event) => {
      const message = JSON.parse(event.data)
      console.log(message)
      if (message.type === 'DDait_APP') {
        if (message.data === 'google') {
          signIn('google')
        } else if (message.data === 'kakao') {
          signIn('kakao')
        }
      }
    }

    window.addEventListener('message', handleMessage)

    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [])
  useEffect(() => {
    if (session && session.user) {
      const socialLogin = async () => {
        try {
          const { email, user_level } = session.user

          if (user_level === 0) {
            // 온보딩 시키도록 RN에서 처리
            if (typeof window !== 'undefined' && window.ReactNativeWebView) {
              // 소셜로그인한 기록 테이블에 추가
              window.ReactNativeWebView.postMessage(JSON.stringify({ socialEmail: email, user_level }))
            }
          } else if (user_level >= 1) {
            let response = await fetch(`/api/social/login/?email=${email}`)
            if (response.ok) {
              const data = await response.json()
              if (typeof window !== 'undefined' && window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ token: data, user_level, socialEmail: email }))
              }
            } else {
              throw new Error('Network error!')
            }
          }
        } catch (error) {
          console.log(error)
        }
      }
      socialLogin()
    }
  }, [session])

  console.log(session, session?.user)
  return (
    <div>
      <div>로딩중</div>
    </div>
  )
}

export default SocialLoginPageLayout
