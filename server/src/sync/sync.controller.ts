import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsISO8601, IsOptional } from 'class-validator';
import { AuthedRequest, JwtAuthGuard } from 'src/auth/JWT/jwt.authGuard';
import { SyncService } from './sync.service';
import { BatchBody } from './sync.dto';
import { assertBatchSize } from './batch';

class RestoreQuery {
  @IsOptional()
  @IsISO8601()
  since?: string;
}

@UseGuards(JwtAuthGuard)
@Controller('sync')
export class SyncController {
  constructor(private syncService: SyncService) {}

  @Post('slots')
  @HttpCode(200)
  upsertSlots(@Req() req: AuthedRequest, @Body() body: BatchBody) {
    assertBatchSize(body.items);
    return this.syncService.upsertSlots(req.user.id, body.items, body.tz);
  }

  @Post('plans')
  @HttpCode(200)
  upsertPlans(@Req() req: AuthedRequest, @Body() body: BatchBody) {
    assertBatchSize(body.items);
    return this.syncService.upsertPlans(req.user.id, body.items, body.tz);
  }

  @Post('blocks')
  @HttpCode(200)
  upsertBlocks(@Req() req: AuthedRequest, @Body() body: BatchBody) {
    assertBatchSize(body.items);
    return this.syncService.upsertBlocks(req.user.id, body.items, body.tz);
  }

  // 기기 복원용. 단일 기기 사용을 전제로 하고 삭제는 없다.
  @Get()
  restore(@Req() req: AuthedRequest, @Query() query: RestoreQuery) {
    return this.syncService.restore(req.user.id, query.since);
  }
}

@UseGuards(JwtAuthGuard)
@Controller('events')
export class EventsController {
  constructor(private syncService: SyncService) {}

  @Post()
  @HttpCode(200)
  insertEvents(@Req() req: AuthedRequest, @Body() body: BatchBody) {
    assertBatchSize(body.items);
    return this.syncService.insertEvents(req.user.id, body.items);
  }
}
