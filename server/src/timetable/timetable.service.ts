// src/timetable/timetable-entry.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TimetableEntry } from 'src/entity/timetableEntry.entity';
import { Repository } from 'typeorm';

@Injectable()
export class TimetableService {
  constructor(
    @InjectRepository(TimetableEntry)
    private timetableRepo: Repository<TimetableEntry>,
  ) {}

  async create(entryData: Partial<TimetableEntry>) {
    const entry = this.timetableRepo.create(entryData);
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
    return this.timetableRepo.findOne({
      where: { id },
      relations: ['user'],
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
