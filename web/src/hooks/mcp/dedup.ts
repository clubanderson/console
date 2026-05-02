/**
 * Cluster deduplication and metrics sharing — re-exports from clusterUtils.
 *
 * This module exists for backward compatibility. The canonical implementations
 * live in clusterUtils.ts (#11545).
 */

export {
  shareMetricsBetweenSameServerClusters,
  deduplicateClustersByServer,
} from './clusterUtils'
