import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GRAY_0, GRAY_5, GRAY_9 } from '@/assets/palette';
import { setSetting } from '@/db/records';
import { QUIET_KEY } from '@/scheduler/scheduler';
import type { Quiet } from '@/scheduler/plan';
import { getRuntime, rescheduleNow } from '@/runtime/appRuntime';
import QuietEditor from '@/components/quiet/QuietEditor';

const MAX_SCALE = 1.3;

type SetQuietTimeModalProps = {
  initial: Quiet;
  setModalVisible: (visible: boolean) => void;
};

// 방해금지 시간 목록은 앱 로컬에만 저장한다(구현 D1, D19). 온보딩과 같은 편집기를 쓴다.
const QuietTimeModal: React.FC<SetQuietTimeModalProps> = ({ initial, setModalVisible }) => {
  const [quiet, setQuiet] = useState<Quiet>(initial);

  const handleConfirm = async () => {
    await setSetting(getRuntime().db, QUIET_KEY, quiet);
    // 바뀐 칸만 취소·추가한다.
    void rescheduleNow();
    setModalVisible(false);
  };

  return (
    <Modal animationType='fade' onRequestClose={() => setModalVisible(false)}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.title} maxFontSizeMultiplier={MAX_SCALE}>
          방해금지 시간
        </Text>
        <Text style={styles.body} maxFontSizeMultiplier={MAX_SCALE}>
          이 시간에는 묻지 않아요.
        </Text>
        <QuietEditor value={quiet} onChange={setQuiet} />
        <View style={styles.buttons}>
          <TouchableOpacity style={styles.cancel} onPress={() => setModalVisible(false)}>
            <Text style={styles.cancelText} maxFontSizeMultiplier={MAX_SCALE}>
              취소
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.save} onPress={handleConfirm}>
            <Text style={styles.saveText} maxFontSizeMultiplier={MAX_SCALE}>
              저장
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: GRAY_9,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 40,
  },
  title: {
    color: GRAY_0,
    fontSize: 16,
    marginBottom: 8,
  },
  body: {
    color: GRAY_5,
    fontSize: 16,
    marginBottom: 24,
  },
  buttons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 40,
  },
  cancel: {
    flex: 1,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    color: GRAY_5,
    fontSize: 16,
  },
  save: {
    flex: 1,
    minHeight: 56,
    borderRadius: 8,
    backgroundColor: GRAY_0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveText: {
    color: GRAY_9,
    fontSize: 16,
  },
});

export default QuietTimeModal;
