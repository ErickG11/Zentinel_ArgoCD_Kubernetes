#!/usr/bin/env bash
# Genera carga REAL desde dentro del clúster para disparar el HPA.
# Cada generador es un Pod curlimages/curl que, en bucle, llama a
#   POST /api/builder/recommend (búsqueda combinatoria: uso real de CPU)
#   GET  /api/products?q=...    (búsqueda difusa con errores de tipeo)
#
# Uso:
#   ./scripts/04-load-test.sh start [N]   # lanza N generadores (por defecto 4)
#   ./scripts/04-load-test.sh stop        # borra los generadores
#   ./scripts/04-load-test.sh status      # estado de generadores, HPA y Pods
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

need kubectl
TARGET="http://${APP_NAME}.${NS_APP}.svc.cluster.local"
LABEL="app=load-generator"

# Script que ejecuta cada generador (sh de busybox: sin $RANDOM, se rota con un contador).
read -r -d '' LOOP <<EOS || true
i=0
while true; do
  i=\$((i+1))
  case \$((i % 6)) in
    0) B=1200; U=gaming;;
    1) B=2500; U=video;;
    2) B=1800; U=streaming;;
    3) B=3500; U=gaming;;
    4) B=1500; U=programming;;
    *) B=2200; U=gaming;;
  esac
  curl -s -o /dev/null -X POST -H 'Content-Type: application/json' \
    -d "{\"budget\":\$B,\"use\":\"\$U\",\"count\":3,\"preferences\":{\"noise\":\"quiet\"}}" \
    ${TARGET}/api/builder/recommend
  case \$((i % 4)) in
    0) Q='ryzem%207800';; 1) Q='tarjeta%20grafca';; 2) Q='memoria%20ddr5';; *) Q='procesdor%20intel';;
  esac
  curl -s -o /dev/null "${TARGET}/api/products?q=\$Q&pageSize=24"
done
EOS

start() {
  local n="${1:-4}"
  [[ "$n" =~ ^[0-9]+$ ]] && (( n >= 1 && n <= 20 )) || { err "N debe ser un entero entre 1 y 20."; exit 1; }
  kubectl -n "$NS_APP" get deploy "$APP_NAME" >/dev/null 2>&1 \
    || { err "No existe el Deployment $APP_NAME en $NS_APP. ¿Terminó el script 03?"; exit 1; }
  log "Lanzando $n generador(es) de carga contra $TARGET ..."
  for i in $(seq 1 "$n"); do
    kubectl -n "$NS_APP" delete pod "load-generator-$i" --ignore-not-found --wait=true >/dev/null
    kubectl -n "$NS_APP" run "load-generator-$i" --image=curlimages/curl:8.10.1 \
      --restart=Never --labels="$LABEL" --command -- /bin/sh -c "$LOOP" >/dev/null
  done
  ok "Generadores en marcha."
  cat <<MSG

Observa el autoescalado en otras terminales:
  kubectl -n $NS_APP get hpa -w
  kubectl -n $NS_APP get pods -w
  kubectl top pods -n $NS_APP

Esperado: el HPA sube de 2 a 5 réplicas en pocos minutos (+2 cada 30 s).
Para detener la carga y ver la bajada a 2 réplicas (~60 s de estabilización):
  ./scripts/04-load-test.sh stop
MSG
}

stop() {
  log "Eliminando generadores de carga..."
  kubectl -n "$NS_APP" delete pod -l "$LABEL" --ignore-not-found --wait=false
  ok "Carga detenida. El HPA reducirá las réplicas tras ~60 s (1 Pod cada 30 s)."
}

status() {
  kubectl -n "$NS_APP" get pods -l "$LABEL" || true
  kubectl -n "$NS_APP" get hpa
  kubectl -n "$NS_APP" get pods -l app.kubernetes.io/name="$APP_NAME"
  kubectl top pods -n "$NS_APP" 2>/dev/null || warn "Metrics Server aún sin datos."
}

case "${1:-}" in
  start)  start "${2:-4}" ;;
  stop)   stop ;;
  status) status ;;
  *) err "Uso: $0 {start [N]|stop|status}"; exit 1 ;;
esac
