# Zentinel Store

Tienda de tecnología de Zentinel Labs, desplegada con GitOps (Argo CD) sobre Kubernetes.

## Descripción

- Aplicación full-stack: backend Node 20 + TypeScript + Express, frontend React 18 + Vite.
- 83 productos, 14 categorías y 9 reglas de compatibilidad.
- Búsqueda tolerante a errores de tipeo, comparador, armador de PC con compatibilidad en vivo, recomendador de builds (`/api/builder/recommend`, intensivo en CPU), carrito y checkout con comprobante firmado con HMAC (sin estado).
- Página `/estado` que muestra qué Pod atiende cada petición.

## Arquitectura

```
GitHub (rama main, carpeta k8s/)
        │  Argo CD sondea el repositorio
        ▼
Argo CD (ns argocd) ── Automated Sync ──► Clúster Kubernetes (ns zentinel)
                                          ┌───────────────────────────────────┐
 Usuario ──► Service NodePort :30080 ────►│ Deployment (2 a 5 Pods)           │
                                          │        ▲                          │
 Docker Hub ── pull de la imagen ────────►│        │ ajusta réplicas          │
                                          │ HPA (CPU 50 %)                    │
                                          └───────────────────────────────────┘
                                                   ▲
                                          Metrics Server (CPU de los Pods)
```

## Estructura del repositorio

```
.
├── .github/workflows/   # CI
├── app/                 # server (API) y web (frontend), Dockerfile
├── argocd/
│   └── application.yml  # Application de Argo CD
├── docs/
├── k8s/
│   ├── deployment.yml
│   ├── service.yml
│   └── hpa.yml
├── scripts/             # utilidades de clúster y prueba de carga
└── README.md
```

## Manifiestos

**`k8s/deployment.yml`**

| Aspecto | Valor |
|---|---|
| Imagen | `docker.io/erickg10/zentinel-store:1.0.0` (tag fijo) |
| Réplicas | 2 |
| Estrategia | RollingUpdate, `maxSurge: 1`, `maxUnavailable: 0` |
| Recursos | requests 100m CPU / 128Mi; limits 500m / 256Mi |
| Probes | startup y liveness en `/healthz`; readiness en `/readyz` |
| Seguridad | usuario no root (UID 1000), sin escalado de privilegios, capabilities `DROP ALL` |

**`k8s/service.yml`**

| Aspecto | Valor |
|---|---|
| Tipo | NodePort |
| Puertos | 80 → contenedor 3000 |
| nodePort | 30080 |

**`k8s/hpa.yml`**

| Aspecto | Valor |
|---|---|
| API | `autoscaling/v2` |
| Réplicas | mín. 2, máx. 5 |
| Métrica | CPU al 50 % sobre el request |
| scaleUp | hasta +2 Pods cada 30 s, sin estabilización |
| scaleDown | −1 Pod cada 30 s, con 60 s de estabilización |

## Decisiones de diseño

- **Tag fijo en lugar de `:latest`:** el despliegue es reproducible y Git describe exactamente lo que corre.
- **Aplicación sin estado:** los comprobantes se firman con HMAC, así cualquier réplica puede validarlos y la app escala horizontalmente sin problemas.
- **Request de CPU bajo (100m):** el HPA reacciona con poca carga y el escalado se puede observar.
- **`ignoreDifferences` sobre `/spec/replicas`:** Argo CD no compite con el HPA por el número de réplicas.
- **`ORDER_SIGNING_KEY` del manifiesto:** es un valor público de demostración, no un secreto. En producción iría en un Secret fuera de Git.
- **Conexión cerrada en `/api/system/info`:** el Service reparte las peticiones entre Pods y el reparto se ve en `/estado`.

## Despliegue paso a paso

**Requisitos:** Docker, minikube y kubectl.

```bash
git clone https://github.com/<tu-usuario>/Zentinel_ArgoCD_Kubernetes.git
cd Zentinel_ArgoCD_Kubernetes
```

**1. Clúster**

```bash
minikube start --driver=docker
minikube addons enable metrics-server
```

**2. Instalar Argo CD**

```bash
kubectl create namespace argocd
kubectl apply -n argocd --server-side -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

**3. Acceso a la UI**

```bash
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

La UI queda en `https://localhost:8080`, usuario `admin`. La contraseña inicial se obtiene del secret `argocd-initial-admin-secret` en el namespace `argocd`.

**4. Registrar la aplicación**

```bash
kubectl apply -f argocd/application.yml
```

La Application usa Automated Sync con `prune` (borra del clúster lo que se elimina de Git) y `selfHeal` (revierte cambios manuales), y `CreateNamespace=true` para crear el namespace `zentinel`.

**5. Verificar**

```bash
kubectl get all,hpa -n zentinel
```

**6. Abrir la tienda**

```bash
minikube service zentinel-store -n zentinel --url
```

Con el driver `docker` en Windows y macOS, la terminal debe quedarse abierta mientras se usa la URL.

## Probar GitOps

1. Cambia un valor en `k8s/deployment.yml`, por ejemplo `APP_VERSION`.
2. Haz commit y push a `main`.
3. Argo CD detecta el cambio, sincroniza solo y ejecuta un rolling update sin caída. Puede tardar unos minutos en sondear el repositorio, o se puede pulsar Refresh en la UI.

Se verifica en `/estado` (versión de los Pods nuevos) y con:

```bash
kubectl rollout status deployment/zentinel-store -n zentinel
```

## Probar el autoescalado

```bash
./scripts/04-load-test.sh start 4      # crea 4 generadores de carga dentro del clúster
```

Para observar:

```bash
kubectl get hpa -n zentinel -w
kubectl top pods -n zentinel
```

Resultado esperado: el HPA pasa de 2 a 4 y luego a 5 réplicas (máximo), con +2 Pods cada 30 s.

```bash
./scripts/04-load-test.sh stop         # elimina los generadores
```

Tras la ventana de estabilización, el HPA vuelve a 2 réplicas.

En Windows con Git Bash, anteponer `MSYS_NO_PATHCONV=1` al script:

```bash
MSYS_NO_PATHCONV=1 ./scripts/04-load-test.sh start 4
```

## Solución de problemas

| Síntoma | Causa y solución |
|---|---|
| `Metrics API not available` | Metrics Server aún no tiene datos. Esperar 1-2 minutos tras habilitarlo. |
| App en `Degraded` o Pods `0/1` al inicio | Transitorio mientras pasa el startup probe. |
| Generadores en `StartError` en Git Bash | Conversión de rutas de MSYS. Usar `MSYS_NO_PATHCONV=1`. |
| `minikube` o `kubectl` no reconocidos tras instalar | Reiniciar la terminal o refrescar el PATH. |

## Tecnologías

Node.js, TypeScript, Express, React, Vite, Docker, Kubernetes, Argo CD, minikube, Metrics Server.
