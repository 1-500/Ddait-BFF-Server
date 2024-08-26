import { useEffect, useState } from 'react'
import { getCurrentLocation } from '../utils/map'

interface Position {
  latitude: number
  longitude: number
  name?: string
}

const useGeolocation = () => {
  const [position, setPosition] = useState<Position>()
  const [error, setError] = useState<unknown>()

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const position = await getCurrentLocation()
        setPosition(position)
      } catch (err) {
        setError(err)
      }
    }

    fetchLocation()
  }, [])

  return { position, error }
}
export default useGeolocation
