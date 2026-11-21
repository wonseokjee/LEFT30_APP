import TimerHome from '@/components/timer/TimerHome';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/Text';

import { makeStyles } from '@/theme/theme';

export default function Index() {
  const styles = useStyles();
  const [isLandscape, setIsLandscape] = useState(false);

  useFocusEffect(
    useCallback(() => {
      return () => {
        // 화면을 떠날 때 세로로 고정
        ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.PORTRAIT_UP
        );
        setIsLandscape(false);
      };
    }, [])
  );

  const toggleOrientation = async () => {
    if (isLandscape) {
      // 세로로 전환
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP
      );
      setIsLandscape(false);
    } else {
      // 가로로 전환
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.LANDSCAPE
      );
      setIsLandscape(true);
    }
  };

  return (
    <View style={styles.appContainer}>
      <TouchableOpacity style={styles.rotateButton} onPress={toggleOrientation}>
        <Text style={styles.buttonText}>
          {isLandscape ? '세로로 전환' : '가로로 전환'}
        </Text>
      </TouchableOpacity>
      <TimerHome showBars={!isLandscape} />
    </View>
  );
}

const useStyles = makeStyles((t) => StyleSheet.create({
  appContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: t.wall,
  },
  rotateButton: {
    position: 'absolute',
    top: 10,
    right: 20,
    backgroundColor: t.sub,
    padding: 8,
    borderRadius: 8,
    zIndex: 1,
  },
  buttonText: {
    color: t.text,
    fontSize: 10,
  },
}));
