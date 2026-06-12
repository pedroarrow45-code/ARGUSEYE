export interface StorageAdapter {
  upload(key: string, data: Buffer, contentType: string): Promise<string>;
  download(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
  getUrl(key: string): string;
}

export class LocalStorageAdapter implements StorageAdapter {
  private store = new Map<string, { data: Buffer; contentType: string }>();

  async upload(key: string, data: Buffer, contentType: string): Promise<string> {
    this.store.set(key, { data, contentType });
    return `/storage/${key}`;
  }

  async download(key: string): Promise<Buffer | null> {
    return this.store.get(key)?.data ?? null;
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  getUrl(key: string): string {
    return `/storage/${key}`;
  }
}

export class BlobStorageAdapter implements StorageAdapter {
  async upload(key: string, _data: Buffer, _contentType: string): Promise<string> {
    throw new Error(`BlobStorageAdapter.upload not implemented. Key: ${key}. Configure BLOB_READ_WRITE_TOKEN.`);
  }

  async download(_key: string): Promise<Buffer | null> {
    throw new Error('BlobStorageAdapter.download not implemented. Configure BLOB_READ_WRITE_TOKEN.');
  }

  async delete(_key: string): Promise<void> {
    throw new Error('BlobStorageAdapter.delete not implemented. Configure BLOB_READ_WRITE_TOKEN.');
  }

  getUrl(key: string): string {
    return `/blob/${key}`;
  }
}

export function getStorageAdapter(): StorageAdapter {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return new BlobStorageAdapter();
  }
  return new LocalStorageAdapter();
}
