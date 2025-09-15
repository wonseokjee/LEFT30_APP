import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { checkProps } from './actionTrackerModal';
import {
  CheckboxItem,
  CheckboxListProps,
  CheckboxLabel,
} from '@/@types/timeSlot/checkBoxType';
import { GRAY_4, GRAY_5, GRAY_7, GRAY_8 } from '@/assets/palette';

type CheckBoxProps = {
  items: CheckboxLabel[];
} & checkProps;
const CheckboxList: React.FC<CheckboxListProps> = ({ items, onChange }) => {
  const handleToggle = (id: number) => {
    const updatedItems = items.map((item) => ({
      ...item,
      checked: item.id === id ? !item.checked : false,
    }));
    const selectedItem = updatedItems.find((item) => item.checked) || null;
    onChange(selectedItem);
  };

  return (
    <View style={styles.checkboxGrid}>
      {items.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={styles.checkboxContainer}
          onPress={() => handleToggle(item.id)}
        >
          <View
            style={[styles.checkbox, item.checked && styles.checkedCheckbox]}
          />
          <Text style={styles.label}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const CheckBox = (props: CheckBoxProps) => {
  //나중에 type으로 따로 빼야함.
  const [checkboxItems, setCheckboxItems] = useState<CheckboxItem[]>(
    (props.items ?? []).map((label, idx) => ({
      id: idx + 1,
      label,
      checked: false,
    }))
  );
  const [selectedItem, setSelectedItem] = useState<CheckboxItem | null>();

  const handleCheckboxChange = (selectedItem: CheckboxItem | null) => {
    const updatedItems = checkboxItems.map((item) => ({
      ...item,
      checked: item.id === selectedItem?.id || false,
    }));
    setCheckboxItems(updatedItems);
    //setSelectedItem 나중에는 필요없음
    setSelectedItem(selectedItem);
    if (selectedItem) {
      props.checkValue(selectedItem.label);
      // console.log(selectedItem.label);
    }
    // props.checkValue()
  };

  return (
    <View style={styles.appContainer}>
      <CheckboxList items={checkboxItems} onChange={handleCheckboxChange} />
    </View>
  );
};

const styles = StyleSheet.create({
  appContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    // padding: 10,
    paddingHorizontal: 10,
    width: 300,
    backgroundColor: 'f5f5f5',
  },
  // title: {
  //   fontSize: 20,
  //   fontWeight: 'bold',
  //   marginBottom: 20,
  // },
  checkboxGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  checkboxContainer: {
    width: '30%',
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    // backgroundColor: 'white',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: GRAY_4,
    borderRadius: 4,
    marginRight: 5,
    backgroundColor: '#fff',
  },
  checkedCheckbox: {
    backgroundColor: GRAY_4,
  },
  label: {
    fontSize: 14,
    color: GRAY_7,
  },
  selectedItemText: {
    marginTop: 10,
    fontSize: 16,
    fontStyle: 'italic',
    color: GRAY_8,
  },
});

export default CheckBox;
