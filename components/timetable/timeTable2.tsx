import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';

// 타입 정의
interface Event {
  id: string;
  title: string;
  day: number;
  startTime: string;
  endTime: string;
  location?: string;
  color?: string;
}

interface TimeTableProps {
  events: Event[];
  // style?: ViewStyle;
  onEditEvent?: (event: Event) => void;
  onDeleteEvent?: (event: Event) => void;
}

// EventMenu 컴포넌트
const EventMenu: React.FC<{
  visible: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  event: Event;
}> = ({ visible, onClose, onEdit, onDelete, event }) => {
  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType='fade'
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        onPress={onClose}
        activeOpacity={1}
      >
        <View style={styles.menuContainer}>
          <Text style={styles.menuTitle}>{event.title}</Text>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              onEdit();
              onClose();
            }}
          >
            <Text style={styles.menuText}>편집</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.menuItem, styles.deleteButton]}
            onPress={() => {
              Alert.alert('이벤트 삭제', '이 이벤트를 삭제하시겠습니까?', [
                { text: '취소', style: 'cancel' },
                {
                  text: '삭제',
                  style: 'destructive',
                  onPress: () => {
                    onDelete();
                    onClose();
                  },
                },
              ]);
            }}
          >
            <Text style={[styles.menuText, styles.deleteText]}>삭제</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

// EventCard 컴포넌트
const EventCard: React.FC<{
  event: Event;
  style: any;
  isHighlighted: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}> = ({ event, style, isHighlighted, onPress, onLongPress }) => {
  return (
    <TouchableOpacity
      style={[styles.event, style, isHighlighted && styles.highlightedEvent]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <Text style={styles.eventTitle} numberOfLines={1}>
        {event.title}
      </Text>
      <Text style={styles.eventTime} numberOfLines={1}>
        {event.startTime} - {event.endTime}
      </Text>
      {event.location && (
        <Text style={styles.eventLocation} numberOfLines={1}>
          {event.location}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const TimeTable2: React.FC<TimeTableProps> = ({
  events,
  // style,
  onEditEvent,
  onDeleteEvent,
}) => {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [highlightedColor, setHighlightedColor] = useState<string | null>(null);

  const handleEventPress = (event: Event) => {
    if (highlightedColor === event.color) {
      setHighlightedColor(null);
    } else {
      // setHighlightedColor(event.color);
    }
  };

  const handleEventLongPress = (event: Event) => {
    setSelectedEvent(event);
    setMenuVisible(true);
  };

  const DAYS = ['월(3/1)', '화(3/2)'];
  const HOURS = ['1', '2', '3'];

  return (
    <View style={[styles.container]}>
      {/* <View style={[styles.container, style]}> */}
      <EventMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onEdit={() => onEditEvent?.(selectedEvent!)}
        onDelete={() => onDeleteEvent?.(selectedEvent!)}
        event={selectedEvent!}
      />

      {/* 요일 헤더 */}
      <View style={styles.header}>
        <View style={styles.timeColumn}>
          <Text style={styles.headerText}>시간</Text>
        </View>
        {DAYS.map((day) => (
          <View key={day} style={styles.dayColumn}>
            <Text style={styles.headerText}>{day}</Text>
          </View>
        ))}
      </View>

      {/* 시간표 본문 */}
      <ScrollView style={styles.scrollView}>
        <View style={styles.timeTableContent}>
          {/* 시간 눈금 */}
          <View style={styles.timeColumn}>
            {HOURS.map((hour) => (
              <View key={hour} style={styles.timeCell}>
                <Text style={styles.timeText}>{hour}</Text>
                {/* <Text style={styles.timeText}>{formatHour(hour)}</Text> */}
              </View>
            ))}
          </View>

          {/* 요일별 컬럼 */}
          {DAYS.map((_, dayIndex) => (
            <View key={dayIndex} style={styles.dayColumn}>
              {/* 시간 그리드 */}
              {HOURS.map((hour) => (
                <View key={hour} style={styles.timeCell} />
              ))}

              {/* 해당 요일의 이벤트들 */}
              {events
                .filter((event) => event.day === dayIndex + 1)
                .map((event) => {
                  // const { top, height } = getEventPosition(event);
                  return (
                    <EventCard
                      key={event.id}
                      event={event}
                      style={{
                        // top,
                        // height,
                        backgroundColor: event.color || '#3498db',
                      }}
                      isHighlighted={highlightedColor === event.color}
                      onPress={() => handleEventPress(event)}
                      onLongPress={() => handleEventLongPress(event)}
                    />
                  );
                })}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  // ... 기존 스타일 유지 ...
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    width: '80%',
    maxWidth: 300,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginVertical: 4,
    backgroundColor: '#f0f0f0',
  },
  menuText: {
    fontSize: 14,
    textAlign: 'center',
  },
  deleteButton: {
    backgroundColor: '#ffebee',
  },
  deleteText: {
    color: '#e53935',
  },
  highlightedEvent: {
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
  },
  headerText: {
    textAlign: 'center',
    padding: 8,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  timeTableContent: {
    flexDirection: 'row',
  },
  timeColumn: {
    width: 60,
    borderRightWidth: 1,
    borderColor: '#e0e0e0',
  },
  dayColumn: {
    width: 100,
    borderRightWidth: 1,
    borderColor: '#e0e0e0',
  },
  timeCell: {
    height: 50,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
    justifyContent: 'center',
  },
  timeText: {
    textAlign: 'center',
    fontSize: 12,
  },
  event: {
    position: 'absolute',
    left: 2,
    right: 2,
    borderRadius: 4,
    padding: 4,
    overflow: 'hidden',
  },
  eventTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  eventTime: {
    color: '#fff',
    fontSize: 10,
    marginTop: 2,
  },
  eventLocation: {
    color: '#fff',
    fontSize: 10,
  },
});

export default TimeTable2;
