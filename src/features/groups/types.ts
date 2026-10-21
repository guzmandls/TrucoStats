export interface Member {
  id: string
  name: string
  avatar?: string
  /** Nombres con los que pudieron anotarlo en partidas anteriores como invitado. */
  aliases?: string[]
}

export interface Group {
  id: string
  name: string
  members: Member[]
  /** Integrantes administradores (puede haber varios; siempre hay al menos uno). */
  adminMemberIds: string[]
  createdAt: string
  /** Código secreto para invitar; existe una vez que el grupo está en el servidor. */
  inviteCode?: string
  /** Qué integrante es la persona de este celular. Solo se guarda en el celular. */
  myMemberId?: string
}
