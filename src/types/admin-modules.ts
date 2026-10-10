export type AdminModuleId =
  | 'accounts'
  | 'events'
  | 'ticketing'
  | 'staff'
  | 'platform'
  | 'commerce'
  | 'marketplace'
  | 'documents'

export type AdminNavigationItem = {
  label: string
  to: string
  icon?: string
}

export type AdminNavigationModule = {
  id: AdminModuleId
  label: string
  icon: string
  items: readonly AdminNavigationItem[]
}

/** Metadata for API modules; implementations can be added when endpoints are wired. */
export type AdminServiceModule = {
  id: AdminModuleId
  openApiTags: readonly string[]
  resources: readonly string[]
}

export type AdminService<TItem, TId = string, TQuery = void> = {
  list: (query: TQuery) => Promise<readonly TItem[]>
  get: (id: TId) => Promise<TItem>
}

export type AdminResourceMutations<TItem, TCreate, TUpdate, TId = string> = {
  create?: (input: TCreate) => Promise<TItem>
  update?: (id: TId, input: TUpdate) => Promise<TItem>
  remove?: (id: TId) => Promise<void>
}

export type AdminServiceResult<T> = {
  data: T
  status: number
}
