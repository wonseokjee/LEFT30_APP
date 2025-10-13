import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TimetableEntry } from 'src/Entity/timetableEntry.entity';
import { Todo } from 'src/Entity/todo.entity';
import { User } from 'src/Entity/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(TimetableEntry)
    private timetableRepo: Repository<TimetableEntry>,
    @InjectRepository(Todo)
    private todoRepo: Repository<Todo>,
  ) {}

  //JWT 인증을 위한 사용자 조회 메서드
  async findOneById(userId: string): Promise<User | null> {
    // 사용자 ID로 User를 조회
    console.log('Finding user by ID:', userId);
    return this.userRepo.findOne({ where: { id: userId } });
  }

  //auth.repository로 가야함
  async findOrCreateByKakao(kakao_Id: number): Promise<string> {
    const kakaoId = kakao_Id.toString();
    let user = await this.userRepo.findOne({ where: { kakaoId: kakaoId } });
    if (!user) {
      user = this.userRepo.create({
        kakaoId: kakaoId,
        // email,
        // 필요하다면 닉네임 등 추가
        // nickname: kakaoProfile.properties?.nickname ?? null,
      });
      await this.userRepo.save(user);
    }
    return user.id;
  }

  async findQuietTimeById(userId: string) {
    // 사용자 정보를 업데이트
    const user = await this.userRepo.findOne({ where: { id: userId } });
    return {
      quietStartHour: user?.quietStartHour,
      quietStartMinute: user?.quietStartMinute,
      quietEndHour: user?.quietEndHour,
      quietEndMinute: user?.quietEndMinute,
    };
  }

  async updateQuietTime(
    userId: string,
    quietStartHour: number,
    quietStartMinute: number,
    quietEndHour: number,
    quietEndMinute: number,
  ) {
    try {
      await this.userRepo.update(userId, {
        quietStartHour: quietStartHour,
        quietStartMinute: quietStartMinute,
        quietEndHour: quietEndHour,
        quietEndMinute: quietEndMinute,
      });
      return { status: 'success' };
    } catch (error) {
      console.log(error);
      return { status: 'error' };
    }
  }
  async deleteUser(userId: string): Promise<void> {
    // 1. timetable 삭제
    await this.timetableRepo.delete({ user: { id: userId } });
    // 2. todo 삭제
    await this.todoRepo.delete({ user: { id: userId } });
    // 3. user 삭제
    await this.userRepo.delete({ id: userId });
  }
}
