export type ToolStatus = 'available' | 'development' | 'maintenance' | 'unavailable'
export type UserRole = 'OWNER' | 'ADMIN' | 'USER'
export type UserStatus = 'active' | 'disabled'
/** Interface pública do catálogo; acesso e permissões sempre são filtrados no servidor. */
export interface ToolDefinition { id:string; name:string; description:string; icon:string; category:string; route:string; status:ToolStatus }
export interface UserSummary { id:string; name:string; email:string; role:UserRole; status?:UserStatus }
