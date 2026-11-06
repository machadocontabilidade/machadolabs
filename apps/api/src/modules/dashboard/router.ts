import { Router } from 'express'
import { pool } from '../../db/pool.js'
import { allowRoles } from '../permissions/authorize.js'

export const dashboardRouter = Router()

dashboardRouter.get('/', async (req, res, next) => {
  try {
    const q = await pool.query("SELECT count(*)::int total,count(*) FILTER(WHERE status='available')::int available FROM tools")
    const userTools = await pool.query("SELECT t.id,t.name,t.description,t.icon,t.category,t.route,t.status,t.updated_at FROM tools t WHERE $1 IN ('OWNER','ADMIN') OR EXISTS(SELECT 1 FROM user_permissions up JOIN permissions p ON p.id=up.permission_id WHERE up.user_id=$2 AND p.name='tools:read' AND (up.tool_id=t.id OR up.tool_id IS NULL)) ORDER BY t.updated_at DESC LIMIT 3", [req.auth!.role, req.auth!.userId])
    res.json({ total: q.rows[0].total, available: q.rows[0].available, recent: userTools.rows })
  } catch (error) { next(error) }
})

dashboardRouter.get('/admin', allowRoles('OWNER', 'ADMIN'), async (_req, res, next) => {
  try {
    const [users, tools, activity] = await Promise.all([
      pool.query("SELECT count(*)::int total,count(*) FILTER(WHERE status='active')::int active FROM users"),
      pool.query("SELECT count(*)::int total,count(*) FILTER(WHERE status='available')::int available,count(*) FILTER(WHERE status IN ('development','maintenance'))::int development FROM tools"),
      pool.query("SELECT e.id,e.event AS action,e.created_at AS at,e.details->>'resource' AS resource,COALESCE(e.details->>'toolId',e.details->>'userId',e.details->>'name',e.details->>'oldName') AS resource_id,u.name AS actor FROM security_events e LEFT JOIN users u ON u.id=e.user_id WHERE e.event IN ('user_created','user_updated','user_role_changed','user_status_changed','tool_created','tool_updated','tool_permissions_changed','category_created','category_updated','category_deleted') ORDER BY e.created_at DESC LIMIT 12")
    ])
    res.json({ users: users.rows[0], tools: tools.rows[0], activity: activity.rows })
  } catch (error) { next(error) }
})
