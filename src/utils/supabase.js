import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Field maps: camelCase (app) ↔ snake_case (DB)
const SALES_MAP = {
  clientId: 'client_id',
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
  clientId: 'client_id',
  conversationsOpened: 'conversations_opened',
  followUps: 'follow_ups',
  offersLaunched: 'offers_launched',
  appointmentsBooked: 'appointments_booked',
  scheduledCalls: 'scheduled_calls',
  callsMade: 'calls_made',
  pickUps: 'pick_ups',
  scheduleCalls: 'schedule_calls',
}

const TEAM_MAP = {
  clientId: 'client_id',
  commissionRate: 'commission_rate',
  closerCommissionRate: 'closer_commission_rate',
  setterCommissionRate: 'setter_commission_rate',
  commissionStartDate: 'commission_start_date',
  mgmtCommissionStartDate: 'mgmt_commission_start_date',
}

const PROJECTIONS_MAP = {
  clientId: 'client_id',
  periodType: 'period_type',
  memberId: 'member_id',
  cashTarget: 'cash_target',
  revenueTarget: 'revenue_target',
  appointmentTarget: 'appointment_target',
}

const FEES_MAP = {
  clientId: 'client_id',
  feeRate: 'fee_rate',
}

const PRODUCTS_MAP = {
  clientId: 'client_id',
}

const N8N_MAP = {
  clientId: 'client_id',
  webhookUrl: 'webhook_url',
  apiKey: 'api_key',
  lastSync: 'last_sync',
}

const CLIENTS_MAP = {
  logoUrl: 'logo_url',
  primaryColor: 'primary_color',
  secondaryColor: 'secondary_color',
  bgColor: 'bg_color',
  bgCardColor: 'bg_card_color',
  bgSidebarColor: 'bg_sidebar_color',
  borderColor: 'border_color',
  textColor: 'text_color',
  textSecondaryColor: 'text_secondary_color',
}

// ---- CEO Mind field maps ----
const CEO_MEETINGS_MAP = {
  clientId: 'client_id',
  durationMinutes: 'duration_minutes',
  actionItems: 'action_items',
  keyTopics: 'key_topics',
  transcriptUrl: 'transcript_url',
}

const CEO_PROJECTS_MAP = {
  clientId: 'client_id',
  startDate: 'start_date',
  endDate: 'end_date',
}

const CEO_IDEAS_MAP = {
  clientId: 'client_id',
  meetingId: 'meeting_id',
  projectId: 'project_id',
}

const CEO_DAILY_DIGESTS_MAP = {
  clientId: 'client_id',
  keyMetrics: 'key_metrics',
  decisionsNeeded: 'decisions_needed',
  generatedAt: 'generated_at',
}

const CEO_WEEKLY_DIGESTS_MAP = {
  clientId: 'client_id',
  weekStart: 'week_start',
  weekEnd: 'week_end',
  numbersSummary: 'numbers_summary',
  executiveSummary: 'executive_summary',
  decisionsTaken: 'decisions_taken',
  nextSteps: 'next_steps',
  generatedAt: 'generated_at',
}

const CEO_TEAM_NOTES_MAP = {
  clientId: 'client_id',
  memberId: 'member_id',
  updatedAt: 'updated_at',
}

const CEO_INTEGRATIONS_MAP = {
  clientId: 'client_id',
  apiKey: 'api_key',
  lastSync: 'last_sync',
}

const CEO_FINANCE_ENTRIES_MAP = {
  clientId: 'client_id',
}

const SUPERADMINS_MAP = {}

const COMMISSION_PAYMENTS_MAP = {
  clientId: 'client_id',
  memberId: 'member_id',
  periodStart: 'period_start',
  periodEnd: 'period_end',
  cashBase: 'cash_base',
  commissionAmount: 'commission_amount',
  paidAt: 'paid_at',
}

const SA_COMMISSIONS_MAP = {
  clientId: 'client_id',
  commissionRate: 'commission_rate',
}

const CRM_CONTACTS_MAP = {
  clientId: 'client_id',
  dealValue: 'deal_value',
  assignedTo: 'assigned_to',
  customFields: 'custom_fields',
  lastActivityAt: 'last_activity_at',
  updatedAt: 'updated_at',
}

const CRM_ACTIVITIES_MAP = {
  clientId: 'client_id',
  contactId: 'contact_id',
  customType: 'custom_type',
  durationMinutes: 'duration_minutes',
  performedBy: 'performed_by',
  performedAt: 'performed_at',
}

const CRM_CUSTOM_FIELDS_MAP = {
  clientId: 'client_id',
  fieldKey: 'field_key',
  fieldType: 'field_type',
}

const CRM_SMART_VIEWS_MAP = {
  clientId: 'client_id',
  sortBy: 'sort_by',
  sortDir: 'sort_dir',
  createdBy: 'created_by',
}

const CRM_PIPELINES_MAP = {
  clientId: 'client_id',
  isDefault: 'is_default',
}

const COLD_CALL_REPORTS_MAP = {
  clientId: 'client_id',
  pickUps: 'pick_ups',
  scheduleCalls: 'schedule_calls',
}

const TABLE_MAPS = {
  sales: SALES_MAP,
  reports: REPORTS_MAP,
  team: TEAM_MAP,
  projections: PROJECTIONS_MAP,
  payment_fees: FEES_MAP,
  products: PRODUCTS_MAP,
  n8n_config: N8N_MAP,
  clients: CLIENTS_MAP,
  superadmins: SUPERADMINS_MAP,
  superadmin_commissions: SA_COMMISSIONS_MAP,
  ceo_meetings: CEO_MEETINGS_MAP,
  ceo_projects: CEO_PROJECTS_MAP,
  ceo_ideas: CEO_IDEAS_MAP,
  ceo_daily_digests: CEO_DAILY_DIGESTS_MAP,
  ceo_weekly_digests: CEO_WEEKLY_DIGESTS_MAP,
  ceo_team_notes: CEO_TEAM_NOTES_MAP,
  ceo_integrations: CEO_INTEGRATIONS_MAP,
  ceo_finance_entries: CEO_FINANCE_ENTRIES_MAP,
  commission_payments: COMMISSION_PAYMENTS_MAP,
  crm_contacts: CRM_CONTACTS_MAP,
  crm_activities: CRM_ACTIVITIES_MAP,
  crm_custom_fields: CRM_CUSTOM_FIELDS_MAP,
  crm_smart_views: CRM_SMART_VIEWS_MAP,
  crm_pipelines: CRM_PIPELINES_MAP,
}

// Valid DB columns per table (prevents unknown fields from causing insert errors)
const VALID_COLUMNS = {
  sales: new Set(['client_id', 'date', 'client_name', 'client_email', 'client_phone', 'instagram', 'product', 'producto_interes', 'payment_type', 'installment_number', 'payment_method', 'revenue', 'cash_collected', 'closer', 'setter', 'triager', 'gestor_asignado', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'pais', 'capital_disponible', 'situacion_actual', 'exp_amazon', 'decisor_confirmado', 'fecha_llamada', 'status', 'notes', 'source', 'close_activity_id']),
  reports: new Set(['client_id', 'date', 'role', 'name', 'conversations_opened', 'follow_ups', 'offers_launched', 'appointments_booked', 'scheduled_calls', 'calls_made', 'deposits', 'closes', 'deals', 'pick_ups', 'offers', 'schedule_calls']),
  team: new Set(['client_id', 'name', 'email', 'password', 'role', 'active', 'commission_rate', 'closer_commission_rate', 'setter_commission_rate', 'commission_start_date', 'mgmt_commission_start_date']),
  projections: new Set(['client_id', 'period', 'period_type', 'type', 'member_id', 'name', 'cash_target', 'revenue_target', 'appointment_target']),
  payment_fees: new Set(['client_id', 'method', 'fee_rate']),
  products: new Set(['client_id', 'name', 'price', 'active']),
  n8n_config: new Set(['client_id', 'webhook_url', 'api_key', 'enabled', 'last_sync']),
  ceo_meetings: new Set(['client_id', 'title', 'date', 'duration_minutes', 'participants', 'summary', 'action_items', 'key_topics', 'sentiment', 'transcript_url', 'status', 'source']),
  ceo_projects: new Set(['client_id', 'name', 'description', 'owner', 'priority', 'status', 'start_date', 'end_date', 'progress', 'tags']),
  ceo_ideas: new Set(['client_id', 'title', 'description', 'source', 'priority', 'status', 'meeting_id', 'project_id']),
  ceo_daily_digests: new Set(['client_id', 'date', 'summary', 'key_metrics', 'decisions_needed', 'highlights', 'alerts', 'generated_at']),
  ceo_weekly_digests: new Set(['client_id', 'week_start', 'week_end', 'numbers_summary', 'executive_summary', 'decisions_taken', 'next_steps', 'alerts', 'generated_at']),
  ceo_team_notes: new Set(['client_id', 'member_id', 'note', 'updated_at']),
  ceo_integrations: new Set(['client_id', 'service', 'api_key', 'config', 'enabled', 'last_sync']),
  ceo_finance_entries: new Set(['client_id', 'date', 'category', 'description', 'amount', 'recurring', 'notes']),
  commission_payments: new Set(['client_id', 'member_id', 'period_start', 'period_end', 'role', 'cash_base', 'rate', 'commission_amount', 'status', 'paid_at', 'notes']),
  crm_contacts: new Set(['client_id', 'name', 'email', 'phone', 'company', 'position', 'instagram', 'country', 'source', 'status', 'assigned_to', 'tags', 'custom_fields', 'notes', 'deal_value', 'last_activity_at', 'updated_at']),
  crm_activities: new Set(['client_id', 'contact_id', 'type', 'custom_type', 'title', 'description', 'outcome', 'duration_minutes', 'performed_by', 'performed_at']),
  crm_custom_fields: new Set(['client_id', 'name', 'field_key', 'field_type', 'options', 'required', 'position', 'active']),
  crm_smart_views: new Set(['client_id', 'name', 'filters', 'columns', 'sort_by', 'sort_dir', 'color', 'icon', 'position', 'created_by']),
  crm_pipelines: new Set(['client_id', 'name', 'stages', 'is_default']),
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
