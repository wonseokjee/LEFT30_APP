import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { checkProps } from './actionTrackerModal';

type CheckboxItem = {
  id: number;
  label: string;
  checked: boolean;
};

type CheckboxListProps = {
  items: CheckboxItem[];
  onChange: (selectedItem: CheckboxItem | null) => void;
};

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

const CheckBox = (props: checkProps) => {
  const [checkboxItems, setCheckboxItems] = useState<CheckboxItem[]>([
    { id: 1, label: '수면', checked: false },
    { id: 2, label: '휴식', checked: false },
    { id: 3, label: '운동', checked: false },
    { id: 4, label: '관계', checked: false },
    { id: 5, label: '자기개발', checked: false },
    { id: 6, label: '업무', checked: false },
  ]);
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
      {/* <Text style={styles.title}>Checkbox List</Text> */}
      <CheckboxList items={checkboxItems} onChange={handleCheckboxChange} />
      {/* <Text style={styles.selectedItemText}>
        Selected: {selectedItem ? selectedItem.label : 'None'}
      </Text> */}
    </View>
  );
};

const styles = StyleSheet.create({
  appContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
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
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 4,
    marginRight: 5,
    backgroundColor: '#fff',
  },
  checkedCheckbox: {
    backgroundColor: '#007BFF',
  },
  label: {
    fontSize: 14,
  },
  selectedItemText: {
    marginTop: 10,
    fontSize: 16,
    fontStyle: 'italic',
  },
});

export default CheckBox;
