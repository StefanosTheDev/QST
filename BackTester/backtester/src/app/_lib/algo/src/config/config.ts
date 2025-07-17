import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
export const getApiKey = (): string => {
  const key =
    process.env.DATABENTO_API_KEY || 'db-XTiaLkTXu7VDC4jTvSpVwXGwqa9Pw';
  if (!key)
    throw new Error('❌ Please set DATABENTO_API_KEY in your .env file');
  return key;
};
