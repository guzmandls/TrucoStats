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
  /** Código secreto para invitar; existe una vez que el grupo está en el servidor. */
  inviteCode?: string
  /** Qué integrante es la persona de este celular. Solo se guarda en el celular. */
  myMemberId?: string
}
