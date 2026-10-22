import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1792540800000 implements MigrationInterface {
  name = 'Init1792540800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "kakao_id" varchar NOT NULL UNIQUE,
        "quiet_start_min" int CHECK ("quiet_start_min" BETWEEN 0 AND 1439),
        "quiet_end_min" int CHECK ("quiet_end_min" BETWEEN 0 AND 1439),
        "refresh_token_hash" varchar,
        "last_tz" varchar,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )`);

    await queryRunner.query(`
      CREATE TABLE "slot" (
        "user_id" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "slot_start" timestamptz NOT NULL,
        "tz" varchar NOT NULL,
        "category" varchar NOT NULL CHECK ("category" IN
          ('sleep','rest','exercise','relationship','self_dev','work')),
        "note" text,
        "source" varchar NOT NULL CHECK ("source" IN
          ('answered','continued','late','inferred')),
        "answered_at" timestamptz,
        "client_updated_at" timestamptz NOT NULL,
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY ("user_id", "slot_start")
      )`);
    // ENG-3: since 커서 조회
    await queryRunner.query(
      `CREATE INDEX "idx_slot_user_updated" ON "slot" ("user_id", "updated_at")`,
    );

    await queryRunner.query(`
      CREATE TABLE "plan" (
        "user_id" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "local_date" date NOT NULL,
        "category" varchar NOT NULL CHECK ("category" IN
          ('sleep','rest','exercise','relationship','self_dev','work')),
        "target_minutes" int NOT NULL CHECK ("target_minutes" BETWEEN 0 AND 1440),
        "client_updated_at" timestamptz NOT NULL,
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY ("user_id", "local_date", "category")
      )`);
    await queryRunner.query(
      `CREATE INDEX "idx_plan_user_updated" ON "plan" ("user_id", "updated_at")`,
    );

    await queryRunner.query(`
      CREATE TABLE "event" (
        "id" uuid PRIMARY KEY,
        "user_id" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "type" varchar NOT NULL,
        "ts" timestamptz NOT NULL,
        "props" jsonb NOT NULL DEFAULT '{}'
      )`);
    // R8: 지표 집계
    await queryRunner.query(
      `CREATE INDEX "idx_event_user_type_ts" ON "event" ("user_id", "type", "ts")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "event"`);
    await queryRunner.query(`DROP TABLE "plan"`);
    await queryRunner.query(`DROP TABLE "slot"`);
    await queryRunner.query(`DROP TABLE "user"`);
  }
}
