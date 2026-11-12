import { MigrationInterface, QueryRunner } from 'typeorm';

// 집중 블록·계획 블록과 칸 출처 declared·batch (docs/designs/left30-focus-block.md E1·E2)
export class Block1794441600000 implements MigrationInterface {
  name = 'Block1794441600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "block" (
        "user_id" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "id" uuid NOT NULL,
        "kind" varchar NOT NULL CHECK ("kind" IN ('focus','plan')),
        "category" varchar NOT NULL CHECK ("category" IN
          ('sleep','rest','exercise','relationship','self_dev','work')),
        "title" varchar(100),
        "start_at" timestamptz NOT NULL,
        "end_at" timestamptz NOT NULL,
        "tz" varchar NOT NULL,
        "state" varchar NOT NULL CHECK ("state" IN
          ('planned','active','awaiting','ended','cancelled')),
        "ended_how" varchar CHECK ("ended_how" IN
          ('answer','extend','end_now','no_answer','checked')),
        "deleted" boolean NOT NULL DEFAULT false,
        "client_updated_at" timestamptz NOT NULL,
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY ("user_id", "id"),
        CHECK ("end_at" > "start_at" AND "end_at" - "start_at" <= interval '24 hours')
      )`);
    await queryRunner.query(
      `CREATE INDEX "idx_block_user_updated" ON "block" ("user_id", "updated_at")`,
    );

    await queryRunner.query(
      `ALTER TABLE "slot" DROP CONSTRAINT "slot_source_check"`,
    );
    await queryRunner.query(`
      ALTER TABLE "slot" ADD CONSTRAINT "slot_source_check" CHECK ("source" IN
        ('answered','continued','late','inferred','declared','batch'))`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "slot" DROP CONSTRAINT "slot_source_check"`,
    );
    await queryRunner.query(`
      ALTER TABLE "slot" ADD CONSTRAINT "slot_source_check" CHECK ("source" IN
        ('answered','continued','late','inferred'))`);
    await queryRunner.query(`DROP TABLE "block"`);
  }
}
