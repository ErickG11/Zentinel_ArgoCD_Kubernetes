#!/usr/bin/env bash
# Registra la Application en Argo CD y espera a que quede Synced/Healthy.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

APP_FILE="$ROOT/argocd/application.yml"
TIMEOUT=300

need kubectl
[ -f "$APP_FILE" ] || { err "No existe $APP_FILE"; exit 1; }
kubectl -n "$NS_ARGO" get deploy argocd-server >/dev/null 2>&1 \
  || { err "Argo CD no está instalado. Ejecuta 02-install-argocd.sh."; exit 1; }

if grep -q '__GITHUB''_USER__' "$APP_FILE" || grep -q '__DOCKERHUB''_USER__' "$ROOT/k8s/deployment.yml"; then
  err "Quedan marcadores sin reemplazar. Ejecuta ./scripts/configure.sh <dockerhub_user> <github_user>, haz commit y push."
  exit 1
fi

log "Aplicando $APP_FILE..."
kubectl apply -f "$APP_FILE"

log "Esperando Synced/Healthy (máx. ${TIMEOUT}s)..."
start=$SECONDS
while (( SECONDS - start < TIMEOUT )); do
  sync=$(kubectl -n "$NS_ARGO" get application "$APP_NAME" -o jsonpath='{.status.sync.status}' 2>/dev/null || true)
  health=$(kubectl -n "$NS_ARGO" get application "$APP_NAME" -o jsonpath='{.status.health.status}' 2>/dev/null || true)
  printf '  sync=%s health=%s\n' "${sync:-?}" "${health:-?}"
  if [ "$sync" = "Synced" ] && [ "$health" = "Healthy" ]; then
    ok "Aplicación Synced y Healthy."
    kubectl -n "$NS_APP" get deploy,svc,hpa,pods
    log "Abre la tienda con:  minikube service $APP_NAME -n $NS_APP --url"
    exit 0
  fi
  sleep 5
done
err "Tiempo agotado. Diagnóstico: kubectl -n $NS_ARGO describe application $APP_NAME"
exit 1
