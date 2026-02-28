import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Field maps: camelCase (app) ↔ snake_case (DB)
const SALES_MAP = {
  clientName: 'client_name',
  clientEmail: 'client_email',
  clientPhone: 'client_phone',
  paymentType: 'payment_type',
  installmentNumber: 'installment_number',
  paymentMethod: 'payment_method',
  cashCollected: 'cash_collected',
  productoInteres: 'producto_interes',
  gestorAsignado: 'gestor_asignado',
  utmSource: 'utm_source',
  utmMedium: 'utm_medium',
  utmCampaign: 'utm_campaign',
  utmContent: 'utm_content',
  capitalDisponible: 'capital_disponible',
  situacionActual: 'situacion_actual',
  expAmazon: 'exp_amazon',
  decisorConfirmado: 'decisor_confirmado',
  fechaLlamada: 'fecha_llamada',
  closeActivityId: 'close_activity_id',
}

const REPORTS_MAP = {
  conversationsOpened: 'conversations_opened',
  followUps: 'follow_ups',
  offersLaunched: 'offers_launched',
  appointmentsBooked: 'appointments_booked',
  scheduledCalls: 'scheduled_calls',
  callsMade: 'calls_made',
}

const TEAM_MAP = {
  commissionRate: 'commission_rate',
}

const PROJECTIONS_MAP = {
  periodType: 'period_type',
  memberId: 'member_id',
  cashTarget: 'cash_target',
  revenueTarget: 'revenue_target',
  appointmentTarget: 'appointment_target',
}

const FEES_MAP = {
  feeRate: 'fee_rate',
}

const N8N_MAP = {
  webhookUrl: 'webhook_url',
  apiKey: 'api_key',
  lastSync: 'last_sync',
}

const TABLE_MAPS = {
  sales: SALES_MAP,
  reports: REPORTS_MAP,
  team: TEAM_MAP,
  projections: PROJECTIONS_MAP,
  payment_fees: FEES_MAP,
  n8n_config: N8N_MAP,
}

// Valid DB columns per table (prevents unknown fields from causing insert errors)
const VALID_COLUMNS = {
  sales: new Set(['date', 'client_name', 'client_email', 'client_phone', 'instagram', 'product', 'producto_interes', 'payment_type', 'installment_number', 'payment_method', 'revenue', 'cash_collected', 'closer', 'setter', 'triager', 'gestor_asignado', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'pais', 'capital_disponible', 'situacion_actual', 'exp_amazon', 'decisor_confirmado', 'fecha_llamada', 'status', 'notes', 'source', 'close_activity_id']),
  reports: new Set(['date', 'role', 'name', 'conversations_opened', 'follow_ups', 'offers_launched', 'appointments_booked', 'scheduled_calls', 'calls_made', 'deposits', 'closes']),
  team: new Set(['name', 'email', 'password', 'role', 'active', 'commission_rate']),
  projections: new Set(['period', 'period_type', 'type', 'member_id', 'name', 'cash_target', 'revenue_target', 'appointment_target']),
  payment_fees: new Set(['method', 'fee_rate']),
  n8n_config: new Set(['webhook_url', 'api_key', 'enabled', 'last_sync']),
}

function buildReverse(map) {
  return Object.fromEntries(Object.entries(map).map(([k, v]) => [v, k]))
}

const REVERSE_MAPS = Object.fromEntries(
  Object.entries(TABLE_MAPS).map(([table, map]) => [table, buildReverse(map)])
)

export function toDb(obj, table) {
  const map = TABLE_MAPS[table] || {}
  const valid = VALID_COLUMNS[table]
  const result = {}
  for (const [key, value] of Object.entries(obj)) {
    if (key === 'netCash' || key === 'net_cash' || key === 'created_at') continue
    const dbKey = map[key] || key
    if (valid && !valid.has(dbKey)) continue // Skip unknown columns
    result[dbKey] = value
  }
  return result
}

export function toApp(row, table) {
  const reverse = REVERSE_MAPS[table] || {}
  const result = {}
  for (const [key, value] of Object.entries(row)) {
    if (key === 'created_at') continue
    const appKey = reverse[key] || key
    result[appKey] = value
  }
  return result
}
