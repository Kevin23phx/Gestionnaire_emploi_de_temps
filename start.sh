#!/usr/bin/env bash
#
# Démarre Campus Manager en entier : base PostgreSQL, backend Django, frontend
# Next.js. Ctrl+C arrête tout proprement.
#
# Depuis la scission en deux dépôts (2026-09), le backend n'est plus un
# sous-dossier de celui-ci : c'est un clone séparé de
# Kevin23phx/Gestionnaire_emploi_de_temps_backDjango, repéré ci-dessous par
# convention (dossier frère) ou via BACKEND_DIR.
#
#   ./start.sh                    base + backend + frontend
#   ./start.sh --back             base + backend seulement
#   ./start.sh --seed             remet les données de démonstration avant de démarrer
#   ./start.sh --no-db            n'essaie pas de gérer Docker (base déjà lancée)
#   BACKEND_DIR=/chemin ./start.sh   backend cloné ailleurs qu'à côté de ce dépôt
#
set -uo pipefail

RACINE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

PORT_DB=5436
PORT_API=3001
PORT_WEB=3000
CONTENEUR=campus_manager_django_db
DEPOT_BACKEND="git@github.com:Kevin23phx/Gestionnaire_emploi_de_temps_backDjango.git"

AVEC_FRONT=1
AVEC_DB=1
AVEC_SEED=0
for arg in "$@"; do
  case "$arg" in
    --back|--backend) AVEC_FRONT=0 ;;
    --no-db)          AVEC_DB=0 ;;
    --seed)           AVEC_SEED=1 ;;
    -h|--help)        sed -n '3,17p' "$0" | sed 's/^# \?//'; exit 0 ;;
    *) echo "Option inconnue : $arg (--help pour la liste)" >&2; exit 1 ;;
  esac
done

# ---------------------------------------------------------------- affichage --
if [ -t 1 ]; then
  GRIS=$'\033[90m'; VERT=$'\033[32m'; JAUNE=$'\033[33m'; ROUGE=$'\033[31m'
  BLEU=$'\033[34m'; ROSE=$'\033[35m'; GRAS=$'\033[1m'; RAZ=$'\033[0m'
else
  GRIS=; VERT=; JAUNE=; ROUGE=; BLEU=; ROSE=; GRAS=; RAZ=
fi

etape() { echo "${GRIS}▸${RAZ} $*"; }
ok()    { echo "  ${VERT}✓${RAZ} $*"; }
alerte(){ echo "  ${JAUNE}!${RAZ} $*"; }
mourir(){ echo "  ${ROUGE}✗${RAZ} $*" >&2; exit 1; }

port_occupe() { (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null; }

# --------------------------------------------------------------- localisation --
# BACKEND_DIR explicite > dossiers frères usuels, dans cet ordre : le nom du
# dépôt GitHub, puis les noms déjà rencontrés en pratique sur ce projet.
etape "Repérage du backend"

if [ -n "${BACKEND_DIR:-}" ]; then
  BACK="$BACKEND_DIR"
else
  BACK=""
  for candidat in \
    "$RACINE/../Gestionnaire_emploi_de_temps_backDjango" \
    "$RACINE/../backend-nouveau" \
    "$RACINE/../Gestionnaire_emploi_de_temps_backDjango-main" \
    "$RACINE/backend"
  do
    if [ -f "$candidat/manage.py" ]; then
      BACK="$(cd "$candidat" && pwd)"
      break
    fi
  done
fi

if [ -z "$BACK" ]; then
  mourir "Backend introuvable. Clonez-le à côté de ce dépôt : git clone $DEPOT_BACKEND ../Gestionnaire_emploi_de_temps_backDjango
       (ou pointez BACKEND_DIR=/chemin/vers/le/backend ./start.sh dessus)."
fi
ok "$BACK"

# ------------------------------------------------------------------ prérequis --
etape "Vérification de l'environnement"

if [ ! -f "$BACK/.env" ]; then
  cp "$BACK/.env.example" "$BACK/.env"
  alerte "$(basename "$BACK")/.env créé depuis .env.example"
fi

if [ ! -x "$BACK/venv/bin/python" ]; then
  alerte "Environnement Python absent, création en cours (une minute environ)…"
  python3 -m venv "$BACK/venv" || mourir "Échec de la création du venv (paquet python3-venv manquant ?)"
  "$BACK/venv/bin/pip" install --quiet --upgrade pip
  "$BACK/venv/bin/pip" install --quiet -r "$BACK/requirements.txt" || mourir "Échec de l'installation des dépendances Python"
  ok "Dépendances Python installées"
fi

if [ "$AVEC_FRONT" = 1 ] && [ ! -d "$RACINE/node_modules" ]; then
  alerte "node_modules absent, npm install en cours…"
  (cd "$RACINE" && npm install) || mourir "Échec de npm install"
fi
ok "Environnement prêt"

# ----------------------------------------------------------------- base de données --
if [ "$AVEC_DB" = 1 ]; then
  etape "Base de données (port $PORT_DB)"

  if port_occupe "$PORT_DB"; then
    ok "Déjà démarrée"
  else
    # Compose V2 (`docker compose`) n'est pas installé partout ; le binaire
    # séparé `docker-compose` reste courant sur Ubuntu.
    if docker compose version >/dev/null 2>&1; then
      COMPOSE="docker compose"
    elif command -v docker-compose >/dev/null 2>&1; then
      COMPOSE="docker-compose"
    else
      mourir "Ni « docker compose » ni « docker-compose » n'est disponible."
    fi

    # Sans appartenance au groupe docker, l'accès à la socket exige sudo.
    if ! docker info >/dev/null 2>&1; then
      alerte "Accès Docker par sudo (ajoutez-vous au groupe : sudo usermod -aG docker \$USER)"
      COMPOSE="sudo $COMPOSE"
    fi

    (cd "$BACK" && $COMPOSE up -d) || mourir "Impossible de démarrer le conteneur PostgreSQL"

    printf "  ${GRIS}attente de PostgreSQL"
    for _ in $(seq 1 60); do
      port_occupe "$PORT_DB" && break
      printf "."; sleep 1
    done
    printf "${RAZ}\n"
    port_occupe "$PORT_DB" || mourir "PostgreSQL n'a pas démarré dans le délai imparti"
    ok "Démarrée"
  fi

  etape "Migrations"
  # Sous-shell : $BACK/.env définit PORT=3001, et Next.js lit PORT pour
  # choisir le sien. Exporter ces variables globalement ferait démarrer le
  # frontend sur le port du backend. Django charge .env lui-même
  # (load_dotenv dans config/settings.py) : seul migrate a besoin d'un
  # DATABASE_URL explicite, celui du rôle superutilisateur.
  if ( set -a; . "$BACK/.env"; set +a
       DATABASE_URL="$MIGRATE_DATABASE_URL" \
         "$BACK/venv/bin/python" "$BACK/manage.py" migrate 2>&1 ) | grep -q "No migrations to apply"; then
    ok "À jour"
  else
    ok "Appliquées"
  fi
  bash "$BACK/scripts/bootstrap-db-roles.sh" >/dev/null 2>&1 || alerte "bootstrap-db-roles a échoué (rôle applicatif déjà configuré ?)"

  if [ "$AVEC_SEED" = 1 ]; then
    etape "Données de démonstration"
    # scripts/seed.sh a été retiré du backend le 2026-09-14 : la commande
    # `manage.py seed` s'invoque désormais directement (voir son README).
    # DATABASE_URL forcé au rôle privilégié (MIGRATE_DATABASE_URL) : le rôle
    # applicatif restreint n'a pas le DELETE sur audit_entry/conflit_journal
    # (immuabilité du journal, INV-04) que le seed doit pourtant vider avant
    # de repartir de zéro.
    (cd "$BACK" && source venv/bin/activate && set -a && source .env && set +a \
      && DATABASE_URL="$MIGRATE_DATABASE_URL" python manage.py seed >/dev/null 2>&1) \
      && ok "Rechargées" || alerte "Le seed a échoué"
  fi
fi

# ------------------------------------------------------------------ serveurs --
PIDS=()

ports_libres() {
  port_occupe "$PORT_API" && return 1
  [ "$AVEC_FRONT" = 1 ] && port_occupe "$PORT_WEB" && return 1
  return 0
}

# `next dev` lance des processus enfants (next-server) qui survivent à la mort
# de leur parent : il faut donc parcourir l'arbre, et le parcourir AVANT de
# tuer la racine, sinon les enfants deviennent orphelins et introuvables.
tuer_arbre() {
  local pid="$1" sig="${2:-TERM}" enfant
  for enfant in $(pgrep -P "$pid" 2>/dev/null); do
    tuer_arbre "$enfant" "$sig"
  done
  kill -"$sig" "$pid" 2>/dev/null
}

arreter() {
  trap '' INT TERM   # un second Ctrl+C ne doit pas interrompre le nettoyage
  echo
  etape "Arrêt"
  for pid in "${PIDS[@]}"; do tuer_arbre "$pid" TERM; done

  for _ in $(seq 1 8); do
    ports_libres && break
    sleep 1
  done
  if ! ports_libres; then
    alerte "Arrêt forcé"
    for pid in "${PIDS[@]}"; do tuer_arbre "$pid" KILL; done
    sleep 1
  fi

  ok "Serveurs arrêtés (la base reste active)"
  exit 0
}
trap arreter INT TERM

lancer() {
  local nom="$1" couleur="$2" repertoire="$3"; shift 3
  # `exec` remplace le sous-shell par la commande : $! est alors le PID réel
  # du serveur, et non celui d'un shell d'habillage dont tuer_arbre ne
  # retrouverait pas la descendance.
  ( cd "$repertoire" && exec "$@" ) > >(sed -u "s/^/${couleur}${nom}${RAZ} /") 2>&1 &
  PIDS+=("$!")
}

etape "Serveurs"

if port_occupe "$PORT_API"; then
  mourir "Le port $PORT_API est déjà utilisé — un backend tourne déjà ? (voir aussi si un autre outil/IA a le sien)"
fi
lancer "[api]" "$BLEU" "$BACK" "$BACK/venv/bin/python" manage.py runserver "0.0.0.0:$PORT_API"

if [ "$AVEC_FRONT" = 1 ]; then
  if port_occupe "$PORT_WEB"; then
    mourir "Le port $PORT_WEB est déjà utilisé — un frontend tourne déjà ?"
  fi
  lancer "[web]" "$ROSE" "$RACINE" env PORT="$PORT_WEB" npm run dev
fi

echo
echo "  ${GRAS}Campus Manager démarré${RAZ}"
echo "  ${GRIS}API${RAZ}       http://localhost:$PORT_API/api/health"
[ "$AVEC_FRONT" = 1 ] && echo "  ${GRIS}Frontend${RAZ}  http://localhost:$PORT_WEB"
echo
echo "  ${GRIS}Comptes de démonstration — mot de passe « password »${RAZ}"
echo "  ${GRIS}scolarite.sea · scolarite.general${RAZ}"
echo
echo "  ${GRIS}Ctrl+C pour tout arrêter${RAZ}"
echo

wait
