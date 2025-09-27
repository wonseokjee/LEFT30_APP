const useTime = () => {
  const endTime = () => {
    const now = new Date();
    const endHour = now.getHours(); // 한국 시간으로 변환 (UTC+9)하지 않아도 들어감.
    // const endMinute = now.getMinutes();
    // 현재 분이 30 이상이면 30, 아니면 00
    const endMinute = now.getMinutes() >= 30 ? 30 : 0;

    return now.setHours(endHour, endMinute, 0, 0), now;
  };
  return { endTime };
};
export default useTime;