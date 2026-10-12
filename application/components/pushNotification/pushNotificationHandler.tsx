export const handleNotification = async (notification: any) => {
  const type = await notification.request.content.data?.type;
  console.log('handleNotification type:', type);
  if (type === 'important') {
    return {
      // shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  } else {
    return {
      // shouldShowAlert: true, // 상단에 알림표시
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: false,
      shouldShowList: false,
    };
  }
};
