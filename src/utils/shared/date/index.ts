import { KST_OFFSET } from '@/constants/foodDiaryAPI'

export const getStartOfDay = (date: string) => {
  const dateObj = new Date(date)
  return new Date(dateObj.setHours(0, 0, 0, 0) + KST_OFFSET).toISOString()
}
export const getEndOfDay = (date: string) => {
  const dateObj = new Date(date)
  return new Date(dateObj.setHours(23, 59, 59, 999) + KST_OFFSET).toISOString()
}
