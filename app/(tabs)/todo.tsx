import TodoContainer from '@/components/todo/todoContainer';
import React from 'react';
import { View, StyleSheet } from 'react-native';

export default function Todo() {
  return (
    <View style={styles.container}>
      <TodoContainer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
});
