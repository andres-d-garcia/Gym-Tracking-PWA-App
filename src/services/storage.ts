import AsyncStorage from '@react-native-async-storage/async-storage';
import { Client, PaymentRecord, TrainerSettings } from '../types';
import { getTodayString, addMonthsToDate } from '../utils/date';

const STORAGE_KEYS = {
  CLIENTS: '@derwin_gym_clients_v1',
  PAYMENTS: '@derwin_gym_payments_v1',
  SETTINGS: '@derwin_gym_settings_v1',
};

export const DEFAULT_SETTINGS: TrainerSettings = {
  trainerName: 'Derwin',
  gymName: 'Gym Tracking',
  currency: '$',
  defaultCountryCode: '58',
  notifications: {
    enabled: true,
    daysBefore: 3,
    notifyOnDueDate: true,
    hour: 9,
  },
  paymentDetails: {
    pagoMovilBank: 'Banesco (0134)',
    pagoMovilPhone: '0412-1234567',
    pagoMovilId: 'V-20123456',
    zelleEmail: 'derwincoach@gmail.com',
    transferBank: '',
    transferAccount: '',
    cashInstructions: 'Entrega directa al iniciar la rutina',
  },
  templates: {
    dueSoon:
      '¡Hola {nombre}! 💪 Te recuerdo amistosamente que tu mensualidad de entrenamiento ({plan}) con {entrenador} vence en {dias} días (el {fecha}) por un monto de *{monto}*.\n\nAquí tienes los datos de pago:\n{datos_pago}\n\n¡Seguimos con todo el enfoque! 🔥🏋️‍♂️',
    dueToday:
      '¡Hola {nombre}! 💪 Hoy ({fecha}) corresponde el pago de tu mensualidad de entrenamiento ({plan}) por un monto de *{monto}*.\n\nPuedes transferir o hacer pago móvil a:\n{datos_pago}\n\n¡Por favor envíame el comprobante por acá. A darle duro hoy! ⚡',
    overdue:
      '¡Hola {nombre}! Espero estés excelente. Te escribo para recordarte que tu mensualidad de entrenamiento venció el {fecha} ({dias_vencido} días pendientes) por un valor de *{monto}*.\n\nPor favor realiza tu pago a:\n{datos_pago}\n\n¡Para mantener tu cupo y plan al día, envíame el capture! 💪🔥',
    generalReminder:
      '¡Hola {nombre}! 💪 Te saluda {entrenador}. Tu plan de entrenamiento ({plan}) está *al día* y tu próxima fecha de corte es el *{fecha}* (quedan {dias} días).\n\n¡Seguimos enfocados dándole con todo! 🔥🏋️‍♂️',
  },
};

export const INITIAL_CLIENTS: Client[] = [
  {
    id: 'client-1',
    fullName: 'Carlos Mendoza',
    phone: '04129876543',
    countryCode: '58',
    planName: 'Personalizado VIP',
    amount: 40,
    currency: '$',
    startDate: '2026-09-25',
    nextDueDate: '2026-10-25', // Vencido hace 2 días (asumiendo hoy 27 oct)
    notes: 'Hipertrofia - Pierna y Pecho',
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'client-2',
    fullName: 'Mariana Gómez',
    phone: '04141122334',
    countryCode: '58',
    planName: 'Semipersonalizado',
    amount: 25,
    currency: '$',
    startDate: '2026-09-28',
    nextDueDate: '2026-10-28', // Vence mañana (Por vencer)
    notes: 'Pérdida de grasa / Acondicionamiento',
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'client-3',
    fullName: 'Alejandro Rivas',
    phone: '04245566778',
    countryCode: '58',
    planName: 'Personalizado VIP',
    amount: 40,
    currency: '$',
    startDate: '2026-10-27',
    nextDueDate: '2026-10-27', // Vence hoy
    notes: 'Entrenamiento fuerza 5pm',
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'client-4',
    fullName: 'Daniela Salazar',
    phone: '04169988776',
    countryCode: '58',
    planName: 'Mensualidad General',
    amount: 20,
    currency: '$',
    startDate: '2026-10-15',
    nextDueDate: '2026-11-15', // Al día
    notes: 'Glúteos y tren inferior',
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'client-5',
    fullName: 'José Gregorio Silva',
    phone: '04123344556',
    countryCode: '58',
    planName: 'Semipersonalizado',
    amount: 25,
    currency: '$',
    startDate: '2026-09-20',
    nextDueDate: '2026-10-20', // Vencido hace 7 días
    notes: 'Horario matutino 7am',
    active: true,
    createdAt: new Date().toISOString(),
  },
];

export async function getClients(): Promise<Client[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.CLIENTS);
    if (!data) {
      await saveClients(INITIAL_CLIENTS);
      return INITIAL_CLIENTS;
    }
    return JSON.parse(data);
  } catch (error) {
    console.error('Error al cargar clientes:', error);
    return INITIAL_CLIENTS;
  }
}

export async function saveClients(clients: Client[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
  } catch (error) {
    console.error('Error al guardar clientes:', error);
    throw error;
  }
}

export async function getPayments(): Promise<PaymentRecord[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.PAYMENTS);
    if (!data) {
      return [];
    }
    return JSON.parse(data);
  } catch (error) {
    console.error('Error al cargar pagos:', error);
    return [];
  }
}

export async function savePayments(payments: PaymentRecord[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
  } catch (error) {
    console.error('Error al guardar pagos:', error);
    throw error;
  }
}

export async function addPayment(
  payment: Omit<PaymentRecord, 'id'>,
  renewClientMonth: boolean = true,
  customNextDueDate?: string
): Promise<{ payment: PaymentRecord; updatedClient?: Client }> {
  const clients = await getClients();
  const index = clients.findIndex((c) => c.id === payment.clientId);

  let updatedClient: Client | undefined;
  let isPartial = false;
  let remainingAfter = 0;

  if (index !== -1) {
    const current = clients[index];
    const currentPaid = current.paidAmount || 0;
    const totalPaidNow = Math.round((currentPaid + payment.amount) * 100) / 100;

    if (totalPaidNow < current.amount) {
      // Abono parcial: aún queda saldo pendiente en este ciclo
      isPartial = true;
      remainingAfter = Math.round((current.amount - totalPaidNow) * 100) / 100;
      const nextDue = renewClientMonth
        ? customNextDueDate || addMonthsToDate(current.nextDueDate, 1)
        : current.nextDueDate;

      clients[index] = {
        ...current,
        paidAmount: totalPaidNow,
        nextDueDate: nextDue,
      };
    } else {
      // Pago completo o liquidación del saldo restante: reinicia paidAmount a 0
      isPartial = false;
      remainingAfter = 0;
      const nextDue = renewClientMonth
        ? customNextDueDate || addMonthsToDate(current.nextDueDate, 1)
        : current.nextDueDate;

      clients[index] = {
        ...current,
        paidAmount: 0,
        nextDueDate: nextDue,
      };
    }

    updatedClient = clients[index];
    await saveClients(clients);
  }

  const newPayment: PaymentRecord = {
    ...payment,
    id: 'pay-' + Date.now(),
    isPartial,
    remainingAfter,
  };

  const payments = await getPayments();
  payments.unshift(newPayment);
  await savePayments(payments);

  return { payment: newPayment, updatedClient };
}

export async function getSettings(): Promise<TrainerSettings> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!data) {
      await saveSettings(DEFAULT_SETTINGS);
      return DEFAULT_SETTINGS;
    }
    const parsed = JSON.parse(data);
    const mergedPaymentDetails = {
      ...DEFAULT_SETTINGS.paymentDetails,
      ...(parsed.paymentDetails || {}),
    };
    if (mergedPaymentDetails.transferAccount === '0105-0000-00-0000000000') {
      mergedPaymentDetails.transferBank = '';
      mergedPaymentDetails.transferAccount = '';
    }
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      notifications: {
        ...DEFAULT_SETTINGS.notifications,
        ...(parsed.notifications || {}),
      },
      paymentDetails: mergedPaymentDetails,
      templates: {
        ...DEFAULT_SETTINGS.templates,
        ...(parsed.templates || {}),
      },
    };
  } catch (error) {
    console.error('Error al cargar configuración:', error);
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: TrainerSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (error) {
    console.error('Error al guardar configuración:', error);
    throw error;
  }
}

export async function exportAllData(): Promise<string> {
  const clients = await getClients();
  const payments = await getPayments();
  const settings = await getSettings();

  const backup = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    clients,
    payments,
    settings,
  };

  return JSON.stringify(backup, null, 2);
}

export async function importAllData(jsonString: string): Promise<boolean> {
  try {
    const data = JSON.parse(jsonString);
    if (data.clients && Array.isArray(data.clients)) {
      await saveClients(data.clients);
    }
    if (data.payments && Array.isArray(data.payments)) {
      await savePayments(data.payments);
    }
    if (data.settings) {
      await saveSettings(data.settings);
    }
    return true;
  } catch (error) {
    console.error('Error al importar backup:', error);
    return false;
  }
}

export async function clearClientsAndPayments(): Promise<void> {
  await saveClients([]);
  await savePayments([]);
}
