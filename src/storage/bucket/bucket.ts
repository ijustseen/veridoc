import { createClient } from '@supabase/supabase-js';

// Проверяем наличие переменных окружения
if (!process.env.SUPABASE_URL) {
  console.error('SUPABASE_URL не установлен');
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY не установлен');
}
if (!process.env.SUPABASE_ANON_KEY) {
  console.error('SUPABASE_ANON_KEY не установлен');
}
if (!process.env.OPEN_DOCS_BUCKET) {
  console.error('OPEN_DOCS_BUCKET не установлен');
}
if (!process.env.ENCRYPTED_DOCS_BUCKET) {
  console.error('ENCRYPTED_DOCS_BUCKET не установлен');
}

// Клиент с service_role для загрузки файлов (обходит RLS)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Клиент с anon_key для получения публичных ссылок
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export type BucketName = string;

/**
 * Автоматически выбирает бакет на основе флага is_public
 * @param is_public если true - open_docs, если false - encrypted_docs
 * @returns имя бакета
 */
export function getBucketName(is_public: boolean): BucketName {
  const bucketName = is_public ? process.env.OPEN_DOCS_BUCKET! : process.env.ENCRYPTED_DOCS_BUCKET!;
  return bucketName;
}

/**
 * Загружает файл в указанный бакет Supabase Storage
 * @param bucketName имя бакета
 * @param path путь внутри бакета (например, 'user1/file.pdf')
 * @param file File | Blob | Buffer
 * @returns {Promise<string | null>} Путь к файлу в бакете или null
 */
export async function uploadFileToBucket(bucketName: BucketName, path: string, file: File | Blob | Buffer): Promise<string | null> {  
  const { data, error } = await supabaseAdmin.storage.from(bucketName).upload(path, file, {
    upsert: true,
  });
  if (error) {
    console.error('Ошибка загрузки файла в бакет:', error);
    console.error('Детали ошибки:', {
      message: error.message,
      name: error.name,
      statusCode: (error as any).statusCode,
      error: (error as any).error
    });
    return null;
  }
  return data?.path || null;
}

/**
 * Получить публичную ссылку на файл в указанном бакете
 * @param bucketName имя бакета
 * @param path путь внутри бакета (например, 'user1/file.pdf')
 * @returns {string} Публичная ссылка
 */
export function getPublicUrlFromBucket(bucketName: BucketName, path: string): string {
  const { data } = supabase.storage.from(bucketName).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Загружает файл в указанный бакет и возвращает публичную ссылку
 * @param bucketName имя бакета
 * @param path путь внутри бакета (например, 'user1/file.pdf')
 * @param file File | Blob | Buffer
 * @returns {Promise<string | null>} Публичная ссылка или null
 */
export async function uploadAndGetPublicUrl(bucketName: BucketName, path: string, file: File | Blob | Buffer): Promise<string | null> {
  const uploadedPath = await uploadFileToBucket(bucketName, path, file);
  if (!uploadedPath) {
    console.error('uploadFileToBucket вернул null');
    return null;
  }

  const publicUrl = getPublicUrlFromBucket(bucketName, uploadedPath);
  return publicUrl;
}

/**
 * Загружает файл в автоматически выбранный бакет на основе is_public
 * @param is_public если true - загружает в open_docs, если false - в encrypted_docs
 * @param path путь внутри бакета
 * @param file файл для загрузки
 * @returns публичная ссылка или null
 */
export async function uploadAndGetPublicUrlByType(is_public: boolean, path: string, file: File | Blob | Buffer): Promise<string | null> {
  const bucketName = getBucketName(is_public);
  return uploadAndGetPublicUrl(bucketName, path, file);
} 