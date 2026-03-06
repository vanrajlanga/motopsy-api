/**
 * payment_for values for payment_history table.
 * These are static integer codes — update here if new service types are added.
 */
const PAYMENT_FOR = {
  VEHICLE_HISTORY_REPORT: 0,
  PHYSICAL_VERIFICATION: 1,
  USED_VEHICLE_PDI: 3,
  NEW_VEHICLE_PDI: 4,
  SERVICE_HISTORY: 5,
};

/** payment_for values that represent report/history orders (admin: Vehicle History Orders list) */
PAYMENT_FOR.REPORT_TYPES = [
  PAYMENT_FOR.VEHICLE_HISTORY_REPORT,
  PAYMENT_FOR.PHYSICAL_VERIFICATION,
  PAYMENT_FOR.SERVICE_HISTORY,
];

/** payment_for values that represent physical inspection/PDI orders (admin: Inspection Booking Orders list) */
PAYMENT_FOR.INSPECTION_TYPES = [
  PAYMENT_FOR.USED_VEHICLE_PDI,
  PAYMENT_FOR.NEW_VEHICLE_PDI,
];

/** Human-readable labels */
PAYMENT_FOR.NAMES = {
  [PAYMENT_FOR.VEHICLE_HISTORY_REPORT]: 'Vehicle History Report',
  [PAYMENT_FOR.PHYSICAL_VERIFICATION]: 'Physical Verification',
  [PAYMENT_FOR.USED_VEHICLE_PDI]: 'Used Vehicle PDI',
  [PAYMENT_FOR.NEW_VEHICLE_PDI]: 'New Vehicle PDI',
  [PAYMENT_FOR.SERVICE_HISTORY]: 'Service History Report',
};

PAYMENT_FOR.getName = (code) => PAYMENT_FOR.NAMES[code] || 'Unknown';

/** Returns true if this payment_for code is a service/inspection order */
PAYMENT_FOR.isServiceOrder = (code) => PAYMENT_FOR.INSPECTION_TYPES.includes(code);

module.exports = PAYMENT_FOR;
