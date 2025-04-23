import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/entity/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly todoRepository: Repository<User>,
  ) {}

  create(createUserDto: any) {
    // 사용자 정보 없이 User를 생성
    const user = this.todoRepository.create(createUserDto);
    return this.todoRepository.save(user);
    // return user;
  }

  async findOne(): Promise<User[]> {
    // 사용자 정보 없이 모든 User를 조회
    const user = await this.todoRepository.findOne({
      where: { id: 'cddba932-7fb4-41b6-b8ba-ab17d4bcf0cf' },
    });
    // return this.userRepository.findAll(); // req.user 타입 확인 필요
    return user ? [user] : []; // 사용자 정보가 없으면 빈 배열 반환
  }
}
