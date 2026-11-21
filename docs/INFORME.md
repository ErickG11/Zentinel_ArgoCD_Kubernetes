# Informe: Despliegue GitOps de Zentinel Store con Argo CD en Kubernetes

**Autor:** Erick Mateo Granda Delgado
**Materia:** Automatización de la Configuración Continua
**Institución:** Universidad de las Américas (UDLA)
**Fecha:** 21 de noviembre de 2026
**Repositorio:** https://github.com/ErickG11/Zentinel_ArgoCD_Kubernetes
**Imagen:** `docker.io/erickg10/zentinel-store:1.0.0`

---

## 1. Objetivo

Desplegar de forma automatizada una aplicación web en Kubernetes siguiendo el modelo **GitOps**: un repositorio Git público es la única fuente de verdad y **Argo CD** mantiene el clúster sincronizado con él. El despliegue incluye 2 réplicas iniciales, un Service de tipo NodePort y un HorizontalPodAutoscaler (mín. 2, máx. 5, CPU al 50 %).

## 2. Marco teórico

- **GitOps:** práctica en la que el estado deseado de la infraestructura y de las aplicaciones se describe de forma declarativa en Git. Un agente dentro del clúster compara continuamente lo declarado con lo desplegado y corrige las diferencias. Aporta trazabilidad (cada cambio es un commit), reversibilidad (`git revert`) y auditoría.
- **Argo CD:** controlador de entrega continua declarativa para Kubernetes. Una `Application` indica repositorio, revisión, ruta y destino. Con *Automated Sync* aplica los cambios sin intervención; `prune` elimina lo que desaparece de Git y `selfHeal` revierte los cambios manuales.
- **Deployment:** objeto que gestiona un conjunto de Pods idénticos (mediante ReplicaSets) y las actualizaciones progresivas (*RollingUpdate*).
- **Service NodePort:** expone un Service en un puerto fijo (30000-32767) de cada nodo y balancea entre los Pods cuyos labels coinciden con su selector. kube-proxy elige el Pod por conexión TCP.
- **HorizontalPodAutoscaler (HPA):** ajusta el número de réplicas según métricas. Con métrica de CPU en `Utilization`, compara el uso medio con el `request` de CPU de los Pods.
- **Metrics Server:** componente que recolecta métricas de CPU y memoria de los nodos y Pods y las publica en la API de métricas. El HPA depende de él.

## 3. Descripción de la aplicación

**Zentinel Store** es la tienda de tecnología de Zentinel Labs. No es una página informativa, sino una aplicación completa:

- **Backend** (Node.js 20, TypeScript estricto, Express, zod, helmet, pino, prom-client): catálogo de 83 productos en 14 categorías, búsqueda difusa, comparador, motor de compatibilidad con 9 reglas, recomendador de builds, pedidos con comprobante firmado, sondas `/healthz` y `/readyz`, métricas `/metrics` y `/api/system/info`. 61 pruebas automatizadas.
- **Frontend** (React 18, Vite, TanStack Query): inicio, catálogo, detalle, comparador, Armador de PC, Asistente Zentinel, carrito, checkout, verificación de comprobantes y el panel `/estado`. Diseño propio con *design tokens* centralizados, modo claro/oscuro y accesibilidad. 18 pruebas de componentes.
- **Asistente Zentinel (innovación clave):** genera las mejores builds compatibles dentro de un presupuesto con búsqueda *branch and bound*. Es un cálculo real y legítimo; su costo se acota con `RECOMMEND_MAX_COMBINATIONS`. Es además el endpoint que genera carga de CPU natural para la prueba del HPA.

## 4. Arquitectura y decisiones técnicas

```
Desarrollador → GitHub (k8s/) ← Argo CD (namespace argocd) → Kubernetes (namespace zentinel)
                                                              ├─ Deployment zentinel-store (2 réplicas)
                                                              ├─ Service NodePort 30080
                                                              └─ HPA 2–5 réplicas, CPU 50 %
```

1. **Aplicación stateless.** Sin base de datos ni estado en el Pod: cualquier réplica atiende cualquier petición, y el HPA puede crear o destruir Pods sin perder información. El carrito vive en el navegador y los pedidos se devuelven como un **comprobante firmado con HMAC-SHA256** que contiene el pedido completo; cualquier réplica con la misma clave lo valida.
2. **`ignoreDifferences` sobre `/spec/replicas`.** El HPA cambia las réplicas del Deployment en caliente, mientras que Git declara 2. Sin esta regla, Argo CD marcaría `OutOfSync` y, con `selfHeal`, volvería a 2 réplicas durante la carga. Con `RespectIgnoreDifferences=true`, el HPA es el único dueño de ese campo.
3. **Por qué el request de CPU de 100m condiciona al HPA.** El objetivo del 50 % se mide sobre el *request*, no sobre el límite: 50 % de 100m son **50m por Pod**. Un request bajo hace que el HPA reaccione con poca carga; uno alto exigiría mucha más. El límite de 500m deja margen para que un Pod se sature antes de escalar. Sin `requests.cpu` el HPA no puede calcular el porcentaje y muestra `<unknown>`.
4. **Secretos fuera de Git.** La firma de comprobantes usa `ORDER_SIGNING_KEY`. El manifiesto incluye un valor **público de demostración** para que todas las réplicas compartan clave; en producción real se inyectaría con un Secret creado fuera del repositorio mediante `secretKeyRef`. Si la clave falta, la app genera una efímera y lo avisa en logs.
5. **Balanceo visible.** `/api/system/info` responde `Connection: close` y sin caché, porque kube-proxy balancea por conexión TCP: así el panel `/estado` observa cómo rotan los Pods.
6. **Despliegue seguro.** `RollingUpdate` con `maxSurge: 1` y `maxUnavailable: 0`; sondas `startup`, `liveness` y `readiness`; usuario no-root, sin escalada de privilegios y sin capabilities; apagado ordenado con `/readyz` en 503.
7. **`k8s/` solo contiene 3 manifiestos.** El namespace lo crea Argo CD con `CreateNamespace=true` y la `Application` vive en `argocd/`.

## 5. Desarrollo

### Paso 1. Deployment (`k8s/deployment.yml`)

Dos réplicas, labels `app.kubernetes.io/*`, selector coherente con el template, puerto `http` (3000), `requests` 100m/128Mi y `limits` 500m/256Mi, tres sondas, variables de entorno (`APP_VERSION`, `APP_ENV`, `POD_NAMESPACE` por `fieldRef`, `RATE_LIMIT_ENABLED`, `RECOMMEND_MAX_COMBINATIONS`) y `securityContext`. Ver el archivo comentado en [`k8s/deployment.yml`](../k8s/deployment.yml).

```bash
kubectl -n zentinel get deploy zentinel-store -o wide
```

[CAPTURA: 05-kubectl-get-all.png]

### Paso 2. Service NodePort (`k8s/service.yml`)

Tipo `NodePort`, `port: 80`, `targetPort: http`, `nodePort: 30080` y selector idéntico a los labels de los Pods. Ver [`k8s/service.yml`](../k8s/service.yml).

```bash
kubectl -n zentinel get svc zentinel-store
minikube service zentinel-store -n zentinel --url
```

[CAPTURA: 06-tienda-navegador.png]

### Paso 3. HPA (`k8s/hpa.yml`)

`autoscaling/v2`, mín. 2, máx. 5, CPU `Utilization` 50 %. `scaleUp` sin estabilización (hasta +2 Pods cada 30 s) y `scaleDown` con 60 s, para que la demo se vea en minutos. Requiere Metrics Server. Ver [`k8s/hpa.yml`](../k8s/hpa.yml).

```bash
kubectl top nodes
kubectl -n zentinel describe hpa zentinel-store
```

[CAPTURA: 02-metrics-server-top-nodes.png] [CAPTURA: 08-describe-hpa.png]

### Paso 4. Integración con Argo CD (`argocd/application.yml`)

La `Application` apunta al repositorio, a `targetRevision: main` y a la ruta `k8s`, con `syncPolicy.automated` (`prune` y `selfHeal`), `CreateNamespace=true` y la regla `ignoreDifferences`. Ver [`argocd/application.yml`](../argocd/application.yml).

```bash
./scripts/03-deploy-app.sh
kubectl -n argocd get application zentinel-store
```

[CAPTURA: 03-argocd-synced-healthy.png] [CAPTURA: 04-argocd-auto-sync-enabled.png]

## 6. Prueba de GitOps

Se modificó `APP_VERSION` de `"1.0.0"` a `"1.0.1"` en `k8s/deployment.yml` y se hizo `git push`. Argo CD detectó el commit, sincronizó automáticamente y ejecutó un *rolling update* sin caída. El panel `/estado` pasó a mostrar la nueva versión sin ejecutar `kubectl apply`.

[CAPTURA: 09-gitops-commit.png] [CAPTURA: 10-gitops-antes.png] [CAPTURA: 11-gitops-despues.png]

## 7. Prueba de autoescalado

Con `./scripts/04-load-test.sh start 4` se lanzaron generadores dentro del clúster que llaman a `POST /api/builder/recommend` y a búsquedas difusas. El HPA superó el 50 % de CPU y subió de **2 a 5 réplicas**; al detener la carga, tras la ventana de estabilización, bajó de nuevo a **2**. Durante la prueba, `/estado` mostró distintos Pods atendiendo.

[CAPTURA: 07-estado-balanceo.png] [CAPTURA: 12-hpa-sube-5.png] [CAPTURA: 13-hpa-baja-2.png]

## 8. Problemas y soluciones

| Problema | Causa | Solución |
|---|---|---|
| HPA con `<unknown>/50%` | Metrics Server sin datos o Pods sin `requests.cpu` | Habilitar el addon, esperar 1–2 min y definir `requests` de CPU |
| `OutOfSync` permanente con el HPA | Argo CD revertía `spec.replicas` | `ignoreDifferences` + `RespectIgnoreDifferences=true` |
| NodePort inaccesible en macOS | El driver `docker` no expone la IP del nodo | `minikube service … --url` (túnel) o `port-forward` |
| Comprobantes no válidos entre réplicas | Clave de firma efímera distinta por Pod | Misma `ORDER_SIGNING_KEY` en todas las réplicas |
| `/estado` mostraba siempre el mismo Pod | Conexión HTTP persistente | `Connection: close` en `/api/system/info` |
| Script de tema bloqueado | La CSP de helmet no permite scripts en línea | Mover el script a un archivo propio servido desde el mismo origen |

## 9. Conclusiones

GitOps reduce el despliegue a un `git push`: Argo CD aplica, vigila y corrige el clúster, y cada cambio queda registrado y es reversible. Diseñar la aplicación como *stateless* fue clave para que el HPA escale sin inconsistencias, y definir bien los `requests` de CPU es lo que da sentido al objetivo del 50 %. La regla `ignoreDifferences` es el punto de unión entre dos controladores que escriben el mismo campo (Argo CD y el HPA).

## 10. Enlaces

- Repositorio: https://github.com/ErickG11/Zentinel_ArgoCD_Kubernetes
- Imagen: https://hub.docker.com/r/erickg10/zentinel-store

[CAPTURA: 01-repo-github-k8s.png]
