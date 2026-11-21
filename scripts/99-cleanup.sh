#!/usr/bin/env bash
# Elimina generadores de carga, la Application, el namespace de la app y (opcional) minikube.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

need kubectl

log "Eliminando generadores de carga (si existen)..."
kubectl -n "$NS_APP" delete pod -l app=load-generator --ignore-not-found --wait=false 2>/dev/null || true

log "Eliminando la Application (el finalizer borra también sus recursos)..."
kubectl delete -f "$ROOT/argocd/application.yml" --ignore-not-found --timeout=120s

log "Eliminando el namespace $NS_APP..."
kubectl delete namespace "$NS_APP" --ignore-not-found --timeout=120s

read -r -p "¿Detener minikube? [s/N] " ans
if [[ "$ans" =~ ^[sS]$ ]]; then
  need minikube
  minikube stop
  ok "minikube detenido."
else
  log "minikube sigue en ejecución."
fi
