// src/timetable/timetable-entry.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateTimetableDto } from 'src/dto/timetable/createTimetable.dto';
import { TimetableEntry } from 'src/entity/timetableEntry.entity';
import { Between, Repository } from 'typeorm';
import dayjs from 'dayjs';
import { splitInto30MinEndTimes } from './component/splitInto30MinEndTimes';
import { findSlotByEnded_at } from './query/findSlotByEnded_at';

@Injectable()
export class TimetableService {
  constructor(
    @InjectRepository(TimetableEntry)
    private timetableRepo: Repository<TimetableEntry>,
  ) {}

  //개선 매우 필요...시작,끝 시간을 받는 걸로 변경. 현재는 끝시간만 받음. DTO도 변경필요.
  //DTO에서는 ended_at을 "HHMM" 형식의 문자열로 받음.
  async createOne(createTimetableDto: CreateTimetableDto) {
    const { ended_at } = createTimetableDto;

    // ended_at을 ISO 8601 문자열에서 Date 객체로 변환
    const endedTime = new Date(ended_at);
    //현재는 30분 고정이지만, 나중에 유저가 정할 수 있게 변경 가능
    const started_at = dayjs(ended_at).subtract(30, 'minute').toDate();

    // 시작 시간과 종료 시간을 기반으로 슬롯 범위 계산
    const startTime = new Date(started_at);

    const startIndex =
      startTime.getHours() * 6 + Math.floor(startTime.getMinutes() / 10); // 시작 시간의 인덱스
    const endIndex =
      endedTime.getHours() * 6 + Math.ceil(endedTime.getMinutes() / 10); // 종료 시간의 인덱스

    const range = endIndex - startIndex; // 슬롯 범위 계산

    console.log('createTimetableDto', createTimetableDto);
    // 새로운 TimetableEntry 생성
    const entry = this.timetableRepo.create({
      ...createTimetableDto,
      started_at: started_at,
      range,
    });

    console.log('entry', entry);
    return this.timetableRepo.save(entry);
  }

  async findAll(): Promise<TimetableEntry[]> {
    return this.timetableRepo.find({ relations: ['user'] });
  }

  async findByUser(userId: string): Promise<TimetableEntry[]> {
    return this.timetableRepo.find({
      where: { user: { id: userId } },
      relations: ['user'],
      order: { started_at: 'DESC' },
    });
  }

  async findOne(id: string): Promise<TimetableEntry> {
    const entry = await this.timetableRepo.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!entry) {
      throw new Error(`TimetableEntry with id ${id} not found`);
    }

    return entry;
  }

  async findTodayEntries(userId: string): Promise<TimetableEntry[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // console.log('today', today);

    return this.timetableRepo.find({
      where: {
        user: { id: userId },
        started_at: Between(today, tomorrow),
      },
      order: { started_at: 'ASC' },
    });
  }

  async findYesterdayEntries(userId: string): Promise<TimetableEntry[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    return this.timetableRepo.find({
      where: {
        user: { id: userId },
        started_at: Between(yesterday, today),
      },
      order: { started_at: 'ASC' },
    });
  }

  // 시간범위로 받아와서 해당 시간대에 행동있으면 update, 없으면 create
  async updateTimeSlot(updateData: CreateTimetableDto) {
    //updateData.started_at과 updateData.ended_at를 30분 간격으로 나눔.
    // console.log('updateData', updateData);
    const { started_at, ended_at } = updateData;
    if (!started_at || !ended_at) {
      throw new Error('started_at and ended_at are required for update');
    }

    const endSlots = splitInto30MinEndTimes(
      new Date(started_at),
      new Date(ended_at),
    );
    // console.log('endSlots', endSlots);
    // // 각 슬롯에 대해 update 또는 create 수행
    for (const end of endSlots) {
      const existingEntry = await findSlotByEnded_at(
        this.timetableRepo,
        end,
        updateData.user_id,
      );
      // console.log('existingEntry', existingEntry);
      if (existingEntry) {
        // console.log(existingEntry);
        existingEntry.action = updateData.action;
        existingEntry.description = updateData.description;
        // console.log('existingEntry after', existingEntry);
        await this.timetableRepo.update(existingEntry.id, existingEntry);
      } else {
        const updatepayload = { ...updateData };
        delete updatepayload.started_at;
        updatepayload.ended_at = end.toISOString();

        // console.log('updatepayload', updatepayload);

        await this.createOne(updatepayload);
      }
    }
  }
}
