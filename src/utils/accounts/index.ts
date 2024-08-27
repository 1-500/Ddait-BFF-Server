export function formatBirthdate(inputDate: string) {
  // 입력 형식: '19941119'
  if (inputDate.length !== 8) {
    throw new Error('Invalid date format. Please use YYYYMMDD.')
  }

  const year = inputDate.substring(0, 4) // 연도: 1994
  const month = inputDate.substring(4, 6) // 월: 11
  const day = inputDate.substring(6, 8) // 일: 19

  // 'YYYY-MM-DD' 형식으로 반환
  return `${year}-${month}-${day}`
}
