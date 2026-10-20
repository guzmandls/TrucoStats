export interface Member {
  id: string
  name: string
  avatar?: string
}

export interface Group {
  id: string
  name: string
  members: Member[]
  adminMemberId: string
  createdAt: string
}
