import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const getFormattedDate = () => {
  const date = new Date();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekDay = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
  return `${month}월 ${day}일 ${weekDay}요일`;
};

const TodoFormattedDate = () => {
  return (
    <View style={styles.headerContainer}>
      <Text style={styles.header}>Today</Text>
      <Text style={styles.date}>{getFormattedDate()}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  header: {
    fontSize: 20,
    color: 'white',
  },
  date: {
    fontSize: 16,
    color: 'white',
  },
});

export default TodoFormattedDate;