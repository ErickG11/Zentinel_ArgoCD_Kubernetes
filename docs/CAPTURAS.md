# Checklist de capturas para el informe

Guarda cada captura en `docs/screenshots/` con el **nombre exacto** indicado. **En cada una debe verse tu nombre o tu usuario** (usuario de GitHub en la URL, terminal con tu usuario, o tu nombre en el pie de la tienda).

| # | Archivo | Qué mostrar | Comando o pantalla |
|---|---|---|---|
| 1 | `01-repo-github-k8s.png` | Repositorio público en GitHub con la carpeta `k8s/` (solo 3 archivos) | `https://github.com/<usuario>/Zentinel_ArgoCD_Kubernetes/tree/main/k8s` |
| 2 | `02-kubectl-get-nodes-top.png` | Nodo Ready y métricas de CPU/memoria | `kubectl get nodes` y `kubectl top nodes` |
| 3 | `02-metrics-server-top-nodes.png` | Metrics Server funcionando | `kubectl -n kube-system get pods \| grep metrics-server` y `kubectl top nodes` |
| 4 | `03-argocd-synced-healthy.png` | UI de Argo CD con la app `zentinel-store` en **Synced** y **Healthy** y el árbol de recursos (Deployment, ReplicaSet, Pods, Service, HPA) | `https://localhost:8080` → aplicación `zentinel-store` |
| 5 | `04-argocd-auto-sync-enabled.png` | **Auto-Sync enabled** (con Prune y Self Heal) | UI de Argo CD → App Details → Sync Policy |
| 6 | `05-kubectl-get-all.png` | Recursos desplegados | `kubectl -n zentinel get deploy,svc,hpa,pods` |
| 7 | `06-tienda-navegador.png` | La tienda en el navegador con la URL del NodePort visible | `minikube service zentinel-store -n zentinel --url` y abrir la URL |
| 8 | `07-estado-balanceo.png` | Panel **/estado** con varios Pods atendiendo y sus contadores | `<url>/estado` (idealmente durante la carga, con ≥ 2 Pods) |
| 9 | `08-describe-hpa.png` | Detalle del HPA: mín. 2, máx. 5, objetivo CPU 50 %, `ScalingActive` | `kubectl -n zentinel describe hpa zentinel-store` |
| 10 | `09-gitops-commit.png` | Commit del cambio de `APP_VERSION` en GitHub | Página del commit en GitHub |
| 11 | `10-gitops-antes.png` | **Antes** del cambio: Argo CD *Synced* y `/estado` con versión `1.0.0` | UI de Argo CD + `/estado` |
| 12 | `11-gitops-despues.png` | **Después**: Argo CD sincronizó solo y `/estado` muestra la versión `1.0.1` | UI de Argo CD (historial de sync) + `/estado` |
| 13 | `12-hpa-sube-5.png` | HPA subiendo a **5 réplicas** bajo carga | `kubectl -n zentinel get hpa -w` y `kubectl -n zentinel get pods` durante `./scripts/04-load-test.sh start 4` |
| 14 | `13-hpa-baja-2.png` | HPA bajando de nuevo a **2 réplicas** | Mismos comandos tras `./scripts/04-load-test.sh stop` |

Recomendaciones:

- Captura la pantalla completa para que se vean la hora y la terminal.
- Para las capturas 12 y 13, usa dos terminales (`get hpa -w` y `get pods -w`) en la misma pantalla.
- Cambia `<usuario>` por tu usuario real y verifica que los marcadores `__DOCKERHUB_USER__` y `ErickG11` ya fueron reemplazados con `./scripts/configure.sh`.
