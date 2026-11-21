#!/usr/bin/env bash
# Instala Argo CD (manifiesto estable oficial) en el namespace argocd.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

need kubectl
kubectl cluster-info >/dev/null 2>&1 || { err "No hay clúster accesible. Ejecuta primero 01-setup-cluster.sh."; exit 1; }

MANIFEST_URL="https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml"

log "Creando namespace $NS_ARGO (idempotente)..."
kubectl create namespace "$NS_ARGO" --dry-run=client -o yaml | kubectl apply -f -

log "Instalando Argo CD desde el manifiesto estable oficial..."
# --server-side evita el error de anotación demasiado grande en los CRD.
kubectl apply -n "$NS_ARGO" --server-side --force-conflicts -f "$MANIFEST_URL"

log "Esperando a que los Pods de Argo CD estén Ready (máx. 5 min)..."
kubectl -n "$NS_ARGO" wait --for=condition=Ready pod --all --timeout=300s
kubectl -n "$NS_ARGO" get pods

cat <<'MSG'

Argo CD instalado correctamente.

Contraseña inicial del usuario 'admin':
  kubectl -n argocd get secret argocd-initial-admin-secret \
    -o jsonpath='{.data.password}' | base64 -d; echo

Abrir la UI (deja este comando corriendo en otra terminal):
  kubectl -n argocd port-forward svc/argocd-server 8080:443
Luego entra en https://localhost:8080 (acepta el certificado autofirmado)
con usuario 'admin'.
MSG
