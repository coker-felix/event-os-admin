import { createFileRoute } from '@tanstack/react-router'
import { AdminModulePage } from '@/components/admin-module-page'

export const Route = createFileRoute('/app/_dashboard/documents/document-settings/')({
  component: AdminModulePage,
})
