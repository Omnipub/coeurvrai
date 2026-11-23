# Site de test sur Render — mode d'emploi

> **Données fictives uniquement.** Render est un prestataire américain : on n'y met **aucune
> vraie personne**, aucune vraie photo, aucune vraie adresse e-mail de membre. Utilisez des
> adresses du type `test1@example.com` et des photos d'objets ou de paysages.
> La production, elle, sera hébergée en France (voir `DEPLOIEMENT.md`).

Le fichier `render.yaml`, à la racine du dépôt, décrit tout le site de test. Render crée
d'un coup **4 éléments**, tous gratuits, en région **Francfort** :

| Élément Render | Rôle |
|---|---|
| `coeurvrai-staging` (Web Service) | le site (Next.js), c'est l'adresse à ouvrir |
| `coeurvrai-staging-api` (Web Service) | l'API et le chat en temps réel |
| `coeurvrai-staging-db` (PostgreSQL) | la base de données |
| `coeurvrai-staging-kv` (Key Value) | Redis (limites de débit, chat) |

---

## 1. Créer le site de test (une seule fois, ~15 minutes)

1. Sur **dashboard.render.com** : **New** › **Blueprint**.
2. Choisir le dépôt **Omnipub/coeurvrai**, branche **`infra/production`**
   (ou **`main`** une fois la pull request n° 1 fusionnée).
3. Render lit `render.yaml` et affiche les 4 éléments. Nom du Blueprint : `coeurvrai-staging`.
   Cliquer **Apply** (ou **Deploy Blueprint**).
4. Attendre que les deux Web Services soient **Live** (la première construction prend
   5 à 10 minutes).

### Vérifier les adresses (important)

Le site et l'API doivent se connaître l'un l'autre. `render.yaml` suppose ces adresses :

- site : `https://coeurvrai-staging.onrender.com`
- API : `https://coeurvrai-staging-api.onrender.com`

Si l'un de ces noms était déjà pris, Render ajoute un suffixe (par ex.
`coeurvrai-staging-x7k2.onrender.com`). L'adresse réelle s'affiche en haut de la page de
chaque service. **Si elle diffère :**

- adresse du **site** différente → service `coeurvrai-staging-api` › **Environment** ›
  `PUBLIC_HOST` = la nouvelle adresse **sans** `https://` › **Save changes** ;
- adresse de l'**API** différente → service `coeurvrai-staging` › **Environment** ›
  `BACKEND_URL` = la nouvelle adresse **sans** `https://` › **Save, rebuild, and deploy**
  (cette valeur est intégrée au moment de la construction).

Pensez à reporter la correction dans `render.yaml` pour la prochaine fois.

### Contrôle rapide

- `https://coeurvrai-staging-api.onrender.com/health` doit afficher `{"status":"ok"}` ;
- le site doit afficher un **bandeau orange « Site de test — données fictives uniquement »**.

## 2. Tester

1. **S'inscrire** avec une adresse fictive (`test1@example.com`).
2. **Confirmer l'e-mail** : aucun e-mail n'est envoyé. Le contenu s'affiche dans les journaux :
   service `coeurvrai-staging-api` › **Logs**, chercher la ligne `[mail]`, puis ouvrir
   le lien qui s'y trouve.
3. Créer un **deuxième compte** dans une fenêtre de navigation privée (`test2@example.com`),
   pour tester les likes, le match et le chat entre les deux.
4. Envoyer des photos de test (objets, paysages) : elles sont gardées **en mémoire** et
   **disparaissent à chaque redémarrage de l'API**. C'est voulu : rien n'est stocké durablement.

La vérification d'identité Onfido n'est pas branchée sur le site de test (pas de clé).

## 3. À savoir sur l'offre gratuite

| Comportement | Conséquence |
|---|---|
| Les Web Services **s'endorment après ~15 min** sans visite | la première page met 30 à 60 s à s'afficher ; ensuite c'est normal. Ouvrir d'abord l'adresse `/health` de l'API pour la réveiller. |
| La base PostgreSQL gratuite **expire au bout de 30 jours** | Render prévient par e-mail ; il suffit de la supprimer et de relancer le Blueprint (les données de test sont perdues, sans importance). |
| Redis gratuit n'est pas sauvegardé | aucune conséquence (rien d'important n'y est stocké). |
| Chaque redémarrage de l'API efface les photos | renvoyer des photos de test. |

Aucune carte bancaire n'est nécessaire tant que tout reste sur l'offre **Free**. Si Render
propose de passer à une offre payante, **refuser** : ce n'est pas utile pour des tests.

## 4. Mettre à jour le site de test

Chaque `git push` sur la branche choisie à l'étape 1 redéploie automatiquement le site et
l'API. Les migrations de la base sont jouées au démarrage de l'API.

## 5. Ce qui diffère de la production (volontairement)

- pas de Caddy : le site relaie lui-même `/api` et `/socket.io` vers l'API ;
- photos en mémoire et non dans un stockage S3 ;
- e-mails affichés dans les journaux au lieu d'être envoyés ;
- site interdit aux moteurs de recherche (`robots.txt` et balises `noindex`) ;
- pas de sauvegardes.

## 6. En cas de problème

| Symptôme | Cause probable | Solution |
|---|---|---|
| Inscription : « Erreur réseau » ou page `/api/...` introuvable | `BACKEND_URL` incorrecte | voir « Vérifier les adresses » ci-dessus, puis **rebuild** |
| Erreur « Origine de la requête non autorisée » | `PUBLIC_HOST` incorrecte | corriger `PUBLIC_HOST` sur l'API |
| Le chat ne s'actualise pas en direct | API endormie ou redémarrée | recharger la page |
| L'API ne démarre pas, journaux : erreur de base | base expirée (30 jours) | recréer la base (section 3) |

Pour tout supprimer : **Blueprints** › `coeurvrai-staging` › supprimer, puis supprimer les
4 éléments.
