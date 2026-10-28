import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
  initialWindowMetrics,
} from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from './src/constants/theme';
import { Client, PaymentRecord, TrainerSettings, ClientStatus } from './src/types';
import {
  getClients,
  saveClients,
  getPayments,
  addPayment,
  getSettings,
  saveSettings,
  DEFAULT_SETTINGS,
} from './src/services/storage';
import { getDaysDifference, getClientStatus } from './src/utils/date';
import { cleanPhoneNumber, buildWhatsAppMessage, openWhatsApp } from './src/utils/whatsapp';

// Components
import { Header } from './src/components/Header';
import { StatCards } from './src/components/StatCards';
import { ClientCard } from './src/components/ClientCard';
import { ClientModal } from './src/components/ClientModal';
import { PaymentModal } from './src/components/PaymentModal';
import { WhatsAppPreviewModal } from './src/components/WhatsAppPreviewModal';
import { SettingsModal } from './src/components/SettingsModal';
import { PaymentHistoryModal } from './src/components/PaymentHistoryModal';

const FALLBACK_METRICS = {
  frame: { x: 0, y: 0, width: 0, height: 0 },
  insets: {
    top: Platform.OS === 'android' ? RNStatusBar.currentHeight || 24 : 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
};

function MainScreen() {
  const insets = useSafeAreaInsets();
  const topFallback =
    Platform.OS === 'android' && insets.top === 0
      ? RNStatusBar.currentHeight || 24
      : 0;
  const bottomFallback =
    Platform.OS === 'android' && insets.bottom === 0 ? 48 : 0;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [settings, setSettings] = useState<TrainerSettings>(DEFAULT_SETTINGS);

  // Search and Filter
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ClientStatus | 'ALL'>('ALL');

  // Modals state
  const [clientModalVisible, setClientModalVisible] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);

  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [clientForPayment, setClientForPayment] = useState<Client | null>(null);

  const [previewWhatsAppVisible, setPreviewWhatsAppVisible] = useState(false);
  const [clientForWhatsApp, setClientForWhatsApp] = useState<Client | null>(null);

  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);

  const loadData = async () => {
    try {
      const [loadedClients, loadedPayments, loadedSettings] = await Promise.all([
        getClients(),
        getPayments(),
        getSettings(),
      ]);
      setClients(loadedClients);
      setPayments(loadedPayments);
      setSettings(loadedSettings);
    } catch (e) {
      console.error('Error cargando datos:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleToggleSearch = () => {
    if (searchVisible) {
      setSearchQuery('');
      setSearchVisible(false);
    } else {
      setSearchVisible(true);
    }
  };

  const handleDirectWhatsApp = async (client: Client) => {
    const phone = cleanPhoneNumber(
      client.phone,
      client.countryCode || settings.defaultCountryCode
    );
    const message = buildWhatsAppMessage(client, settings);
    const success = await openWhatsApp(phone, message);
    if (!success) {
      Alert.alert(
        'Error',
        `No se pudo abrir WhatsApp para ${client.fullName} (${phone}).`
      );
    }
  };

  const handlePreviewWhatsApp = (client: Client) => {
    setClientForWhatsApp(client);
    setPreviewWhatsAppVisible(true);
  };

  const handleOpenPayment = (client: Client) => {
    setClientForPayment(client);
    setPaymentModalVisible(true);
  };

  const handleSavePayment = async (
    paymentData: Omit<PaymentRecord, 'id'>,
    renewClientMonth: boolean,
    customNextDueDate?: string
  ) => {
    try {
      const { payment, updatedClient } = await addPayment(
        paymentData,
        renewClientMonth,
        customNextDueDate
      );
      setPayments((prev) => [payment, ...prev]);

      if (updatedClient) {
        setClients((prev) =>
          prev.map((c) => (c.id === updatedClient.id ? updatedClient : c))
        );
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar el pago.');
    }
  };

  const handleSaveClient = async (
    clientData: Omit<Client, 'id' | 'createdAt'>,
    existingId?: string
  ) => {
    try {
      let updatedClients: Client[];
      if (existingId) {
        updatedClients = clients.map((c) =>
          c.id === existingId ? { ...c, ...clientData } : c
        );
      } else {
        const newClient: Client = {
          ...clientData,
          id: 'client-' + Date.now(),
          createdAt: new Date().toISOString(),
        };
        updatedClients = [newClient, ...clients];
      }
      setClients(updatedClients);
      await saveClients(updatedClients);
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar el entrenado.');
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    try {
      const updatedClients = clients.filter((c) => c.id !== clientId);
      setClients(updatedClients);
      await saveClients(updatedClients);
    } catch (e) {
      Alert.alert('Error', 'No se pudo eliminar el entrenado.');
    }
  };

  const handleSaveSettings = async (newSettings: TrainerSettings) => {
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  const { overdueCount, dueSoonCount, upToDateCount, pendingAmount, collectedAmount } =
    useMemo(() => {
      let overdue = 0;
      let dueSoon = 0;
      let upToDate = 0;
      let pending = 0;

      clients.forEach((c) => {
        const status = getClientStatus(c.nextDueDate);
        const paid = c.paidAmount || 0;
        const remaining = Math.max(0, Math.round((c.amount - paid) * 100) / 100);

        if (status === 'OVERDUE') {
          overdue++;
          pending += remaining;
        } else if (status === 'DUE_SOON') {
          dueSoon++;
          pending += remaining;
        } else {
          upToDate++;
          if (paid > 0 && remaining > 0) {
            pending += remaining;
          }
        }
      });

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const collected = payments.reduce((acc, p) => {
        const pDate = new Date(p.date);
        if (pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear) {
          return acc + p.amount;
        }
        return acc;
      }, 0);

      return {
        overdueCount: overdue,
        dueSoonCount: dueSoon,
        upToDateCount: upToDate,
        pendingAmount: pending,
        collectedAmount: collected,
      };
    }, [clients, payments]);

  const filteredClients = useMemo(() => {
    return clients
      .filter((c) => {
        if (statusFilter !== 'ALL') {
          const status = getClientStatus(c.nextDueDate);
          if (status !== statusFilter) return false;
        }
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const matchName = c.fullName.toLowerCase().includes(query);
          const matchPhone = c.phone.includes(query);
          const matchPlan = c.planName.toLowerCase().includes(query);
          return matchName || matchPhone || matchPlan;
        }
        return true;
      })
      .sort((a, b) => {
        const daysA = getDaysDifference(a.nextDueDate);
        const daysB = getDaysDifference(b.nextDueDate);
        return daysA - daysB;
      });
  }, [clients, statusFilter, searchQuery]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={COLORS.text} />
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.outerWrapper, { paddingBottom: bottomFallback }]}
      edges={['top', 'bottom', 'left', 'right']}
    >
      <View style={styles.container}>
        <StatusBar style="light" />

        <Header
          gymName={settings.gymName}
          pendingAmount={pendingAmount}
          collectedAmount={collectedAmount}
          currency={settings.currency}
          topInset={topFallback}
          searchVisible={searchVisible}
          searchQuery={searchQuery}
          onToggleSearch={handleToggleSearch}
          onChangeSearch={setSearchQuery}
          onOpenNewClient={() => {
            setClientToEdit(null);
            setClientModalVisible(true);
          }}
          onOpenSettings={() => setSettingsModalVisible(true)}
          onOpenHistory={() => setHistoryModalVisible(true)}
        />

        <StatCards
          totalClients={clients.length}
          overdueCount={overdueCount}
          dueSoonCount={dueSoonCount}
          upToDateCount={upToDateCount}
          selectedFilter={statusFilter}
          onSelectFilter={setStatusFilter}
        />

        <FlatList
          data={filteredClients}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.textSecondary}
            />
          }
          contentContainerStyle={{
            paddingBottom: Math.max(insets.bottom, 24) + 20,
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>Sin entrenados</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? 'No hay coincidencias para tu búsqueda.'
                  : 'No hay entrenados en esta vista.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <ClientCard
              client={item}
              onDirectWhatsApp={handleDirectWhatsApp}
              onPreviewWhatsApp={handlePreviewWhatsApp}
              onRegisterPayment={handleOpenPayment}
              onEditClient={(client) => {
                setClientToEdit(client);
                setClientModalVisible(true);
              }}
            />
          )}
        />

        <ClientModal
          visible={clientModalVisible}
          clientToEdit={clientToEdit}
          currency={settings.currency}
          onClose={() => setClientModalVisible(false)}
          onSave={handleSaveClient}
          onDelete={handleDeleteClient}
          onPreviewMessage={handlePreviewWhatsApp}
        />

        <PaymentModal
          visible={paymentModalVisible}
          client={clientForPayment}
          onClose={() => setPaymentModalVisible(false)}
          onSavePayment={handleSavePayment}
        />

        <WhatsAppPreviewModal
          visible={previewWhatsAppVisible}
          client={clientForWhatsApp}
          settings={settings}
          onClose={() => setPreviewWhatsAppVisible(false)}
        />

        <SettingsModal
          visible={settingsModalVisible}
          settings={settings}
          onClose={() => setSettingsModalVisible(false)}
          onSaveSettings={handleSaveSettings}
          onDataImported={loadData}
        />

        <PaymentHistoryModal
          visible={historyModalVisible}
          payments={payments}
          currency={settings.currency}
          onClose={() => setHistoryModalVisible(false)}
        />
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics ?? FALLBACK_METRICS}>
      <MainScreen />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  outerWrapper: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
    paddingHorizontal: 20,
    gap: 4,
  },
  emptyTitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  emptySubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
});
