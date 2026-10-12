import BasicModal from './basicModal';

type setAlertModalVisibleProps = {
  setAlertModalVisible: (visible: boolean) => void;
  title: string;
};

const AlertModal: React.FC<setAlertModalVisibleProps> = ({
  setAlertModalVisible,
  title,
}) => {
  //확인
  const handleConfirm = async () => {
    setAlertModalVisible(false);
  };

  return (
    <>
      <BasicModal
        setBasicModalVisible={setAlertModalVisible}
        title={title}
        handleConfirm={handleConfirm}
      />
    </>
  );
};

export default AlertModal;
