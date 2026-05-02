import { useMemo } from 'react'
import { CheckCircle, AlertTriangle, Lock } from 'lucide-react'
import type { PV } from '../../hooks/useMCP'
import { useCachedPVs } from '../../hooks/useCachedData'
import { useGlobalFilters } from '../../hooks/useGlobalFilters'
import { useDemoMode } from '../../hooks/useDemoMode'
import { useCardLoadingState } from './CardDataContext'
import { useCardData, commonComparators } from '../../lib/cards/cardHooks'
import { CardSearchInput, CardControlsRow, CardPaginationFooter, CardAIActions } from '../../lib/cards/CardComponents'
import { ClusterBadge } from '../ui/ClusterBadge'
import { RefreshIndicator } from '../ui/RefreshIndicator'
import { useTranslation } from 'react-i18next'
import { DynamicCardErrorBoundary } from './DynamicCardErrorBoundary'

type SortByOption = 'status' | 'name' | 'capacity' | 'age'

const SORT_OPTIONS = [
  { value: 'status' as const, label: 'Status' },
  { value: 'name' as const, label: 'Name' },
  { value: 'capacity' as const, label: 'Capacity' },
  { value: 'age' as const, label: 'Age' },
]

const STATUS_ORDER: Record<string, number> = { failed: 0, released: 0, available: 1, bound: 2 }

// Parse capacity string to bytes for sorting
function parseCapacity(capacity?: string): number {
  if (!capacity) return 0
  const match = capacity.match(/^(\d+(?:\.\d+)?)\s*(Ki|Mi|Gi|Ti|Pi)?$/i)
  if (!match) return 0
  const value = parseFloat(match[1])
  const unit = (match[2] || '').toLowerCase()
  const multipliers: Record<string, number> = {
    '': 1,
    'ki': 1024,
    'mi': 1024 * 1024,
    'gi': 1024 * 1024 * 1024,
    'ti': 1024 * 1024 * 1024 * 1024,
    'pi': 1024 * 1024 * 1024 * 1024 * 1024,
  }
  return value * (multipliers[unit] || 1)
}

const PV_SORT_COMPARATORS = {
  status: (a: PV, b: PV) => (STATUS_ORDER[(a.status ?? '').toLowerCase()] ?? 1) - (STATUS_ORDER[(b.status ?? '').toLowerCase()] ?? 1),
  name: commonComparators.string<PV>('name'),
  capacity: (a: PV, b: PV) => parseCapacity(b.capacity) - parseCapacity(a.capacity),
  age: (a: PV, b: PV) => (a.age || '').localeCompare(b.age || ''),
}

function getStatusIcon(status: string) {
  switch ((status ?? '').toLowerCase()) {
    case 'bound':
      return <CheckCircle className="w-3 h-3 text-green-400" />
    case 'available':
      return <CheckCircle className="w-3 h-3 text-blue-400" />
    case 'released':
      return <Lock className="w-3 h-3 text-yellow-400" />
    default:
      return <AlertTriangle className="w-3 h-3 text-red-400" />
  }
}

function getStatusColor(status: string) {
  switch ((status ?? '').toLowerCase()) {
    case 'bound':
      return 'text-green-400'
    case 'available':
      return 'text-blue-400'
    case 'released':
      return 'text-yellow-400'
    default:
      return 'text-red-400'
  }
}

function PVStatusInternal() {
  const { t } = useTranslation(['common', 'cards'])
  const { pvs: allPVs, isLoading, isRefreshing, error, consecutiveFailures, isFailed, isDemoFallback, lastRefresh } = useCachedPVs()
  const { selectedClusters, isAllClustersSelected } = useGlobalFilters()
  const { isDemoMode: demoMode } = useDemoMode()

  // Apply global cluster filters
  const pvs = useMemo(() => {
    if (isAllClustersSelected) return allPVs
    return allPVs.filter(p => p.cluster && selectedClusters.includes(p.cluster))
  }, [allPVs, selectedClusters, isAllClustersSelected])

  // Report card data state
  const hasData = pvs.length > 0
  const { showSkeleton, showEmptyState } = useCardLoadingState({
    isLoading: isLoading && !hasData,
    isRefreshing,
    hasAnyData: hasData,
    isFailed,
    consecutiveFailures,
    isDemoData: isDemoFallback || demoMode,
    lastRefresh,
  })

  const {
    items: displayPVs,
    totalItems,
    currentPage,
    totalPages,
    itemsPerPage,
    goToPage,
    needsPagination,
    setItemsPerPage,
    filters: {
      search,
      setSearch,
      localClusterFilter,
      toggleClusterFilter,
      clearClusterFilter,
      availableClusters,
      showClusterFilter,
      setShowClusterFilter,
      clusterFilterRef,
    },
    sorting: {
      sortBy,
      setSortBy,
      sortDirection,
      setSortDirection,
    },
    containerRef,
    containerStyle,
  } = useCardData<PV, SortByOption>(pvs, {
    filter: {
      searchFields: ['name', 'cluster', 'storageClass'],
      clusterField: 'cluster',
      storageKey: 'pv-status',
    },
    sort: {
      defaultField: 'status',
      defaultDirection: 'asc',
      comparators: PV_SORT_COMPARATORS,
    },
    defaultLimit: 10,
  })

  // Stats based on filtered data
  const stats = useMemo(() => {
    let result = pvs

    // Apply local cluster filter
    if (localClusterFilter.length > 0) {
      result = result.filter(pv => {
        const clusterName = pv.cluster || ''
        return localClusterFilter.includes(clusterName)
      })
    }

    // Apply search filter
    if (search.trim()) {
      const query = search.toLowerCase()
      result = result.filter(pv =>
        pv.name.toLowerCase().includes(query) ||
        (pv.cluster?.toLowerCase() || '').includes(query) ||
        (pv.storageClass?.toLowerCase() || '').includes(query)
      )
    }

    const bound = result.filter(p => p.status === 'Bound').length
    const available = result.filter(p => p.status === 'Available').length
    const released = result.filter(p => p.status === 'Released').length
    return {
      total: result.length,
      bound,
      available,
      released,
      failed: result.length - bound - available - released,
    }
  }, [pvs, localClusterFilter, search])

  if (showSkeleton) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading PVs...</div>
      </div>
    )
  }

  if (showEmptyState) {
    return (
      <div className="h-full flex flex-col items-center justify-center min-h-card text-muted-foreground">
        <p className="text-sm">No Persistent Volumes</p>
        <p className="text-xs mt-1">Persistent Volumes will appear here</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-y-2 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">{totalItems} PVs</span>
          <RefreshIndicator
            isRefreshing={isRefreshing}
            lastUpdated={lastRefresh ? new Date(lastRefresh) : null}
            size="sm"
            showLabel={false}
          />
        </div>
        <CardControlsRow
          clusterIndicator={localClusterFilter.length > 0 ? {
            selectedCount: localClusterFilter.length,
            totalCount: availableClusters.length,
          } : undefined}
          clusterFilter={{
            availableClusters,
            selectedClusters: localClusterFilter,
            onToggle: toggleClusterFilter,
            onClear: clearClusterFilter,
            isOpen: showClusterFilter,
            setIsOpen: setShowClusterFilter,
            containerRef: clusterFilterRef,
            minClusters: 1,
          }}
          cardControls={{
            limit: itemsPerPage,
            onLimitChange: setItemsPerPage,
            sortBy,
            sortOptions: SORT_OPTIONS,
            onSortChange: (value: string) => setSortBy(value as SortByOption),
            sortDirection,
            onSortDirectionChange: setSortDirection,
          }}
        />
      </div>

      {/* Local Search */}
      <CardSearchInput
        value={search}
        onChange={setSearch}
        placeholder={t('cards:pvStatus.searchPlaceholder', 'Search volumes...')}
        className="mb-4"
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 @md:grid-cols-5 gap-2 mb-4">
        <div className="p-2 rounded-lg bg-secondary/50 text-center">
          <div className="text-lg font-bold text-foreground">{stats.total}</div>
          <div className="text-xs text-muted-foreground">{t('common:common.total')}</div>
        </div>
        <div className="p-2 rounded-lg bg-green-500/10 text-center">
          <div className="text-lg font-bold text-green-400">{stats.bound}</div>
          <div className="text-xs text-muted-foreground">Bound</div>
        </div>
        <div className="p-2 rounded-lg bg-blue-500/10 text-center">
          <div className="text-lg font-bold text-blue-400">{stats.available}</div>
          <div className="text-xs text-muted-foreground">Available</div>
        </div>
        <div className="p-2 rounded-lg bg-yellow-500/10 text-center">
          <div className="text-lg font-bold text-yellow-400">{stats.released}</div>
          <div className="text-xs text-muted-foreground">Released</div>
        </div>
        <div className="p-2 rounded-lg bg-red-500/10 text-center">
          <div className="text-lg font-bold text-red-400">{stats.failed}</div>
          <div className="text-xs text-muted-foreground">{t('common:common.failed')}</div>
        </div>
      </div>

      {/* PV List */}
      <div ref={containerRef} className="flex-1 space-y-1.5 overflow-y-auto" style={containerStyle}>
        {displayPVs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            {error ? 'Failed to load PVs' : 'No PVs found'}
          </div>
        ) : (
          displayPVs.map(pv => (
            <div
              key={`${pv.cluster}-${pv.name}`}
              className="flex flex-wrap items-center justify-between gap-y-2 p-2 rounded-lg bg-secondary/30 transition-colors"
              title="PV drilldown not available"
            >
              <div className="flex items-center gap-2 min-w-0">
                {getStatusIcon(pv.status)}
                {pv.cluster && <ClusterBadge cluster={pv.cluster} size="sm" />}
                <div className="min-w-0">
                  <div className="text-sm text-foreground truncate">{pv.name}</div>
                  {pv.claimRef && (
                    <div className="text-xs text-muted-foreground truncate">
                      Bound to: {pv.claimRef}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {pv.capacity && <span>{pv.capacity}</span>}
                {pv.storageClass && (
                  <span className="px-1.5 py-0.5 rounded bg-secondary text-foreground">
                    {pv.storageClass}
                  </span>
                )}
                <span className={getStatusColor(pv.status)}>{pv.status}</span>
                {pv.status !== 'Bound' && (
                  <CardAIActions
                    resource={{ kind: 'PersistentVolume', name: pv.name, cluster: pv.cluster, status: pv.status }}
                    issues={[{ name: `PV ${pv.status}`, message: `PersistentVolume is in ${pv.status} state${pv.storageClass ? ` (storageClass: ${pv.storageClass})` : ''}` }]}
                  />
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      <CardPaginationFooter
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        itemsPerPage={typeof itemsPerPage === 'number' ? itemsPerPage : totalItems}
        onPageChange={goToPage}
        needsPagination={needsPagination}
      />
    </div>
  )
}

export function PVStatus() {
  return (
    <DynamicCardErrorBoundary cardId="PVStatus">
      <PVStatusInternal />
    </DynamicCardErrorBoundary>
  )
}
