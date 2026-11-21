import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../utils/config';

/**
 * Stockage objet des photos. Bucket PRIVÉ : aucune URL publique permanente,
 * uniquement des URL signées à durée courte, générées après contrôle des droits.
 */
export interface ObjectStorage {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  /** URL de lecture signée, valable `ttlSeconds` secondes. */
  signedUrl(key: string, ttlSeconds: number): Promise<string>;
  deleteKeys(keys: string[]): Promise<void>;
  /** Supprime tous les objets dont la clé commence par `prefix`. */
  deletePrefix(prefix: string): Promise<number>;
  /** Sous-dossiers directs de `prefix` (ex. identifiants de membres sous « photos/ »). */
  listFolders(prefix: string): Promise<string[]>;
}

export class S3Storage implements ObjectStorage {
  private readonly client: S3Client;
  /** Client distinct pour signer avec l'adresse vue par les navigateurs (signature hors ligne). */
  private readonly signer: S3Client;

  constructor(
    private readonly bucket: string,
    opts: {
      endpoint?: string;
      publicEndpoint?: string;
      region: string;
      accessKeyId: string;
      secretAccessKey: string;
      forcePathStyle: boolean;
    },
  ) {
    const base = {
      region: opts.region,
      forcePathStyle: opts.forcePathStyle,
      credentials: { accessKeyId: opts.accessKeyId, secretAccessKey: opts.secretAccessKey },
    };
    this.client = new S3Client({ ...base, ...(opts.endpoint ? { endpoint: opts.endpoint } : {}) });
    const publicEndpoint = opts.publicEndpoint || opts.endpoint;
    this.signer = new S3Client({ ...base, ...(publicEndpoint ? { endpoint: publicEndpoint } : {}) });
  }

  async put(key: string, body: Buffer, contentType: string) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: 'private, max-age=600',
      }),
    );
  }

  signedUrl(key: string, ttlSeconds: number) {
    return getSignedUrl(this.signer, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn: ttlSeconds,
    });
  }

  async deleteKeys(keys: string[]) {
    for (let i = 0; i < keys.length; i += 1000) {
      const chunk = keys.slice(i, i + 1000);
      if (!chunk.length) continue;
      await this.client.send(
        new DeleteObjectsCommand({
          Bucket: this.bucket,
          Delete: { Objects: chunk.map((Key) => ({ Key })), Quiet: true },
        }),
      );
    }
  }

  async deletePrefix(prefix: string) {
    let token: string | undefined;
    let total = 0;
    do {
      const page = await this.client.send(
        new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix, ContinuationToken: token }),
      );
      const keys = (page.Contents ?? []).map((o) => o.Key!).filter(Boolean);
      await this.deleteKeys(keys);
      total += keys.length;
      token = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (token);
    return total;
  }

  async listFolders(prefix: string) {
    const folders: string[] = [];
    let token: string | undefined;
    do {
      const page = await this.client.send(
        new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix, Delimiter: '/', ContinuationToken: token }),
      );
      for (const p of page.CommonPrefixes ?? []) {
        if (p.Prefix) folders.push(p.Prefix.slice(prefix.length).replace(/\/$/, ''));
      }
      token = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (token);
    return folders;
  }
}

/** Stockage en mémoire, pour les tests (refusé en production par config.ts). */
export class MemoryStorage implements ObjectStorage {
  readonly objects = new Map<string, { body: Buffer; contentType: string }>();

  async put(key: string, body: Buffer, contentType: string) {
    this.objects.set(key, { body, contentType });
  }

  async signedUrl(key: string, ttlSeconds: number) {
    return `memory://photos/${key}?expires=${Math.floor(Date.now() / 1000) + ttlSeconds}`;
  }

  async deleteKeys(keys: string[]) {
    for (const k of keys) this.objects.delete(k);
  }

  async deletePrefix(prefix: string) {
    const keys = [...this.objects.keys()].filter((k) => k.startsWith(prefix));
    await this.deleteKeys(keys);
    return keys.length;
  }

  async listFolders(prefix: string) {
    const set = new Set<string>();
    for (const k of this.objects.keys()) {
      if (k.startsWith(prefix)) set.add(k.slice(prefix.length).split('/')[0]);
    }
    return [...set];
  }
}

let storage: ObjectStorage = config.storage.bucketPhotos
  ? new S3Storage(config.storage.bucketPhotos, config.storage)
  : new MemoryStorage();

export function getStorage(): ObjectStorage {
  return storage;
}

/** Remplace le stockage (tests). */
export function setStorage(next: ObjectStorage): void {
  storage = next;
}
