export const ENGINE_VERSION = 'impl1-1.0.0';
export const CAMPUS_TZ = 'America/Panama';
export const TZDATA_VERSION = 'fixed-UTC-05-v1';
export const RULE_IDS = ['R-VALID-01', 'R-DEP-01', 'R-FRZ-01', 'R-FRZ-02', 'R-TIER-03', 'R-TIER-02', 'R-TIER-01', 'R-FLEET-01', 'R-AUTH-02', 'R-AUTH-01', 'R-LAB-02', 'R-LAB-01', 'R-SYS-01', 'R-NIGHT-01', 'R-BOUND-01', 'R-QUOTA-01', 'R-QUOTA-02', 'R-CONTEND-01', 'R-ALLOW-01'] as const;
const citations = [['POL-ENTITLE', 'POL-FRZ', 'CATALOG'], ['POL-QUOTA', 'POL-LAB', 'POL-TIER'], ['POL-FRZ', 'CAMPUS-NOTICE-2026-04'], ['POL-FRZ'], ['POL-TIER', 'CATALOG', 'ROLE-TIERS'], ['POL-TIER', 'ROLE-TIERS'], ['POL-TIER', 'FLEET-INV-2026-Q3'], ['FLEET-INV-2026-Q3'], ['ROLE-TIERS', 'POL-ENTITLE'], ['POL-ENTITLE', 'CATALOG'], ['POL-LAB', 'SCHEDULE-2026-T5'], ['SCHEDULE-2026-T5', 'POL-LAB'], ['POL-ENTITLE', 'ROLE-TIERS'], ['POL-NIGHT'], ['POL-LAB', 'POL-NIGHT', 'POL-FRZ'], ['POL-QUOTA', 'QUOTA-TIERS'], ['POL-QUOTA', 'QUOTA-TIERS'], ['FLEET-INV-2026-Q3'], ['POL-TIER', 'POL-ENTITLE']];
const conditions = [
 'Invalid request, unresolved actor/model or invalid exam binding',
 'Required fact unavailable, malformed or timed out',
 'Active freeze covers request without permitted exam binding',
 'Validated exam binding is allowed by active freeze',
 'Declared resources incompatible and qualifying model variant exists',
 'Requested resources exceed actor clearance without qualifying variant',
 'No matching hardware or model floor exceeds declared VRAM',
 'Every eligible hardware class is failing and unavailable',
 'Actor role is below model minimum role',
 'Actor has no entitlement to requested subject',
 'Protected exam window without matching exam-bound request',
 'Protected class/lab window and asynchronous workload',
 'System actor requests workload outside its permitted kinds',
 'Human background/training request outside 22:00–06:00 campus time',
 'Requested duration exceeds earliest protection boundary minus grace',
 'Remaining quota is zero or negative',
 'Remaining positive quota is below estimated need',
 'Every eligible healthy hardware class is busy',
 'No denial or conditional admission applies'
];
export const RULES = RULE_IDS.map((rule_id, i) => ({ rule_id, precedence: i - 1, condition: conditions[i], outcome: ['R-FRZ-02', 'R-TIER-03', 'R-BOUND-01', 'R-QUOTA-02', 'R-CONTEND-01'].includes(rule_id) ? 'CONSTRAIN' : rule_id === 'R-ALLOW-01' ? 'ALLOW' : 'DENY', citation_ids: citations[i], rationale_template_id: rule_id }));
export const rank = (role: string) => ['STUDENT', 'TEACHING_ASSISTANT', 'INSTRUCTOR', 'RESEARCHER', 'ADMIN'].indexOf(role);
