import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  selectOrganizations,
  selectCurrentOrganization,
  switchOrganization,
} from '@/store/features/organizationSlice'

export function OrganizationSwitcher() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const organizations = useAppSelector(selectOrganizations)
  const currentOrg = useAppSelector(selectCurrentOrganization)
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSwitch = async (orgId: string) => {
    if (orgId === currentOrg?.id) {
      setIsOpen(false)
      return
    }
    await dispatch(switchOrganization(orgId))
    setIsOpen(false)
    navigate(`/organizations/${orgId}/dashboard`)
  }

  const handleCreateNew = () => {
    setIsOpen(false)
    navigate('/organizations/new')
  }

  if (!currentOrg) {
    return (
      <button
        onClick={() => navigate('/organizations/new')}
        className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
      >
        Create Organization
      </button>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <span className="max-w-[150px] truncate">{currentOrg.name}</span>
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-md border border-gray-200 bg-white shadow-lg">
          <div className="py-1">
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => handleSwitch(org.id)}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
              >
                {org.id === currentOrg.id && (
                  <svg className="h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                {org.id !== currentOrg.id && <span className="w-4" />}
                <span className="truncate">{org.name}</span>
                <span className="ml-auto text-xs text-gray-400">{org.role}</span>
              </button>
            ))}
          </div>
          <div className="border-t border-gray-200">
            <button
              onClick={handleCreateNew}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create New Organization
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
