#!/usr/bin/env bash
# Funciones comunes de los scripts (se carga con: source "$(dirname "$0")/lib.sh").

log()  { printf '\033[1;34m[INFO]\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m[ OK ]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[WARN]\033[0m %s\n' "$*" >&2; }
err()  { printf '\033[1;31m[ERROR]\033[0m %s\n' "$*" >&2; }

# Raíz del repositorio (carpeta padre de scripts/).
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

NS_APP=zentinel
NS_ARGO=argocd
APP_NAME=zentinel-store

need() {
  command -v "$1" >/dev/null 2>&1 || { err "No se encontró '$1'. Instálalo y vuelve a ejecutar."; exit 1; }
}
