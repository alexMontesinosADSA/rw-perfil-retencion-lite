(function (global) {
  'use strict';

  var APP_CONFIG = {
    APP_NAME: 'Gestion Retencion',
    PAGE_SIZE: 100,
    DEBOUNCE_SEARCH_MS: 250,
    DEBOUNCE_NOTE_MS: 600,
    LOCALSTORAGE_PREFIX: 'retention_tags_',
    MAX_NOTE_LENGTH: 500,
    REQUIRE_FILTER_TO_SHOW_LIST: true,
    TAGGED_STATUS: {
      ALL: 'ALL',
      TAGGED: 'TAGGED',
      UNTAGGED: 'UNTAGGED'
    },
    RISK_ORDER: ['ALTO', 'MEDIO', 'BAJO', 'INDETERMINADO'],
    DEFAULT_OPERATOR: ''
  };

  APP_CONFIG.COLUMN_ALIASES = {
    advertiser_id: ['advertiser_id', 'advertiserid', 'cliente_id', 'clienteid', 'id'],
    advertiser_name: ['advertiser_name', 'advertisername', 'nombre', 'name', 'cliente'],
    cycle_id: ['cycle_id', 'cycleid', 'ciclo'],
    assigned_label_code: ['assigned_label_code', 'assignedlabelcode', 'clasificacion', 'clasificacion_final', 'segmento', 'label', 'label_code'],
    assigned_risk_level_code: ['assigned_risk_level_code', 'assignedrisklevelcode', 'nivel', 'risk_level', 'riesgo'],
    assigned_action_code: ['assigned_action_code', 'assignedactioncode', 'accion', 'accion_sugerida', 'action'],
    score_total: ['score_total', 'scoretotal', 'score_final', 'scorefinal', 'score', 'score_retencion'],
    trigger_reason_detail: ['trigger_reason_detail', 'triggerreasondetail', 'senal', 'se\u00f1al', 'seal_principal'],
    trigger_reason_code: ['trigger_reason_code', 'triggerreasoncode'],
    has_rezago: ['has_rezago', 'hasrezago', 'flg_rezago', 'rezago'],
    sessions_month: ['sessions_month', 'sessionsmonth', 'session_month', 'sesiones'],
    open_cases_count: ['open_cases_count', 'opencasescount', 'open_cases', 'casos'],
    has_digital_campaign: ['has_digital_campaign', 'hasdigitalcampaign', 'flg_digital', 'digital'],
    last_contract_date: ['last_contract_date', 'lastcontractdate', 'fecha_contrato'],
    total_contract_amount: ['total_contract_amount', 'totalcontractamount', 'contract_amount_total', 'contract_ammount_total', 'monto_contrato', 'monto']
  };

  APP_CONFIG.TAG_TAXONOMY = [
    { code: 'PENDIENTE_CONTACTO', label: 'Pendiente de contacto', category: 'estado', color: '#8f94a8' },
    { code: 'CONTACTADO', label: 'Contactado', category: 'estado', color: '#2c7be5' },
    { code: 'NO_CONTACTA', label: 'No contesta', category: 'estado', color: '#f08c2e' },
    { code: 'NUMERO_INVALIDO', label: 'Numero invalido', category: 'estado', color: '#e05b5b' },
    { code: 'INTERESADO', label: 'Interesado en resolver', category: 'resultado', color: '#2f9e44' },
    { code: 'SIN_INTERES', label: 'Sin interes', category: 'resultado', color: '#c92a2a' },
    { code: 'EN_NEGOCIACION', label: 'En negociacion', category: 'resultado', color: '#f0b429' },
    { code: 'ACUERDO_ALCANZADO', label: 'Acuerdo alcanzado', category: 'resultado', color: '#1e7a36' },
    { code: 'PLAN_DE_PAGO_ACTIVO', label: 'Plan de pago activo', category: 'resultado', color: '#3182ce' },
    { code: 'ESCALADO', label: 'Escalado', category: 'cierre', color: '#7f5bd6' },
    { code: 'CERRADO_EXITOSO', label: 'Cerrado exitoso', category: 'cierre', color: '#256d2b' },
    { code: 'CERRADO_SIN_RESOLUCION', label: 'Cerrado sin resolucion', category: 'cierre', color: '#495057' },
    { code: 'FUERA_DE_UNIVERSO', label: 'Fuera de universo', category: 'cierre', color: '#6c757d' }
  ];

  APP_CONFIG.TAG_CATEGORY_LABELS = {
    estado: 'Estado de gestion',
    resultado: 'Resultado del contacto',
    cierre: 'Cierre de gestion'
  };

  APP_CONFIG.RISK_COLORS = {
    ALTO: '#c53030',
    MEDIO: '#dd6b20',
    BAJO: '#2f855a',
    INDETERMINADO: '#4a5568'
  };

  APP_CONFIG.LABEL_COLORS = {
    VP: '#1a365d',
    CQ: '#2f855a',
    SP: '#553c9a',
    FL: '#744210',
    TA: '#22543d',
    CS: '#2b6cb0',
    CS_MEDIO: '#2c5282',
    CS_BAJO: '#2a4365',
    RB: '#7b341e',
    IND: '#4a5568',
    INDETERMINADO: '#4a5568'
  };

  APP_CONFIG.CSV_COLUMNS = [
    'advertiser_id',
    'advertiser_name',
    'cycle_id',
    'assigned_label_code',
    'assigned_risk_level_code',
    'assigned_action_code',
    'score_total',
    'has_rezago',
    'sessions_month',
    'open_cases_count',
    'has_digital_campaign',
    'trigger_reason_detail',
    'trigger_reason_code',
    'last_contract_date',
    'total_contract_amount'
  ];

  global.APP_CONFIG = APP_CONFIG;
})(window);
