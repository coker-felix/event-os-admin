import { createFileRoute } from '@tanstack/react-router'
import { SkillsPage } from '@/features/community/skills-page'

export const Route = createFileRoute('/app/_dashboard/community/skills')({
  component: SkillsPage,
})
