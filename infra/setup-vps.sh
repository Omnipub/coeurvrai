#!/usr/bin/env bash
# =============================================================================
# Durcissement d'un VPS neuf Ubuntu 24.04 LTS pour Cœur Vrai.
# À lancer UNE FOIS, en root, sur le serveur fraîchement livré par OVH :
#
#   sudo SSH_PORT=22 bash setup-vps.sh
#
# Le script est « idempotent » : le relancer ne casse rien, il remet chaque
# réglage dans l'état attendu. Chaque étape est expliquée en commentaire.
# =============================================================================
set -euo pipefail

# --- Paramètres (modifiables en variables d'environnement) -------------------
DEPLOY_USER="${DEPLOY_USER:-deploy}"   # compte qui administre le site (jamais root)
SSH_PORT="${SSH_PORT:-22}"             # port SSH (option : un port personnalisé, ex. 2222)
SWAP_SIZE="${SWAP_SIZE:-2G}"           # mémoire d'échange (sécurité si la RAM sature)
APP_DIR="${APP_DIR:-/opt/coeurvrai}"   # dossier du site sur le serveur

step() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }   # affiche le titre de chaque étape

# Le script doit tourner en root, sur Ubuntu 24.04.
[ "$(id -u)" -eq 0 ] || { echo "Lancer ce script en root (sudo)." >&2; exit 1; }
. /etc/os-release
[ "${VERSION_ID:-}" = "24.04" ] || echo "Attention : prévu pour Ubuntu 24.04 (détecté : ${PRETTY_NAME:-inconnu})."

# --- 1. Mises à jour et paquets de base --------------------------------------
step "Mise à jour du système et installation des outils"
export DEBIAN_FRONTEND=noninteractive                      # aucune question pendant l'installation
apt-get update -q                                          # liste des paquets à jour
apt-get -y -q upgrade                                      # correctifs de sécurité déjà publiés
apt-get -y -q install ufw fail2ban unattended-upgrades \
  ca-certificates curl gnupg chrony                        # pare-feu, anti-intrusion, MAJ auto, NTP

# --- 2. Heure : fuseau de Paris et synchronisation NTP -----------------------
step "Fuseau horaire Europe/Paris et synchronisation de l'heure (NTP)"
timedatectl set-timezone Europe/Paris                      # heures des journaux et des sauvegardes
systemctl enable --now chrony                              # horloge synchronisée (certificats, jetons)

# --- 3. Utilisateur « deploy » ----------------------------------------------
step "Utilisateur $DEPLOY_USER (connexion par clé SSH uniquement)"
if ! id "$DEPLOY_USER" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$DEPLOY_USER"    # compte sans mot de passe de connexion
fi
usermod -aG sudo "$DEPLOY_USER"                            # administration via sudo (mot de passe demandé)
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
keys="/home/$DEPLOY_USER/.ssh/authorized_keys"
# Reprend les clés SSH déjà installées par OVH (root ou utilisateur « ubuntu »), sans doublon.
for src in /root/.ssh/authorized_keys /home/ubuntu/.ssh/authorized_keys; do
  [ -f "$src" ] && cat "$src" >> "$keys"
done
[ -n "${SSH_PUBKEY:-}" ] && echo "$SSH_PUBKEY" >> "$keys"  # ou une clé fournie en paramètre
[ -f "$keys" ] && sort -u "$keys" -o "$keys"
chown "$DEPLOY_USER:$DEPLOY_USER" "$keys" 2>/dev/null || true
chmod 600 "$keys" 2>/dev/null || true
# Sécurité : on ne coupe pas l'accès par mot de passe tant qu'aucune clé n'est en place.
if [ ! -s "$keys" ]; then
  echo "ERREUR : aucune clé SSH pour $DEPLOY_USER. Relancer avec SSH_PUBKEY=\"ssh-ed25519 …\"." >&2
  exit 1
fi
# Mot de passe sudo : demandé une seule fois (il ne sert jamais à se connecter en SSH).
if passwd -S "$DEPLOY_USER" | awk '{exit !($2=="L" || $2=="NP")}'; then
  echo "Choisir le mot de passe sudo de $DEPLOY_USER (à garder dans le gestionnaire de mots de passe) :"
  passwd "$DEPLOY_USER"
fi

# --- 4. SSH : clé uniquement, root interdit ----------------------------------
step "Durcissement SSH (port $SSH_PORT)"
cat > /etc/ssh/sshd_config.d/99-coeurvrai.conf <<CONF
# Géré par infra/setup-vps.sh — Cœur Vrai
Port $SSH_PORT
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
AuthenticationMethods publickey
AllowUsers $DEPLOY_USER
MaxAuthTries 3
LoginGraceTime 30
X11Forwarding no
AllowAgentForwarding no
ClientAliveInterval 300
ClientAliveCountMax 2
CONF
# Ubuntu 24.04 démarre SSH « à la demande » (socket) : le port s'y règle aussi.
mkdir -p /etc/systemd/system/ssh.socket.d
cat > /etc/systemd/system/ssh.socket.d/port.conf <<CONF
[Socket]
ListenStream=
ListenStream=$SSH_PORT
CONF
sshd -t                                                    # vérifie la configuration AVANT d'appliquer

# --- 5. Pare-feu UFW : seuls SSH, 80 et 443 sont ouverts ---------------------
step "Pare-feu UFW"
ufw --force reset >/dev/null                               # repart d'une base propre (idempotent)
ufw default deny incoming                                  # tout ce qui entre est refusé…
ufw default allow outgoing                                 # …sauf ce qui est autorisé ci-dessous
ufw limit "$SSH_PORT/tcp" comment 'SSH (limite les tentatives)'
ufw allow 80/tcp comment 'HTTP (redirigé vers HTTPS)'
ufw allow 443/tcp comment 'HTTPS'
ufw allow 443/udp comment 'HTTP/3'
ufw --force enable

# Application des réglages SSH (le pare-feu autorise déjà le nouveau port).
systemctl daemon-reload
systemctl restart ssh.socket 2>/dev/null || true
systemctl restart ssh

# --- 6. fail2ban : bannit les adresses qui insistent sur SSH ------------------
step "fail2ban pour SSH"
cat > /etc/fail2ban/jail.d/coeurvrai.local <<CONF
[sshd]
enabled  = true
port     = $SSH_PORT
backend  = systemd
maxretry = 5
findtime = 10m
bantime  = 1h
CONF
systemctl enable fail2ban
systemctl restart fail2ban

# --- 7. Mises à jour de sécurité automatiques --------------------------------
step "Mises à jour de sécurité automatiques (unattended-upgrades)"
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'CONF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
CONF
cat > /etc/apt/apt.conf.d/51coeurvrai-unattended <<'CONF'
// Redémarre si un correctif l'exige (noyau), à 2 h 30, avant la sauvegarde de 3 h.
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "02:30";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
CONF
systemctl enable --now unattended-upgrades

# --- 8. Docker Engine + Compose (dépôt officiel Docker) -----------------------
step "Installation de Docker Engine et du plugin Compose"
install -m 0755 -d /etc/apt/keyrings
if [ ! -f /etc/apt/keyrings/docker.asc ]; then
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
fi
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" > /etc/apt/sources.list.d/docker.list
apt-get update -q
apt-get -y -q install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
# Réglages Docker : journaux limités, pas d'élévation de privilèges, conteneurs maintenus
# pendant une mise à jour de Docker.
cat > /etc/docker/daemon.json <<'CONF'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "5" },
  "no-new-privileges": true,
  "live-restore": true,
  "userland-proxy": false
}
CONF
systemctl enable docker
systemctl restart docker
# « deploy » peut piloter Docker (attention : équivaut à des droits d'administration).
usermod -aG docker "$DEPLOY_USER"

# --- 9. Mémoire d'échange (swap) ---------------------------------------------
step "Swap de $SWAP_SIZE"
if [ ! -f /swapfile ]; then
  fallocate -l "$SWAP_SIZE" /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
fi
swapon --show | grep -q /swapfile || swapon /swapfile
grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
echo 'vm.swappiness=10' > /etc/sysctl.d/90-coeurvrai-swap.conf   # n'utiliser le swap qu'en dernier recours

# --- 10. Réglages réseau du noyau --------------------------------------------
step "Réglages réseau du noyau"
cat > /etc/sysctl.d/91-coeurvrai-net.conf <<'CONF'
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.all.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.tcp_syncookies = 1
CONF
sysctl --system >/dev/null

# --- 11. Dossier du site ------------------------------------------------------
step "Dossier $APP_DIR"
install -d -m 750 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$APP_DIR" "$APP_DIR/releases"

# --- Fin ----------------------------------------------------------------------
cat <<MSG

SERVEUR DURCI.

À VÉRIFIER MAINTENANT, depuis votre ordinateur, DANS UN NOUVEAU TERMINAL
(gardez celui-ci ouvert tant que la connexion n'est pas confirmée) :
    ssh -p $SSH_PORT $DEPLOY_USER@<adresse-du-serveur>

RAPPEL — Docker et le pare-feu : Docker ouvre lui-même les ports « publiés » par
les conteneurs, sans passer par UFW. Seul Caddy doit publier des ports (80, 443).
Après le premier déploiement, vérifier que rien d'autre n'est exposé :
    sudo ss -tlnp | grep -v -E ':(22|$SSH_PORT|80|443)\\b'
    docker ps --format '{{.Names}} {{.Ports}}'
MSG
