# Zentinel Store — GitOps con Argo CD en Kubernetes

**Zentinel Store** es la tienda online de tecnología de **Zentinel Labs**: una aplicación web real (catálogo de 83 productos, búsqueda difusa, comparador, Armador de PC con compatibilidad en vivo, Asistente que genera builds, carrito, checkout y comprobantes firmados) desplegada en Kubernetes con **GitOps**: este repositorio es la única fuente de verdad y **Argo CD** mantiene el clúster sincronizado.

> Proyecto individual de *Automatización de la Configuración Continua* — Erick Mateo Granda Delgado — UDLA.

## Funciones diferenciales

| Función | Qué hace |
|---|---|
| **Armador de PC** | Verifica en vivo socket CPU↔placa, tipo de RAM, formato placa↔case, largo de GPU↔case, cooler, ranuras M.2, consumo vs fuente (con nivel de holgura) y cuellos de botella CPU/GPU. El selector de piezas marca cada opción como compatible o no. |
| **Asistente Zentinel** | Recibe presupuesto, uso (gaming, video, programación, ofimática, streaming) y preferencias. Busca las mejores builds compatibles con **branch and bound** (poda por presupuesto, por compatibilidad y por cota superior de puntaje) y explica *por qué* y *qué sacrifica* cada una. Es CPU real, acotada por `RECOMMEND_MAX_COMBINATIONS`. |
| **Búsqueda difusa** | Tolera errores de tipeo (distancia de Damerau-Levenshtein), ignora tildes, expande sinónimos (`ram`=`memoria`) y rankea por relevancia ponderando nombre, marca, tags y descripción. |
| **Comparador** | Hasta 4 productos de la misma categoría, con mejor/peor valor por especificación. |
| **Comprobante firmado** | Cada pedido devuelve un código `ZS-XXXXXX` y un token firmado con HMAC-SHA256 que cualquier réplica puede validar. Sin base de datos. |
| **Panel /estado** | Sondea `/api/system/info` cada 2 s y muestra qué Pod responde, su versión, namespace y uptime, con un contador por Pod: evidencia visual del balanceo del Service. |

## Arquitectura

```mermaid
flowchart LR
    Dev([Desarrollador]) -- git push --> GH[(GitHub público<br/>zentinel-store-gitops<br/>rama main · k8s/)]
    CI[GitHub Actions<br/>lint · tests · imagen] -. tag vX.Y.Z .-> DH[(Docker Hub<br/>zentinel-store:1.0.0)]
    GH --> CI
    subgraph K8S [Clúster Kubernetes · minikube]
        direction LR
        ARGO[Argo CD<br/>namespace argocd<br/>Automated Sync · prune · selfHeal]
        subgraph NS [namespace zentinel]
            SVC[Service NodePort<br/>80 → http:3000 · 30080]
            DEP[Deployment zentinel-store<br/>2 réplicas · RollingUpdate]
            P1[Pod]
            P2[Pod]
            HPA[HPA · min 2 · max 5<br/>CPU 50 %]
            SVC --> P1
            SVC --> P2
            DEP --> P1
            DEP --> P2
            HPA -- ajusta réplicas --> DEP
        end
        MS[Metrics Server] -- CPU de los Pods --> HPA
        ARGO -- aplica k8s/ --> NS
    end
    ARGO -- sondea el repo --> GH
    DH -- pull de la imagen --> P1
    User([Usuario]) -- HTTP --> SVC
```

**Flujo GitOps:** `git push` → Argo CD detecta el cambio en `k8s/` → sincroniza Deployment, Service y HPA → el HPA, alimentado por Metrics Server, ajusta las réplicas según la CPU.

## Decisión de arquitectura: aplicación stateless

La aplicación **no usa base de datos ni guarda estado en el Pod**. Es una condición para escalar horizontalmente sin inconsistencias entre réplicas: cualquier Pod puede atender cualquier petición y el HPA puede crear o destruir Pods sin perder datos.

- **Catálogo:** inmutable, validado con zod al arrancar e idéntico en todas las réplicas.
- **Carrito y comparador:** viven en el navegador (`localStorage`).
- **Pedidos:** no se almacenan. El servidor calcula los totales (subtotal, descuento por combo del 5 %, IVA 15 %, envío por ciudad) y devuelve un **comprobante firmado**: un token `base64url(pedido).base64url(HMAC-SHA256)` que contiene el pedido completo. `GET /api/orders/verify/:token` recalcula la firma y muestra el pedido en **cualquier réplica** que comparta la clave.
- **Clave de firma (`ORDER_SIGNING_KEY`):** si no existe, cada Pod genera una clave efímera y lo avisa en logs; entonces solo ese Pod validaría sus comprobantes. Para que la validación funcione entre réplicas, todas deben compartir la misma clave. En este proyecto el Deployment define un **valor público de demostración** (no es un secreto). En producción real se inyectaría con un **Secret creado fuera de Git** (`secretKeyRef`). El token está firmado, no cifrado.

## Estructura del repositorio

```
.
├── app/
│   ├── server/        # API Node 20 + TypeScript + Express (routes → controllers → services → data)
│   ├── web/           # Frontend React 18 + Vite + TypeScript (design tokens en src/styles/tokens.css)
│   └── Dockerfile     # Multi-stage, no-root, HEALTHCHECK
├── k8s/               # SOLO deployment.yml, service.yml, hpa.yml
├── argocd/            # application.yml (Application de Argo CD)
├── scripts/           # configure.sh, 01–04, 99-cleanup.sh
├── docs/              # INFORME.md, CAPTURAS.md, screenshots/
└── .github/workflows/ci.yml
```

## Prerrequisitos

Docker, minikube, kubectl, una cuenta de Docker Hub y una de GitHub. Para desarrollo local: Node.js 20 o superior. minikube necesita 2 CPUs y 4 GB de RAM libres.

## Desarrollo local

```bash
cd app/server && npm ci && npm test            # 61 tests
cd ../web && npm ci && npm test && npm run build   # 18 tests + build a app/web/dist
cd ../server && npm run build && PORT=3000 npm start   # sirve API + web en http://localhost:3000
```

Variables de entorno del servidor: `PORT`, `APP_VERSION`, `APP_ENV`, `POD_NAMESPACE`, `GIT_COMMIT`, `LOG_LEVEL`, `RATE_LIMIT_ENABLED`, `RATE_LIMIT_MAX`, `RECOMMEND_MAX_COMBINATIONS`, `ORDER_SIGNING_KEY`.

## Guía de despliegue paso a paso

1. **Publica la imagen** en Docker Hub con tag fijo (nunca `latest`):

   ```bash
   docker login
   docker build -t docker.io/<DOCKERHUB_USER>/zentinel-store:1.0.0 app/
   docker run --rm -p 3000:3000 docker.io/<DOCKERHUB_USER>/zentinel-store:1.0.0   # prueba local
   docker push docker.io/<DOCKERHUB_USER>/zentinel-store:1.0.0
   ```

   El repositorio de la imagen debe ser **público**.

2. **Crea el repositorio público** `zentinel-store-gitops` en GitHub, reemplaza los marcadores y sube el código:

   ```bash
   ./scripts/configure.sh <DOCKERHUB_USER> <GITHUB_USER>
   git add -A && git commit -m "chore: configura usuarios"
   git remote add origin https://github.com/<GITHUB_USER>/zentinel-store-gitops.git
   git push -u origin main
   ```

3. **Clúster:** `./scripts/01-setup-cluster.sh` (minikube con driver docker + metrics-server).
4. **Argo CD:** `./scripts/02-install-argocd.sh`. Al terminar imprime cómo obtener la contraseña de `admin` y abrir la UI:

   ```bash
   kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d; echo
   kubectl -n argocd port-forward svc/argocd-server 8080:443     # https://localhost:8080
   ```

5. **Despliegue:** `./scripts/03-deploy-app.sh` aplica `argocd/application.yml` y espera `Synced` + `Healthy`.

## Acceso a la aplicación

```bash
minikube service zentinel-store -n zentinel --url
```

Con el driver `docker` en macOS/Windows el comando abre un túnel y **debe quedarse abierto**. En Linux también funciona `http://$(minikube ip):30080`. Rutas útiles: `/` (tienda), `/estado` (infraestructura), `/healthz`, `/readyz`, `/metrics`, `/api/system/info`.

## Probar el HPA

```bash
kubectl -n zentinel get hpa -w            # terminal 1
kubectl -n zentinel get pods -w           # terminal 2
./scripts/04-load-test.sh start 4         # terminal 3: 4 generadores de carga
```

Los generadores son Pods `curlimages/curl` dentro del clúster que llaman en bucle a `POST /api/builder/recommend` (búsqueda combinatoria, uso real de CPU) y a búsquedas difusas en `/api/products`. Con `requests.cpu: 100m`, el HPA considera que hay que escalar al superar ~50 m de media por Pod, así que sube de **2 a 5 réplicas** (+2 cada 30 s). Mientras tanto, `/estado` mostrará los distintos Pods respondiendo.

```bash
./scripts/04-load-test.sh stop            # borra los generadores
```

Tras ~60 s de estabilización, el HPA baja 1 Pod cada 30 s hasta volver a **2**. `./scripts/04-load-test.sh status` resume generadores, HPA y Pods.

## Demostrar GitOps: cambio en Git → sincronización automática

1. Con la UI de Argo CD abierta y la tienda en `/estado`, edita `k8s/deployment.yml`: cambia `APP_VERSION` de `"1.0.0"` a `"1.0.1"` (y el label de versión, si quieres coherencia). También puedes cambiar la imagen a otro tag fijo.
2. `git commit -am "Demo GitOps: APP_VERSION 1.0.1" && git push`.
3. Argo CD detecta el commit (por defecto sondea cada ~3 minutos; pulsa **Refresh** para verlo al instante), sincroniza solo y hace un *rolling update* sin caída (`maxUnavailable: 0`). Sin ejecutar ningún `kubectl apply`.
4. El panel `/estado` pasa a mostrar la versión `1.0.1` en los Pods nuevos.
5. **Self-heal:** `kubectl -n zentinel set env deploy/zentinel-store APP_ENV=manual` se revierte solo.

## Limpieza

`./scripts/99-cleanup.sh` elimina generadores, la Application, el namespace y, opcionalmente, detiene minikube.

## Troubleshooting

**El HPA muestra `<unknown>/50%`.** Metrics Server aún no tiene datos o no está activo. Revisa `kubectl top nodes` y `kubectl -n kube-system get pods | grep metrics-server`; si hace falta, `minikube addons enable metrics-server` y espera 1–2 minutos. Los Pods deben tener `resources.requests.cpu` (ya está). Diagnóstico: `kubectl -n zentinel describe hpa zentinel-store`.

**`ImagePullBackOff` / `ErrImagePull`.** Confirma que no queda el marcador `__DOCKERHUB_USER__` en `k8s/deployment.yml` (ejecuta `configure.sh` y haz push), que el usuario, el nombre y el tag coinciden con lo publicado y que el repositorio de Docker Hub es público. Diagnóstico: `kubectl -n zentinel describe pod <pod>`.

**El NodePort no responde con minikube y el driver docker.** En macOS/Windows la IP de minikube no es accesible desde el host: usa `minikube service zentinel-store -n zentinel --url` y deja esa terminal abierta. Alternativa: `kubectl -n zentinel port-forward svc/zentinel-store 8081:80`.

**La aplicación aparece `OutOfSync` por las réplicas.** El HPA cambia `spec.replicas` mientras Git declara `2`. Por eso `argocd/application.yml` incluye `ignoreDifferences` sobre `/spec/replicas` y la opción `RespectIgnoreDifferences=true`. Si persiste, reaplica `kubectl apply -f argocd/application.yml` y pulsa **Refresh**.

**`/estado` solo muestra un Pod.** Normal con una sola réplica. Con varias, el endpoint responde `Connection: close` para que cada sondeo abra una conexión nueva, porque kube-proxy balancea por conexión TCP y no por petición.

**Los comprobantes no se validan en otro Pod.** Falta `ORDER_SIGNING_KEY` y cada Pod usó una clave efímera: define la misma clave en todas las réplicas.

## Licencia

MIT. Catálogo y precios ficticios con fines académicos.
