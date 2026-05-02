/**
 * workloads.ts — Re-export barrel for backward compatibility.
 *
 * This file was decomposed into focused modules:
 * - workloadQueries.ts — Individual use* hooks for each resource type
 * - workloadSubscriptions.ts — Cache subscription management, demo data, mode transitions
 *
 * All existing imports from 'hooks/mcp/workloads' continue to work unchanged.
 */

// Re-export subscription/cache management
export { subscribeWorkloadsCache } from './workloadSubscriptions'
export type { WorkloadsSharedState } from './workloadSubscriptions'

// Re-export all hooks and their result types
export {
  usePods,
  useAllPods,
  usePodIssues,
  useDeploymentIssues,
  useDeployments,
  useJobs,
  useHPAs,
  useReplicaSets,
  useStatefulSets,
  useDaemonSets,
  useCronJobs,
  usePodLogs,
  USE_POD_LOGS_DEFAULT_TAIL,
} from './workloadQueries'

export type {
  PodClusterError,
  UsePodsResult,
  UseAllPodsResult,
  UsePodIssuesResult,
  UseDeploymentIssuesResult,
  UseDeploymentsResult,
  UseJobsResult,
  UseHPAsResult,
  UseReplicaSetsResult,
  UseStatefulSetsResult,
  UseDaemonSetsResult,
  UseCronJobsResult,
  UsePodLogsResult,
} from './workloadQueries'

// Re-export test helpers for backward compatibility
import {
  getDemoPods,
  getDemoPodIssues,
  getDemoDeploymentIssues,
  getDemoDeployments,
  getDemoAllPods,
  loadPodsCacheFromStorage,
  savePodsCacheToStorage,
  PODS_CACHE_KEY,
} from './workloadSubscriptions'

export const __workloadsTestables = {
  getDemoPods,
  getDemoPodIssues,
  getDemoDeploymentIssues,
  getDemoDeployments,
  getDemoAllPods,
  loadPodsCacheFromStorage,
  savePodsCacheToStorage,
  PODS_CACHE_KEY,
}
