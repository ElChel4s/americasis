import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url().default('postgresql://postgres:postgres@localhost:5432/sistema_america'),
  JWT_SECRET: z.string().min(16).default('super_secret_jwt_key_america_erp_2026_dev'),
  STORAGE_DRIVER: z.enum(['SUPABASE', 'LOCAL']).default('LOCAL'),
  SUPABASE_URL: z.string().url().optional().or(z.literal('')),
  SUPABASE_ANON_KEY: z.string().optional().or(z.literal('')),
  ENABLE_AUTH: z.union([z.boolean(), z.string()]).transform((s) => s === true || s === 'true').default(true),
  ENABLE_SEARCH: z.union([z.boolean(), z.string()]).transform((s) => s === true || s === 'true').default(true),
  ENABLE_DASHBOARD: z.union([z.boolean(), z.string()]).transform((s) => s === true || s === 'true').default(true),
  ENABLE_EVIDENCES: z.union([z.boolean(), z.string()]).transform((s) => s === true || s === 'true').default(true),
  ENABLE_DOCX: z.union([z.boolean(), z.string()]).transform((s) => s === true || s === 'true').default(true),
});

const _env = envSchema.safeParse({
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/sistema_america',
  JWT_SECRET: process.env.JWT_SECRET || 'super_secret_jwt_key_america_erp_2026_dev',
  STORAGE_DRIVER: process.env.STORAGE_DRIVER || 'LOCAL',
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
  ENABLE_AUTH: process.env.ENABLE_AUTH !== 'false',
  ENABLE_SEARCH: process.env.ENABLE_SEARCH ?? 'true',
  ENABLE_DASHBOARD: process.env.ENABLE_DASHBOARD ?? 'true',
  ENABLE_EVIDENCES: process.env.ENABLE_EVIDENCES ?? 'true',
  ENABLE_DOCX: process.env.ENABLE_DOCX ?? 'true',
});

if (!_env.success) {
  if (typeof window === 'undefined') {
    console.error('❌ Entorno inválido:', _env.error.format());
  }
}

export const env = _env.success ? _env.data : {
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/sistema_america',
  JWT_SECRET: 'super_secret_jwt_key_america_erp_2026_dev',
  STORAGE_DRIVER: 'LOCAL',
  ENABLE_AUTH: true,
  ENABLE_SEARCH: true,
  ENABLE_DASHBOARD: true,
  ENABLE_EVIDENCES: true,
  ENABLE_DOCX: true,
};
