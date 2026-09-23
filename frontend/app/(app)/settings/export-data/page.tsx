import Link from 'next/link';
import { ExportDataButton } from '@/components/ExportDataButton';

export default function ExportDataPage() {
  return (
    <div className="space-y-5">
      <Link href="/settings" className="text-sm text-gray-500 hover:text-gray-800">
        ← Paramètres
      </Link>
      <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold">Exporter mes données</h1>
        <p className="text-gray-700">
          Conformément au RGPD (droit d’accès et droit à la portabilité), vous pouvez télécharger
          une copie de vos données au format JSON, lisible par la plupart des logiciels.
        </p>
        <div>
          <p className="mb-1 font-medium">Le fichier contient :</p>
          <ul className="list-disc space-y-1 pl-6 text-sm text-gray-700">
            <li>votre compte (e-mail, date de naissance, type de compte, dates clés) ;</li>
            <li>vos consentements (dates et version des textes acceptés) ;</li>
            <li>votre dernière activité et l’historique de vos adresses IP (12 derniers mois) ;</li>
            <li>votre profil et vos photos ;</li>
            <li>les likes que vous avez donnés, et la date des likes reçus ;</li>
            <li>vos matchs et les messages que vous avez envoyés ;</li>
            <li>vos blocages et vos signalements ;</li>
            <li>les signalements vous concernant (motif et statut).</li>
          </ul>
        </div>
        <p className="text-sm text-gray-500">
          Pour protéger la vie privée des autres membres, le fichier n’inclut ni les messages
          qu’ils vous ont envoyés, ni l’identité des personnes qui vous ont liké·e ou signalé·e.
          Votre mot de passe n’est jamais exporté.
        </p>
        <ExportDataButton />
      </section>
    </div>
  );
}
