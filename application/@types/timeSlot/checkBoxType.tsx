export type CheckboxItem = {
  id: number;
  label: CheckboxLabel;
  checked: boolean;
};

export type CheckboxListProps = {
  items: CheckboxItem[];
  onChange: (selectedItem: CheckboxItem | null) => void;
};

export type CheckboxLabel =
  | '수면'
  | '휴식'
  | '운동'
  | '관계'
  | '자기개발'
  | '업무';
