export type ClientStatus = 'UP_TO_DATE' | 'DUE_SOON' | 'OVERDUE';

export interface Client {
  id: string;
  fullName: string;
  phone: string;
  countryCode: string; // e.g. "58"
  planName: string; // e.g. "Personalizado", "Sala de Máquinas"
  amount: number; // Cuota total del ciclo
  paidAmount?: number; // Monto abonado en el ciclo actual (0 si no hay abono parcial)
  currency: string; // "$" | "Bs"
  startDate: string; // YYYY-MM-DD
  nextDueDate: string; // YYYY-MM-DD
  durationDays?: number; // e.g. 30, 15, 7
  notes?: string;
  active: boolean;
  createdAt: string;
}

export type PaymentMethod = 'Pago Móvil' | 'Efectivo' | 'Zelle' | 'Transferencia' | 'Punto de Venta' | 'Otro';

export interface PaymentRecord {
  id: string;
  clientId: string;
  clientName: string;
  amount: number;
  currency: string;
  date: string; // YYYY-MM-DD HH:mm
  method: PaymentMethod;
  reference?: string;
  receiptImageUri?: string; // Capture de la transacción
  verified?: boolean; // Transacción comprobada
  isPartial?: boolean; // Indica si fue un abono parcial
  remainingAfter?: number; // Saldo restante tras este pago
  notes?: string;
}

export interface TrainerSettings {
  trainerName: string;
  gymName: string;
  currency: string;
  defaultCountryCode: string;
  notifications: {
    enabled: boolean;
    daysBefore: number; // X días antes del vencimiento
    notifyOnDueDate: boolean; // Avisar también el día que vence
    hour: number; // Hora del aviso (ej: 9 = 9:00 AM)
  };
  paymentDetails: {
    pagoMovilBank: string;
    pagoMovilPhone: string;
    pagoMovilId: string;
    zelleEmail: string;
    transferBank: string;
    transferAccount: string;
    cashInstructions: string;
  };
  templates: {
    dueSoon: string;
    dueToday: string;
    overdue: string;
    generalReminder: string;
  };
}
