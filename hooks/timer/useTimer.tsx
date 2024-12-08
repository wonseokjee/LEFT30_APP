import { useEffect, useRef, useState } from 'react';
import useInterval from './useInterval';
// import useInterval from './useInterval';

const useTimer = () => {
  const [time, setTime] = useState<string>();
  const [leftMinute, setLeftMinute] = useState<string>();
  const [leftSecond, setLeftSecond] = useState<string>();

  //나중에 recoil로 user마다 다른 timer종류 설정하기
  const typeOfTimer = 30;

  useInterval(() => {
    const now = new Date().toLocaleTimeString();
    const realMinute = new Date().getMinutes();
    const realSecond = new Date().getSeconds();
    // console.log('a: ' + a);
    setTime(now);
    if (realSecond >= 1) {
      //타이머 분 단위 설정

      // 타이머 타입이 30분 단위일 경우
      if (typeOfTimer == 30) {
        if (realMinute >= 30) {
          setLeftMinute(String(59 - realMinute).padStart(2, '0'));
        } else {
          setLeftMinute(String(29 - realMinute).padStart(2, '0'));
        }
      }
      //타이머 타입이 60분 단위일 경우
      else if (typeOfTimer == 60) {
        setLeftMinute(String(59 - realMinute).padStart(2, '0'));
      }
      //타이머 타입이 15분 단위일 경우
    }
    //타이머 초 단위 설정

    //00초일 경우 남은  분 오류 ex) 실제 10:00남음 오류 10:60남음
    if (realSecond < 1) {
      setLeftSecond('00');
    } else if (realSecond >= 1) {
      //padStart(2,'0'): 자리수가 2보다 작을 경우 앞에 '0'추가
      setLeftSecond(String(60 - realSecond).padStart(2, '0'));
    }
  }, 1000);

  return { time, leftMinute, leftSecond, typeOfTimer };
};

export default useTimer;
