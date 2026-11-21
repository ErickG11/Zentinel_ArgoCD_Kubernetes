#!/usr/bin/env bash
# Reemplaza los marcadores __DOCKERHUB_USER__ y __GITHUB_USER__ en todo el repositorio.
# Uso: ./scripts/configure.sh <usuario_dockerhub> <usuario_github>
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

if [ "$#" -ne 2 ]; then
  err "Uso: $0 <usuario_dockerhub> <usuario_github>"
  exit 1
fi
DOCKERHUB_USER="$1"
GITHUB_USER="$2"

valid='^[A-Za-z0-9]([A-Za-z0-9._-]*[A-Za-z0-9])?$'
for v in "$DOCKERHUB_USER" "$GITHUB_USER"; do
  [[ "$v" =~ $valid ]] || { err "Usuario inválido: '$v' (solo letras, números, '.', '_' y '-')."; exit 1; }
done

need perl
cd "$ROOT"
# Marcadores armados por partes para que este script no se reemplace a sí mismo.
TOKEN_DH="__DOCKERHUB""_USER__"
TOKEN_GH="__GITHUB""_USER__"

# git ls-files respeta .gitignore (excluye node_modules, dist, etc.); se añaden archivos sin versionar.
changed=0
while IFS= read -r f; do
  [ -f "$f" ] || continue
  [ "$f" = "scripts/configure.sh" ] && continue
  if grep -Iq -e "$TOKEN_DH" -e "$TOKEN_GH" "$f" 2>/dev/null; then
    DH="$DOCKERHUB_USER" GH="$GITHUB_USER" perl -pi -e 's/__DOCKERHUB_USER__/$ENV{DH}/g; s/__GITHUB_USER__/$ENV{GH}/g' "$f"
    log "Actualizado: $f"
    changed=$((changed + 1))
  fi
done < <( (git ls-files; git ls-files --others --exclude-standard) | sort -u )

ok "Listo: $changed archivo(s) actualizados."
ok "Imagen:      docker.io/$DOCKERHUB_USER/zentinel-store:1.0.0"
ok "Repositorio: https://github.com/$GITHUB_USER/Zentinel_ArgoCD_Kubernetes.git"
