import { env } from './env';

export const features = {
  auth: env.ENABLE_AUTH !== false,
  search: env.ENABLE_SEARCH,
  dashboard: env.ENABLE_DASHBOARD,
  evidences: env.ENABLE_EVIDENCES,
  docx: env.ENABLE_DOCX,
};
