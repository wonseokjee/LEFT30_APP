import Timetable from '@/components/timetable/Timetable';

// 시간표 탭. 로컬 SQLite만 읽는다(서버 timetable API는 없앴다).
export default function Plan() {
  return <Timetable />;
}
