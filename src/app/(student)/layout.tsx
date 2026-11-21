import { ReactNode } from 'react'
import StudentShell from '@/components/StudentShell'

export default function StudentLayout({ children }: { children: ReactNode }) {
  return <StudentShell>{children}</StudentShell>
}