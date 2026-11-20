'use client'

import StudentShell, { StudentUser } from '@/components/StudentShell'
import ChangePasswordForm from '@/components/ChangePasswordForm'

function AccountContent({ user }: { user: StudentUser }) {
  return (
    <div className="max-w-md">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Account</h1>
        <p className="text-sm text-gray-500 mt-1">
          Signed in as <span className="font-medium text-gray-700">@{user.username}</span>
        </p>
      </div>

      <div className="bg-white rounded-xl border border-blue-100 p-6">
        <div className="text-sm font-semibold text-gray-500 mb-4">Change password</div>
        <ChangePasswordForm />
      </div>
    </div>
  )
}

export default function AccountPage() {
  return <StudentShell>{user => <AccountContent user={user} />}</StudentShell>
}