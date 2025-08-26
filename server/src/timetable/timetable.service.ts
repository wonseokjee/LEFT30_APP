// src/timetable/timetable-entry.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateTimetableDto } from 'src/dto/timetable/createTimetable.dto';
import { TimetableEntry } from 'src/entity/timetableEntry.entity';
import { Between, Repository } from 'typeorm';
import dayjs from 'dayjs';

@Injectable()
export class TimetableService {
  constructor(
    @InjectRepository(TimetableEntry)
    private timetableRepo: Repository<TimetableEntry>,
  ) {}

  async create(createTimetableDto: CreateTimetableDto) {
    const { ended_at } = createTimetableDto;

    // ended_at을 ISO 8601 문자열에서 Date 객체로 변환
    const endTime = new Date(ended_at);
    // console.log('ended_at', endedAtDate);

    // ended_at에서 30분 전 시간을 계산하여 started_at 생성
    const started_at = dayjs(endTime).subtract(30, 'minute').toDate();

    // 시작 시간과 종료 시간을 기반으로 슬롯 범위 계산
    const startTime = new Date(started_at);

    const startIndex =
      startTime.getHours() * 6 + Math.floor(startTime.getMinutes() / 10); // 시작 시간의 인덱스
    const endIndex =
      endTime.getHours() * 6 + Math.ceil(endTime.getMinutes() / 10); // 종료 시간의 인덱스

    const range = endIndex - startIndex; // 슬롯 범위 계산

    // 새로운 TimetableEntry 생성
    const entry = this.timetableRepo.create({
      ...createTimetableDto,
      started_at,
      ended_at: endTime, // 계산된 started_at 추가
      range,
    });

    // console.log('entry', entry);
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

    console.log('today', today);

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

  async update(id: string, updateData: Partial<TimetableEntry>) {
    await this.timetableRepo.update(id, updateData);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.timetableRepo.delete(id);
  }
}
