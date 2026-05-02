import { registerCacheReset } from '../../lib/modeTransition'
import type { PodInfo, PodIssue, Deployment, DeploymentIssue } from './types'

// ---------------------------------------------------------------------------
// Shared Workloads State - enables cache reset notifications to all consumers
// ---------------------------------------------------------------------------

export interface WorkloadsSharedState {
  cacheVersion: number  // Increments when cache is cleared to trigger re-fetch
  isResetting: boolean  // True during cache reset, triggers skeleton display
}

export let workloadsSharedState: WorkloadsSharedState = {
  cacheVersion: 0,
  isResetting: false,
}

// Subscribers that get notified when workloads cache is cleared
export type WorkloadsSubscriber = (state: WorkloadsSharedState) => void
export const workloadsSubscribers = new Set<WorkloadsSubscriber>()

// Notify all subscribers of cache reset
export function notifyWorkloadsSubscribers() {
  Array.from(workloadsSubscribers).forEach(subscriber => subscriber(workloadsSharedState))
}

// Subscribe to workloads cache changes (for hooks that need reactive updates)
export function subscribeWorkloadsCache(callback: WorkloadsSubscriber): () => void {
  workloadsSubscribers.add(callback)
  return () => workloadsSubscribers.delete(callback)
}

// ---------------------------------------------------------------------------
// Demo data (internal helpers used by workloadQueries.ts)
// ---------------------------------------------------------------------------

export function getDemoPods(): PodInfo[] {
  return [
    { name: 'api-server-7d8f9c6b5-x2k4m', namespace: 'production', cluster: 'prod-east', status: 'Running', ready: '1/1', restarts: 15, age: '2d', node: 'node-1' },
    { name: 'worker-5c6d7e8f9-n3p2q', namespace: 'batch', cluster: 'vllm-d', status: 'Running', ready: '1/1', restarts: 8, age: '5h', node: 'gpu-node-2' },
    { name: 'cache-redis-0', namespace: 'data', cluster: 'staging', status: 'Running', ready: '1/1', restarts: 5, age: '14d', node: 'node-3' },
    { name: 'frontend-8e9f0a1b2-def34', namespace: 'web', cluster: 'prod-west', status: 'Running', ready: '1/1', restarts: 3, age: '1d', node: 'node-2' },
    { name: 'nginx-ingress-abc123', namespace: 'ingress', cluster: 'prod-east', status: 'Running', ready: '1/1', restarts: 2, age: '7d', node: 'node-1' },
    { name: 'monitoring-agent-xyz', namespace: 'monitoring', cluster: 'staging', status: 'Running', ready: '1/1', restarts: 1, age: '30d', node: 'node-4' },
    { name: 'api-gateway-pod-1', namespace: 'production', cluster: 'prod-east', status: 'Running', ready: '1/1', restarts: 0, age: '3d', node: 'node-2' },
    { name: 'worker-processor-1', namespace: 'batch', cluster: 'vllm-d', status: 'Running', ready: '1/1', restarts: 0, age: '12h', node: 'gpu-node-1' },
    { name: 'database-primary-0', namespace: 'data', cluster: 'staging', status: 'Running', ready: '1/1', restarts: 0, age: '60d', node: 'node-5' },
    { name: 'scheduler-job-xyz', namespace: 'system', cluster: 'prod-east', status: 'Running', ready: '1/1', restarts: 0, age: '4h', node: 'node-1' },
  ]
}

export function getDemoPodIssues(): PodIssue[] {
  return [
    {
      name: 'api-server-crash-7d8f9c6b5',
      namespace: 'production',
      cluster: 'prod-east',
      status: 'CrashLoopBackOff',
      restarts: 23,
      reason: 'CrashLoopBackOff',
      issues: ['Back-off 5m0s restarting failed container'],
    },
    {
      name: 'worker-oom-5c6d7e8f9',
      namespace: 'batch',
      cluster: 'vllm-d',
      status: 'OOMKilled',
      restarts: 8,
      reason: 'OOMKilled',
      issues: ['Container exceeded memory limit'],
    },
    {
      name: 'pending-pod-abc123',
      namespace: 'staging',
      cluster: 'staging',
      status: 'Pending',
      restarts: 0,
      reason: 'Unschedulable',
      issues: ['No nodes available with required resources'],
    },
  ]
}

export function getDemoDeploymentIssues(): DeploymentIssue[] {
  return [
    {
      name: 'api-gateway',
      namespace: 'production',
      cluster: 'prod-east',
      replicas: 3,
      readyReplicas: 1,
      reason: 'Unavailable',
      message: 'Deployment does not have minimum availability',
    },
    {
      name: 'worker-service',
      namespace: 'batch',
      cluster: 'vllm-d',
      replicas: 5,
      readyReplicas: 3,
      reason: 'Progressing',
      message: 'ReplicaSet is progressing',
    },
  ]
}

export function getDemoDeployments(): Deployment[] {
  return [
    {
      name: 'api-gateway',
      namespace: 'production',
      cluster: 'prod-east',
      status: 'running',
      replicas: 3,
      readyReplicas: 3,
      updatedReplicas: 3,
      availableReplicas: 3,
      progress: 100,
      image: 'api-gateway:v2.4.1',
      age: '5d',
    },
    {
      name: 'worker-service',
      namespace: 'batch',
      cluster: 'vllm-d',
      status: 'deploying',
      replicas: 3,
      readyReplicas: 2,
      updatedReplicas: 3,
      availableReplicas: 2,
      progress: 67,
      image: 'worker:v1.8.0',
      age: '2h',
    },
    {
      name: 'frontend',
      namespace: 'web',
      cluster: 'prod-west',
      status: 'failed',
      replicas: 3,
      readyReplicas: 1,
      updatedReplicas: 3,
      availableReplicas: 1,
      progress: 33,
      image: 'frontend:v3.0.0',
      age: '30m',
    },
    {
      name: 'cache-redis',
      namespace: 'data',
      cluster: 'staging',
      status: 'running',
      replicas: 1,
      readyReplicas: 1,
      updatedReplicas: 1,
      availableReplicas: 1,
      progress: 100,
      image: 'redis:7.2.0',
      age: '14d',
    },
  ]
}

export function getDemoAllPods(): PodInfo[] {
  // Returns pods across all clusters for useAllPods
  return [
    ...getDemoPods(),
    { name: 'ml-inference-0', namespace: 'ml', cluster: 'vllm-d', status: 'Running', ready: '1/1', restarts: 0, age: '5d', node: 'gpu-node-1' },
    { name: 'ml-inference-1', namespace: 'ml', cluster: 'vllm-d', status: 'Running', ready: '1/1', restarts: 0, age: '5d', node: 'gpu-node-1' },
    { name: 'model-server-0', namespace: 'ml', cluster: 'vllm-d', status: 'Running', ready: '2/2', restarts: 1, age: '10d', node: 'gpu-node-1' },
    { name: 'training-job-abc', namespace: 'ml', cluster: 'vllm-d', status: 'Running', ready: '1/1', restarts: 0, age: '1d', node: 'gpu-node-1' },
  ]
}

// ---------------------------------------------------------------------------
// Module-level cache for pods data (persists across navigation)
// ---------------------------------------------------------------------------

export const PODS_CACHE_KEY = 'kubestellar-pods-cache'

export interface PodsCache {
  data: PodInfo[]
  timestamp: Date
  key: string
}

export let podsCache: PodsCache | null = null

export function setPodsCache(value: PodsCache | null) {
  podsCache = value
}

// Load pods cache from localStorage on startup
export function loadPodsCacheFromStorage(cacheKey: string): { data: PodInfo[], timestamp: Date } | null {
  try {
    const stored = localStorage.getItem(PODS_CACHE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (parsed.key === cacheKey && parsed.data && parsed.data.length > 0) {
        const timestamp = parsed.timestamp ? new Date(parsed.timestamp) : new Date()
        podsCache = { data: parsed.data, timestamp, key: cacheKey }
        return { data: parsed.data, timestamp }
      }
    }
  } catch {
    // Ignore parse errors
  }
  return null
}

export function savePodsCacheToStorage() {
  if (podsCache) {
    try {
      localStorage.setItem(PODS_CACHE_KEY, JSON.stringify({
        data: podsCache.data,
        timestamp: podsCache.timestamp.toISOString(),
        key: podsCache.key
      }))
    } catch {
      // Ignore storage errors
    }
  }
}

// ---------------------------------------------------------------------------
// Module-level cache for pod issues data (persists across navigation)
// ---------------------------------------------------------------------------

export interface PodIssuesCache {
  data: PodIssue[]
  timestamp: Date
  key: string
}
export let podIssuesCache: PodIssuesCache | null = null

export function setPodIssuesCache(value: PodIssuesCache | null) {
  podIssuesCache = value
}

// ---------------------------------------------------------------------------
// Module-level cache for deployment issues data (persists across navigation)
// ---------------------------------------------------------------------------

export interface DeploymentIssuesCache {
  data: DeploymentIssue[]
  timestamp: Date
  key: string
}
export let deploymentIssuesCache: DeploymentIssuesCache | null = null

export function setDeploymentIssuesCache(value: DeploymentIssuesCache | null) {
  deploymentIssuesCache = value
}

// ---------------------------------------------------------------------------
// Module-level cache for deployments data (persists across navigation)
// ---------------------------------------------------------------------------

export interface DeploymentsCache {
  data: Deployment[]
  timestamp: Date
  key: string
}
export let deploymentsCache: DeploymentsCache | null = null

export function setDeploymentsCache(value: DeploymentsCache | null) {
  deploymentsCache = value
}

// ============================================================================
// Mode Transition Registration - Clear all workload caches for unified demo switching
// ============================================================================

if (typeof window !== 'undefined') {
  registerCacheReset('workloads', () => {
    // Set resetting flag to trigger skeleton display in all subscribed hooks
    workloadsSharedState = {
      cacheVersion: workloadsSharedState.cacheVersion + 1,
      isResetting: true,
    }
    notifyWorkloadsSubscribers()

    // Clear pods cache
    try {
      localStorage.removeItem(PODS_CACHE_KEY)
    } catch {
      // Ignore storage errors
    }
    podsCache = null

    // Clear other module-level caches
    podIssuesCache = null
    deploymentIssuesCache = null
    deploymentsCache = null

    // Reset the resetting flag after a tick (hooks will re-fetch)
    setTimeout(() => {
      workloadsSharedState = { ...workloadsSharedState, isResetting: false }
      notifyWorkloadsSubscribers()
    }, 0)
  })
}
