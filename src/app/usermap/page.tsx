'use client'

import useGeolocation from '../../webview/hooks/useGeolocation'
import { Map, MapMarker, useKakaoLoader } from 'react-kakao-maps-sdk'
import { useEffect, useState } from 'react'

// 모든 유저의 위치 정보를 가져오기
const fetchAllUserLocations = async () => {
  try {
    const response = await fetch('/api/users/location')
    if (!response.ok) {
      const errorData = await response.json()
      console.error('API Error:', errorData)
      throw new Error(errorData.message)
    }
    const data = await response.json()
    return data.data
  } catch (error) {
    console.error('Error fetching user locations:', error)
    throw error
  }
}

const MyPositionPageLayout = () => {
  const { position } = useGeolocation()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [center, setCenter] = useState({ lat: 0, lng: 0 })
  const [userLocations, setUserLocations] = useState([])
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  const [kakaoLoading, kakaoError] = useKakaoLoader({
    appkey: `${process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY}`,
  })

  useEffect(() => {
    if (position) {
      setCenter({ lat: position.latitude, lng: position.longitude })

      if (typeof window !== 'undefined' && window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ lat: position.latitude, lng: position.longitude }))
      }
    }

    const loadUserLocations = async () => {
      try {
        const locations = await fetchAllUserLocations()
        setUserLocations(locations)
        setLoading(false)
      } catch (error) {
        setError(error.message)
        setLoading(false)
      }
    }

    loadUserLocations()
  }, [position])

  if (kakaoError) {
    return <div>카카오 지도를 로드하는 중 오류가 발생했습니다.</div>
  }

  if (error) {
    return <div>위치를 불러오지 못했습니다: {error}</div>
  }

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      {loading ? (
        <div>로딩 중...</div>
      ) : center ? (
        <Map
          center={center}
          style={{
            width: '100%',
            height: '100%',
          }}
          level={4}
          draggable={true}
        >
          <MapMarker
            position={center}
            image={{
              src: '/assets/green_marker_on.svg',
              size: { width: 40, height: 40 },
            }}
            title="내 위치"
          />
          {userLocations.map((user) => (
            <MapMarker
              key={user.id}
              position={{ lat: user.location.latitude, lng: user.location.longitude }}
              image={{
                src: selectedUserId === user.id ? '/assets/blue_marker_on.svg' : '/assets/blue_marker.svg',
                size: { width: 30, height: 30 },
              }}
              title={user.nickname}
              onClick={() => setSelectedUserId(user.id)}
            />
          ))}
        </Map>
      ) : (
        <div>위치 정보를 가져오는 중입니다...</div>
      )}
    </div>
  )
}

export default MyPositionPageLayout
