import type { Profile } from '@/types';
import { ProfilePhoto } from './ProfilePhoto';
import { VerifiedBadge } from './VerifiedBadge';

interface Props {
  profile: Profile;
  onLike?: () => void;
  onPass?: () => void;
}

export function ProfileCard({ profile, onLike, onPass }: Props) {
  const photo = profile.photos[0];

  return (
    <article className="overflow-hidden rounded-2xl bg-white shadow-md">
      <div className="relative aspect-[3/4] bg-coeur-100">
        {photo ? (
          <ProfilePhoto
            src={photo}
            alt={`Photo de profil de ${profile.displayName}, ${profile.age} ans`}
            sizes="(max-width: 672px) 100vw, 640px"
            priority
          />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-coeur-700">
            {profile.photosMatchesOnly
              ? 'Photos visibles après un match'
              : 'Pas encore de photo'}
          </div>
        )}
      </div>

      <div className="space-y-2 p-4">
        <h2 className="text-xl font-semibold">
          {profile.displayName}, {profile.age}
          {profile.pronouns && (
            <span className="ml-2 text-sm font-normal text-gray-500">({profile.pronouns})</span>
          )}
        </h2>
        {profile.verified && <VerifiedBadge />}
        {profile.city && <p className="text-sm text-gray-500">{profile.city}</p>}
        {profile.bio && <p className="text-gray-700">{profile.bio}</p>}

        {(onLike || onPass) && (
          <div className="flex gap-3 pt-2">
            {onPass && (
              <button
                onClick={onPass}
                className="flex-1 rounded-full border border-gray-300 py-2 font-medium hover:bg-gray-50"
              >
                Passer
              </button>
            )}
            {onLike && (
              <button
                onClick={onLike}
                className="flex-1 rounded-full bg-coeur-500 py-2 font-medium text-white hover:bg-coeur-600"
              >
                ♥ J&apos;aime
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
