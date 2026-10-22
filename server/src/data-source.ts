// typeorm CLI 진입점: npm run migration:run (환경 변수는 node --env-file로 읽는다)
import { DataSource } from 'typeorm';
import { dbOptions } from './db.config';

export default new DataSource(dbOptions(process.env));
