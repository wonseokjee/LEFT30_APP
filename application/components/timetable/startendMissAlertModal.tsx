import BasicModal from '../asset/basicModal';

type setStartendMissAlertModalVisibleProps = {
  setStartendMissAlertModalVisible: (visible: boolean) => void;
};

const StartendMissAlertModal: React.FC<
  setStartendMissAlertModalVisibleProps
> = ({ setStartendMissAlertModalVisible }) => {
  //확인
  const handleConfirm = async () => {

    setStartendMissAlertModalVisible(false);
  };


  return (
    <>
      <BasicModal
        setBasicModalVisible={setStartendMissAlertModalVisible}
        title='시작시간이 종료시간보다 빨라야 합니다.'
        handleConfirm={handleConfirm}
      />
    </>
  );
};

export default StartendMissAlertModal;
