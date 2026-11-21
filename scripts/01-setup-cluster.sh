#!/usr/bin/env bash
# Prepara el clúster local: minikube (driver docker) + addon metrics-server.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

log "Verificando herramientas requeridas..."
for tool in docker kubectl minikube; do
  need "$tool"
  log "  $tool: OK"
done
docker info >/dev/null 2>&1 || { err "El daemon de Docker no responde. Inicia Docker Desktop y reintenta."; exit 1; }

log "Iniciando minikube (driver docker, 2 CPUs, 4096 MB)..."
minikube start --driver=docker --cpus=2 --memory=4096

log "Habilitando addon metrics-server (necesario para el HPA)..."
minikube addons enable metrics-server

log "Esperando a que 'kubectl top nodes' funcione (máx. 5 min)..."
for i in $(seq 1 60); do
  if kubectl top nodes >/dev/null 2>&1; then
    kubectl get nodes
    kubectl top nodes
    ok "Clúster listo."
    exit 0
  fi
  printf '  intento %d/60...\n' "$i"
  sleep 5
done
err "Metrics Server no respondió a tiempo. Revisa: kubectl -n kube-system get pods"
exit 1
