import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { S3Storage } from '../src/services/storage';
import { purgeOrphanPhotos } from '../src/jobs/cleanup';
import { api, auth, count, jpegWithGps, pool, setupTestDb, signup, storage, uploadPhoto } from './helpers';

setupTestDb();

describe('Envoi de photos', () => {
  it('supprime toutes les métadonnées EXIF (dont GPS), redimensionne et convertit en WebP', async () => {
    const original = await jpegWithGps(2400, 1800);
    const before = await sharp(original).metadata();
    expect(before.exif).toBeDefined(); // l'image d'origine contient bien des EXIF
    expect(before.exif!.toString('latin1')).toContain('TestPhone');

    const user = await signup('homme', 'Photo');
    const res = await uploadPhoto(user, original).expect(201);
    expect(res.body.photos).toHaveLength(1);

    const keys = [...storage.objects.keys()].filter((k) => k.startsWith(`photos/${user.id}/`));
    expect(keys).toHaveLength(2); // version nette + version floutée
    for (const key of keys) {
      const { body, contentType } = storage.objects.get(key)!;
      const meta = await sharp(body).metadata();
      expect(contentType).toBe('image/webp');
      expect(meta.format).toBe('webp');
      expect(meta.exif).toBeUndefined();
      expect(meta.icc).toBeUndefined();
      expect(meta.xmp).toBeUndefined();
      expect(body.toString('latin1')).not.toMatch(/TestPhone|GPS/);
      expect(Math.max(meta.width!, meta.height!)).toBeLessThanOrEqual(1600);
    }
    const { rows } = await pool.query('SELECT width, height FROM photos WHERE user_id = $1', [user.id]);
    expect(rows[0]).toEqual({ width: 1600, height: 1200 });
  });

  it('vérifie le contenu réel du fichier, pas son nom', async () => {
    const user = await signup('homme', 'Faux');
    // Texte déguisé en .jpg
    await uploadPhoto(user, Buffer.from('ceci n’est pas une image'), 'photo.jpg').expect(400);
    // SVG (formats autres que JPEG/PNG/WebP refusés)
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>');
    await uploadPhoto(user, svg, 'photo.svg').expect(400);
    // GIF
    const gif = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#000' } }).gif().toBuffer();
    await uploadPhoto(user, gif, 'photo.gif').expect(400);
    // PNG et WebP acceptés
    const png = await sharp({ create: { width: 50, height: 50, channels: 4, background: '#fff' } }).png().toBuffer();
    await uploadPhoto(user, png, 'photo.png').expect(201);
    expect(await count('photos', 'user_id = $1', user.id)).toBe(1);
  });

  it('refuse les fichiers de plus de 10 Mo et au-delà de 6 photos', async () => {
    const user = await signup('homme', 'Limites');
    const res = await uploadPhoto(user, Buffer.alloc(10 * 1024 * 1024 + 1), 'gros.jpg').expect(413);
    expect(res.body.error).toMatch(/10 Mo/);

    const small = await jpegWithGps(100, 100);
    for (let i = 0; i < 6; i++) await uploadPhoto(user, small).expect(201);
    await uploadPhoto(user, small).expect(409);
  });

  it('exige d’être connecté', async () => {
    await api().post('/api/photos').attach('photo', await jpegWithGps(10, 10), 'p.jpg').expect(401);
  });

  it('suppression et réordonnancement', async () => {
    const user = await signup('homme', 'Ordre');
    const a = (await uploadPhoto(user).expect(201)).body.id;
    const b = (await uploadPhoto(user).expect(201)).body.id;

    const reordered = await api().put('/api/photos/order').set(auth(user)).send({ ids: [b, a] }).expect(200);
    expect(reordered.body.photos.map((p: { id: string }) => p.id)).toEqual([b, a]);

    await api().delete(`/api/photos/${b}`).set(auth(user)).expect(204);
    const list = await api().get('/api/photos').set(auth(user)).expect(200);
    expect(list.body.photos).toEqual([expect.objectContaining({ id: a, position: 0 })]);
    expect([...storage.objects.keys()].filter((k) => k.includes(b))).toEqual([]);

    // On ne peut pas supprimer la photo d'un autre membre.
    const other = await signup('homme', 'Autre');
    await api().delete(`/api/photos/${a}`).set(auth(other)).expect(404);
  });
});

describe('Visibilité des photos (côté serveur)', () => {
  it('photos réservées aux matchs : floutées avant le match, nettes après', async () => {
    const lea = await signup('femme_trans', 'Lea');
    const hugo = await signup('homme', 'Hugo');
    await api().put('/api/profiles/me').set(auth(lea)).send({ photosMatchesOnly: true }).expect(200);
    await uploadPhoto(lea).expect(201);

    const seen = async () => (await api().get(`/api/profiles/${lea.id}`).set(auth(hugo)).expect(200)).body.profile;

    let profile = await seen();
    expect(profile.photosBlurred).toBe(true);
    expect(profile.photos[0]).toContain('-flou.webp');
    const discover = await api().get('/api/profiles/discover').set(auth(hugo)).expect(200);
    expect(discover.body.profiles[0].photos[0]).toContain('-flou.webp');

    await api().post(`/api/likes/${lea.id}`).set(auth(hugo)).expect(201);
    await api().post(`/api/likes/${hugo.id}`).set(auth(lea)).expect(201);

    profile = await seen();
    expect(profile.photosBlurred).toBe(false);
    expect(profile.photos[0]).not.toContain('-flou');

    // La propriétaire voit toujours ses photos nettes.
    const own = await api().get('/api/profiles/me').set(auth(lea)).expect(200);
    expect(own.body.profile.photos[0]).not.toContain('-flou');
  });
});

describe('URL signées S3', () => {
  it('sont signées, à durée courte, sans accès public', async () => {
    const s3 = new S3Storage('coeurvrai-photos', {
      endpoint: 'http://minio:9000',
      publicEndpoint: 'https://s3.example.test',
      region: 'gra',
      accessKeyId: 'AKIAEXAMPLE',
      secretAccessKey: 'secret-example',
      forcePathStyle: true,
    });
    const url = new URL(await s3.signedUrl('photos/u/p.webp', 600));
    expect(url.origin).toBe('https://s3.example.test'); // adresse publique, pas l'adresse interne
    expect(url.pathname).toBe('/coeurvrai-photos/photos/u/p.webp');
    expect(url.searchParams.get('X-Amz-Expires')).toBe('600');
    expect(url.searchParams.get('X-Amz-Signature')).toMatch(/^[0-9a-f]{64}$/);
    // Pas de paramètre de somme de contrôle (incompatible avec les S3 hors AWS).
    expect(url.searchParams.has('x-amz-checksum-mode')).toBe(false);
  });
});

describe('Nettoyage des fichiers orphelins', () => {
  it('supprime les dossiers de membres qui n’existent plus', async () => {
    const user = await signup('homme', 'Reste');
    await uploadPhoto(user).expect(201);
    await storage.put('photos/00000000-0000-4000-8000-000000000000/x.webp', Buffer.from('x'), 'image/webp');

    expect(await purgeOrphanPhotos()).toBe(1);
    expect([...storage.objects.keys()].some((k) => k.includes('00000000-0000-4000'))).toBe(false);
    expect([...storage.objects.keys()].filter((k) => k.includes(user.id))).toHaveLength(2);
  });
});

describe('Stockage en mémoire (site de test) : URL signées servies par l’API', () => {
  it('sert la photo avec une signature valide, refuse sinon', async () => {
    const user = await signup('homme', 'Memoire');
    const res = await uploadPhoto(user).expect(201);
    const url: string = res.body.photos[0].url;
    expect(url).toMatch(/^\/api\/photos\/fichier\/photos\/.+\?e=\d+&s=/);

    const ok = await api().get(url).expect(200);
    expect(ok.headers['content-type']).toBe('image/webp');

    await api().get(url.replace(/s=[^&]+/, 's=falsifiee')).expect(403);
    await api().get(url.replace(/e=\d+/, 'e=1000')).expect(403); // expirée
    await api().get(url.split('?')[0]).expect(403); // sans signature
  });
});
