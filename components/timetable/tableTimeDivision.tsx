import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const TableTimeDivision: React.FC = () => {
  const generateTimeIndex = () => {
    const HOUR = 12;
    const totalHour: string[] = [''];
    const AMPM = ['AM', 'PM'];
    for (let j = 0; j < 2; j++) {
      for (let i = 1; i <= HOUR; i++) {
        totalHour.push(i + AMPM[j]);
      }
    }
    totalHour.pop();
    return totalHour;
  };
  return (
    <>
      <View style={styles.timeIndexContainer}>
        {/* <Text style={styles.timelocalarea}></Text> */}
        {generateTimeIndex().map((x, idx) => (
          <View key={idx} style={styles.timeContainer}>
            <Text style={styles.timeIndexText}>{x}</Text>
          </View>
        ))}
        <Text style={styles.timelocalareaBottom}></Text>
      </View>
    </>
  );
};
const styles = StyleSheet.create({
  timeIndexContainer: {
    flex: 1,
    borderWidth: 1,
    // borderColor: 'blue',
    // height: '110%',
  },
  // timelocalarea: {
  //   borderWidth: 1,
  //   borderColor: 'blue',
  //   height: '1%',
  // },
  timelocalareaBottom: {
    // borderWidth: 1,
    // borderColor: 'blue',
    height: '1.7%',
  },
  timeContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    borderWidth: 1,
    // borderColor: 'red',
    // height: '3%',
  },
  timeIndexText: {
    textAlign: 'right',
    paddingRight: 8,
    color: 'white',
    // fontSize:,
    opacity: 0.6,
  },
});
export default TableTimeDivision;
