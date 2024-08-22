interface Position {
  latitude: number
  longitude: number
}

export function getCurrentLocation(): Promise<Position> {
  return new Promise((resolve, reject) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          })
        },
        (error) => {
          reject(error)
        },
      )
    } else {
      reject(new Error('Geolocation is not supported by this browser.'))
    }
  })
}

// 위도 경도 값에 따른 거리 계산
export function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R: number = 6371e3 // 지구의 반지름(미터)
  const φ1: number = (lat1 * Math.PI) / 180 // 출발지 위도(라디안)
  const φ2: number = (lat2 * Math.PI) / 180 // 도착지 위도(라디안)
  const Δφ: number = ((lat2 - lat1) * Math.PI) / 180 // 두 위도 간의 차이(라디안)
  const Δλ: number = ((lon2 - lon1) * Math.PI) / 180 // 두 경도 간의 차이(라디안)

  const a: number =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c: number = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // 거리(미터)
}
