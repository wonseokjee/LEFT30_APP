import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
// import { kakaoProfile } from 'src/@Types/user/userType';
// import { Todo } from 'src/entity/todo.entity';
import { User } from 'src/entity/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    // private readonly todoRepository: Repository<Todo>,
  ) {}

  // create(createUserDto: any) {
  //   // 사용자 정보 없이 User를 생성
  //   const user = this.todoRepository.create(createUserDto);
  //   return this.todoRepository.save(user);
  //   // return user;
  // }

  // async findOne(): Promise<User[]> {
  //   // 사용자 정보 없이 모든 User를 조회
  //   const user = await this.todoRepository.findOne({
  //     where: { id: 'cddba932-7fb4-41b6-b8ba-ab17d4bcf0cf' },
  //   });
  //   // return this.userRepository.findAll(); // req.user 타입 확인 필요
  //   return user ? [user] : []; // 사용자 정보가 없으면 빈 배열 반환
  // }

  //JWT 인증을 위한 사용자 조회 메서드
  async findOneById(userId: string): Promise<User | null> {
    // 사용자 ID로 User를 조회
    console.log('Finding user by ID:', userId);
    return this.userRepo.findOne({ where: { id: userId } });
  }

  //auth.repository로 가야함
  async findOrCreateByKakao(kakao_Id: number): Promise<string> {
    const kakaoId = kakao_Id.toString();
    // const email = kakaoProfile.kakao_account?.email ?? null;
    let user = await this.userRepo.findOne({ where: { kakaoId: kakaoId } });
    // console.log('User found:', user);
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
    // 사용자 정보를 업데이트
    // const userId = await this.userRepo.findOne({ where: { id: userId } });
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
}
