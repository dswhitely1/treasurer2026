import { api } from '../api'
import type { OrganizationSummary, OrganizationMember, Organization } from '@/types'

export interface CreateOrganizationInput {
  name: string
}

export interface UpdateOrganizationInput {
  name: string
}

export interface AddMemberInput {
  email: string
}

export interface UpdateMemberRoleInput {
  role: 'OWNER' | 'ADMIN' | 'MEMBER'
}

interface OrganizationResponse {
  success: boolean
  data: OrganizationSummary
  message: string
}

interface OrganizationsListResponse {
  success: boolean
  data: { organizations: OrganizationSummary[] }
}

interface OrganizationDetailResponse {
  success: boolean
  data: { organization: Organization }
}

interface MembersListResponse {
  success: boolean
  data: { members: OrganizationMember[] }
}

interface MemberResponse {
  success: boolean
  data: { member: OrganizationMember }
  message: string
}

interface MessageResponse {
  success: boolean
  message: string
}

export const organizationApi = {
  create: (data: CreateOrganizationInput) =>
    api.post<OrganizationResponse>('/organizations', data),

  list: () =>
    api.get<OrganizationsListResponse>('/organizations'),

  get: (orgId: string) =>
    api.get<OrganizationDetailResponse>(`/organizations/${orgId}`),

  update: (orgId: string, data: UpdateOrganizationInput) =>
    api.patch<MessageResponse>(`/organizations/${orgId}`, data),

  delete: (orgId: string) =>
    api.delete<MessageResponse>(`/organizations/${orgId}`),

  switch: (orgId: string) =>
    api.post<MessageResponse>(`/organizations/${orgId}/switch`),

  leave: (orgId: string) =>
    api.delete<MessageResponse>(`/organizations/${orgId}/leave`),

  listMembers: (orgId: string) =>
    api.get<MembersListResponse>(`/organizations/${orgId}/members`),

  addMember: (orgId: string, data: AddMemberInput) =>
    api.post<MemberResponse>(`/organizations/${orgId}/members`, data),

  updateMemberRole: (orgId: string, userId: string, data: UpdateMemberRoleInput) =>
    api.patch<MessageResponse>(`/organizations/${orgId}/members/${userId}`, data),

  removeMember: (orgId: string, userId: string) =>
    api.delete<MessageResponse>(`/organizations/${orgId}/members/${userId}`),
}
