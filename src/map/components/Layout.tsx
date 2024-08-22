'use client'

import useGeolocation from '../hooks/useGeolocation'
import { Map, MapMarker, useKakaoLoader } from 'react-kakao-maps-sdk'
import { useEffect, useState } from 'react'

const MyPositionPageLayout = () => {
  const { position } = useGeolocation()
  const [loading, error] = useKakaoLoader({
    appkey: `${process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY}`,
  })

  const [center, setCenter] = useState(null)

  useEffect(() => {
    if (position) {
      setCenter({ lat: position.latitude, lng: position.longitude })
    }
  }, [position])

  if (error) {
    return <div>위치를 불러오지 못했습니다. 다시 시도해 주세요.</div>
  }

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      {!loading ? (
        center ? (
          <Map
            center={center} // 지도의 중심 좌표
            style={{
              width: '100%',
              height: '100%',
            }}
            level={2}
            draggable={true} // 지도 드래그 가능
          >
            <MapMarker
              position={center}
              image={{
                src: '/assets/myPostion.png',
                size: { width: 70, height: 70 },
              }}
              title="내 위치"
            />
          </Map>
        ) : (
          <div>위치 정보를 가져오는 중입니다...</div>
        )
      ) : (
        <div>로딩 중...</div>
      )}
    </div>
  )
}

export default MyPositionPageLayout
