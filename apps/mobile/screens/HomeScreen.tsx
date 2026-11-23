import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Modal,
  LayoutAnimation,
  TextInput,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { DEPARTMENTS } from './SignUpScreen';

const AVATARS = [
  { id: 'default', color: '#f3f4f6', icon: 'user', iconColor: '#9ca3af' },
  { id: 'av1', color: '#fee2e2', icon: 'smile', iconColor: '#ef4444' },
  { id: 'av2', color: '#dcfce3', icon: 'coffee', iconColor: '#22c55e' },
  { id: 'av3', color: '#e0e7ff', icon: 'star', iconColor: '#6366f1' },
  { id: 'av4', color: '#fef3c7', icon: 'sun', iconColor: '#f59e0b' },
  { id: 'av5', color: '#fce7f3', icon: 'heart', iconColor: '#ec4899' },
];

type VerifyLine = {
  id: number;
  name: string;
  unit: string;
  qtyRequested: number;
  qtyApproved: number;
  qtyReceived: number;
};

export default function HomeScreen({ userProfile, openQuantityModal }: any) {
  const [requests, setRequests] = useState<any[]>([]);
  const [hotItems, setHotItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [currentAvatar, setCurrentAvatar] = useState('default');
  const [expandedRequestId, setExpandedRequestId] = useState<number | null>(null);

  // Verification Modal States
  const [verifyingReq, setVerifyingReq] = useState<any | null>(null);
  const [verifyLines, setVerifyLines] = useState<VerifyLine[]>([]);
  const [discrepancyNote, setDiscrepancyNote] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, [userProfile]);

  // Live updates: when an officer approves or rejects one of MY requests, refresh the list
  // without the user pressing anything. RLS means only this user's own requests arrive.
  useEffect(() => {
    if (!userProfile?.id) return;
    const channel = supabase
      .channel(`my-requests-${userProfile.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'requests', filter: `user_id=eq.${userProfile.id}` },
        () => fetchDashboardData(true)
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProfile?.id]);

  const fetchDashboardData = async (silent = false) => {
    if (!userProfile || !userProfile.id) {
      setLoading(false);
      return;
    }

    if (!silent) setLoading(true);
    if (userProfile.avatar) setCurrentAvatar(userProfile.avatar);

    const { data: items } = await supabase.from('items').select('*').eq('is_active', true).limit(5);
    if (items) setHotItems(items);

    const { data: reqs, error } = await supabase
      .from('requests')
      .select(`
        id,
        status,
        request_date,
        approved_at,
        received_at,
        has_discrepancy,
        request_items ( id, item_id, qty_requested, qty_approved, qty_received, items (name, unit, item_code) )
      `)
      .eq('user_id', userProfile.id)
      .order('request_date', { ascending: false });

    if (error) {
      console.error('Ralat memuat turun permohonan:', error.message);
    } else if (reqs) {
      setRequests(reqs);
    }

    setLoading(false);
  };

  const updateAvatar = async (avatarId: string) => {
    if (!userProfile || !userProfile.id) {
      Alert.alert('Ralat', 'Sila log masuk semula.');
      return;
    }

    setCurrentAvatar(avatarId);
    setShowAvatarModal(false);

    const { error } = await supabase.from('users').update({ avatar: avatarId }).eq('id', userProfile.id);

    if (error) {
      console.error('Avatar error:', error);
      Alert.alert('Ralat', 'Gagal menukar gambar profil.');
    }
  };

  const cancelRequest = async (id: number) => {
    Alert.alert('Batal Permohonan', 'Pasti mahu batalkan permohonan ini?', [
      { text: 'Tidak', style: 'cancel' },
      {
        text: 'Ya, Batal',
        style: 'destructive',
        onPress: async () => {
  const { error } = await supabase.rpc('cancel_request', { p_request_id: id });
  if (error) Alert.alert('Ralat', error.message);
  else fetchDashboardData();
},
      },
    ]);
  };

  const toggleExpand = (id: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedRequestId(expandedRequestId === id ? null : id);
  };

  // Open Verification Modal for an Approved request
  const openVerifyModal = (req: any) => {
    const lines: VerifyLine[] = (req.request_items || []).map((ri: any) => {
      const requested = ri.qty_requested ?? 0;
      const approved = ri.qty_approved ?? requested;
      return {
        id: ri.id,
        name: ri.items?.name || 'Item tidak dijumpai',
        unit: ri.items?.unit || '',
        qtyRequested: requested,
        qtyApproved: approved,
        qtyReceived: approved, // Default to full approved quantity
      };
    });

    setVerifyLines(lines);
    setDiscrepancyNote('');
    setVerifyingReq(req);
  };

  const adjustReceivedQty = (lineId: number, delta: number) => {
    setVerifyLines((prev) =>
      prev.map((l) => {
        if (l.id !== lineId) return l;
        const next = l.qtyReceived + delta;
        if (next < 0 || next > l.qtyApproved) return l;
        return { ...l, qtyReceived: next };
      })
    );
  };

    const hasDiscrepancy = verifyLines.some((l) => l.qtyReceived < l.qtyApproved);

  const submitVerification = async () => {
    if (!verifyingReq) return;
    if (hasDiscrepancy && !discrepancyNote.trim()) {
      Alert.alert('Catatan Diperlukan', 'Sila nyatakan sebab perbezaan kuantiti yang diterima.');
      return;
    }

    setIsVerifying(true);
    try {
      const { error } = await supabase.rpc('confirm_receipt', {
        p_request_id: verifyingReq.id,
        p_lines: verifyLines.map((l) => ({ id: l.id, qty_received: l.qtyReceived })),
        p_note: hasDiscrepancy ? discrepancyNote.trim() : null,
      });

      if (error) throw error;

      setVerifyingReq(null);
      Alert.alert(
        'Pengesahan Berjaya',
        hasDiscrepancy
          ? 'Penerimaan direkodkan dengan laporan perbezaan. Pegawai Stor & Admin telah dimaklumkan.'
          : 'Terima kasih! Penerimaan barangan telah disahkan dan Pegawai Stor telah dimaklumkan.'
      );
      fetchDashboardData();
    } catch (err: any) {
      Alert.alert('Ralat', err.message || 'Gagal mengesahkan penerimaan.');
    } finally {
      setIsVerifying(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved':
        return '#16a34a';
      case 'Rejected':
        return '#ef4444';
      case 'Cancelled':
        return '#6b7280';
      case 'Received':
        return '#2563eb';
      default:
        return '#f59e0b';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'Diluluskan · Sedia Diambil';
      case 'Rejected':
        return 'Ditolak';
      case 'Cancelled':
        return 'Dibatalkan';
      case 'Received':
        return 'Telah Diterima';
      default:
        return 'Dalam Proses';
    }
  };

  const activeAvatar = AVATARS.find((a) => a.id === currentAvatar) || AVATARS[0];
  const userDept = DEPARTMENTS.find((d) => d.id === userProfile?.department_id);

  const renderHotItem = (item: any) => (
    <TouchableOpacity key={item.id} activeOpacity={0.7} style={styles.hotCard} onPress={() => openQuantityModal(item)}>
      <View style={styles.hotIconBg}>
        <Feather name="trending-up" size={18} color="#ef4444" />
      </View>
      <Text style={styles.hotName} numberOfLines={2}>
        {item.name}
      </Text>
      <Text style={styles.hotStock}>
        Baki: {item.current_stock} {item.unit}
      </Text>
      <View style={styles.hotAddBtn}>
        <Text style={styles.hotAddText}>Mohon</Text>
      </View>
    </TouchableOpacity>
  );

  const renderRequest = ({ item }: { item: any }) => {
    const dateObj = new Date(item.request_date);
    const formattedDate = dateObj.toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' });
    const formattedTime = dateObj.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' });
    const itemCount = item.request_items ? item.request_items.length : 0;
    const isExpanded = expandedRequestId === item.id;

    return (
      <View style={styles.reqCard}>
        <TouchableOpacity activeOpacity={0.8} onPress={() => toggleExpand(item.id)}>
          <View style={styles.reqHeader}>
            <View style={styles.reqIdWrap}>
              <Feather name="file-text" size={16} color="#5138a1" style={{ marginRight: 6 }} />
              <Text style={styles.reqId}>ID: #{item.id}</Text>
            </View>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: getStatusColor(item.status) + '15',
                  borderColor: getStatusColor(item.status) + '30',
                },
              ]}
            >
              <Text style={[styles.badgeText, { color: getStatusColor(item.status) }]}>
                {getStatusText(item.status)}
              </Text>
            </View>
          </View>

          <View style={styles.reqBody}>
            <View style={styles.reqInfoRow}>
              <Feather name="calendar" size={14} color="#6b7280" style={{ marginRight: 8 }} />
              <Text style={styles.reqInfoText}>
                {formattedDate} • {formattedTime}
              </Text>
            </View>
            <View style={styles.reqInfoRow}>
              <Feather name="package" size={14} color="#6b7280" style={{ marginRight: 8 }} />
              <Text style={styles.reqInfoText}>{itemCount} jenis barangan dipohon</Text>
            </View>

            <Feather name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color="#9ca3af" style={styles.expandIcon} />
          </View>
        </TouchableOpacity>

        {/* Dropdown Items Section */}
        {isExpanded && (
          <View style={styles.expandedContainer}>
            <Text style={styles.expandedTitle}>Senarai Barangan:</Text>
            {item.request_items?.map((reqItem: any, index: number) => {
              const qtyReq = reqItem.qty_requested ?? 0;
              const qtyApp = reqItem.qty_approved;
              const qtyRec = reqItem.qty_received;
              const itemName = reqItem.items?.name || 'Item tidak dijumpai';
              const itemUnit = reqItem.items?.unit || '';

              return (
                <View key={reqItem.id || index} style={styles.expandedItemRow}>
                  <Text style={styles.expandedItemName}>• {itemName}</Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.expandedItemQty}>
                      Mohon: {qtyReq} {itemUnit}
                    </Text>
                    {(item.status === 'Approved' || item.status === 'Received') && qtyApp !== null && (
                      <Text style={styles.approvedSubText}>
                        Lulus: {qtyApp} {itemUnit}
                        {item.status === 'Received' && qtyRec !== null ? ` · Terima: ${qtyRec} ${itemUnit}` : ''}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Pending -> Cancel Action */}
        {item.status === 'Pending' && (
          <View style={styles.reqFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => cancelRequest(item.id)}>
              <Feather name="x-circle" size={16} color="#ef4444" />
              <Text style={styles.cancelBtnText}>Batal Permohonan</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Approved -> Verify Receipt Action */}
        {item.status === 'Approved' && (
          <View style={styles.reqFooter}>
            <TouchableOpacity style={styles.verifyBtn} onPress={() => openVerifyModal(item)}>
              <Feather name="check-circle" size={16} color="#ffffff" />
              <Text style={styles.verifyBtnText}>Sahkan Penerimaan</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.profileBanner}>
        <TouchableOpacity style={[styles.avatar, { backgroundColor: activeAvatar.color }]} onPress={() => setShowAvatarModal(true)}>
          <Feather name={activeAvatar.icon as any} size={28} color={activeAvatar.iconColor} />
          <View style={styles.editBadge}>
            <Feather name="edit-2" size={10} color="#fff" />
          </View>
        </TouchableOpacity>
        <View style={styles.profileInfo}>
          <Text style={styles.greeting}>Selamat Datang,</Text>
          <Text style={styles.name} numberOfLines={1}>
            {userProfile?.full_name || 'Kakitangan MDR'}
          </Text>
          <Text style={styles.jawatan} numberOfLines={1}>
            {userProfile?.jawatan || 'Tiada Jawatan'} {userDept ? `(${userDept.short})` : ''}
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Barangan Sering Dipohon</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hotScroll}>
            {hotItems.map(renderHotItem)}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Status Permohonan</Text>
            <TouchableOpacity onPress={() => fetchDashboardData()} style={styles.refreshBtn}>
              <Feather name="refresh-cw" size={16} color="#5138a1" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#5138a1" style={{ marginTop: 40 }} />
          ) : !loading && requests.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="inbox" size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>Tiada permohonan dibuat setakat ini.</Text>
            </View>
          ) : (
            <FlatList data={requests} keyExtractor={(item) => item.id.toString()} renderItem={renderRequest} scrollEnabled={false} />
          )}
        </View>
      </ScrollView>

      {/* Avatar Modal */}
      <Modal visible={showAvatarModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Pilih Gambar Profil</Text>
            <View style={styles.avatarGrid}>
              {AVATARS.map((av) => (
                <TouchableOpacity
                  key={av.id}
                  style={[styles.avatarOption, { backgroundColor: av.color }, currentAvatar === av.id && styles.avatarSelected]}
                  onPress={() => updateAvatar(av.id)}
                >
                  <Feather name={av.icon as any} size={32} color={av.iconColor} />
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowAvatarModal(false)}>
              <Text style={styles.closeBtnText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Receipt Verification Modal */}
      <Modal visible={verifyingReq !== null} transparent animationType="slide">
        <View style={styles.verifyOverlay}>
          <View style={styles.verifySheet}>
            <View style={styles.verifyHeader}>
              <View>
                <Text style={styles.verifyTitle}>Pengesahan Penerimaan</Text>
                <Text style={styles.verifySub}>Permohonan KEW.PS-8 #{verifyingReq?.id}</Text>
              </View>
              <TouchableOpacity onPress={() => setVerifyingReq(null)} disabled={isVerifying}>
                <Feather name="x" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.verifyGuide}>
              Sila semak kuantiti fizikal yang diterima daripada Stor Pusat sebelum mengesahkan:
            </Text>

            <ScrollView style={styles.verifyList}>
              {verifyLines.map((line) => {
                const isShort = line.qtyReceived < line.qtyApproved;
                return (
                  <View key={line.id} style={[styles.verifyRow, isShort && styles.verifyRowWarn]}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={styles.verifyItemName}>{line.name}</Text>
                      <Text style={styles.verifyItemMeta}>
                        Diluluskan: {line.qtyApproved} {line.unit} (Dimohon: {line.qtyRequested})
                      </Text>
                    </View>

                    <View style={styles.stepperWrap}>
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        disabled={isVerifying || line.qtyReceived <= 0}
                        onPress={() => adjustReceivedQty(line.id, -1)}
                      >
                        <Feather name="minus" size={16} color="#5138a1" />
                      </TouchableOpacity>
                      <Text style={styles.stepperVal}>{line.qtyReceived}</Text>
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        disabled={isVerifying || line.qtyReceived >= line.qtyApproved}
                        onPress={() => adjustReceivedQty(line.id, 1)}
                      >
                        <Feather name="plus" size={16} color="#5138a1" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}

              {hasDiscrepancy && (
                <View style={styles.discrepancyBox}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <Feather name="alert-triangle" size={16} color="#b45309" style={{ marginRight: 6 }} />
                    <Text style={styles.discrepancyTitle}>Perbezaan Penerimaan Dikesan</Text>
                  </View>
                  <Text style={styles.discrepancyHint}>
                    Kuantiti diterima kurang daripada jumlah diluluskan. Sila nyatakan sebab untuk makluman Pegawai Stor:
                  </Text>
                  <TextInput
                    style={styles.discrepancyInput}
                    placeholder="Contoh: Stok fizikal tidak mencukupi di kaunter stor..."
                    placeholderTextColor="#9ca3af"
                    multiline
                    numberOfLines={3}
                    value={discrepancyNote}
                    onChangeText={setDiscrepancyNote}
                  />
                </View>
              )}
            </ScrollView>

            <View style={styles.verifyFooter}>
              <TouchableOpacity
                style={[styles.confirmReceiptBtn, hasDiscrepancy && { backgroundColor: '#d97706' }]}
                disabled={isVerifying}
                onPress={submitVerification}
              >
                <Feather name="check" size={18} color="#ffffff" style={{ marginRight: 8 }} />
                <Text style={styles.confirmReceiptText}>
                  {isVerifying
                    ? 'Menghantar...'
                    : hasDiscrepancy
                    ? 'Sahkan Dengan Laporan Perbezaan'
                    : 'Sahkan & Maklumkan Pegawai'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4effc' },
  profileBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 24, margin: 20, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 4 },
  avatar: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginRight: 16, position: 'relative' },
  editBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#5138a1', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  profileInfo: { flex: 1 },
  greeting: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  name: { fontSize: 18, fontWeight: '800', color: '#1f2937', marginTop: 2 },
  jawatan: { fontSize: 13, color: '#5138a1', fontWeight: '700', marginTop: 2 },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1f2937' },
  refreshBtn: { padding: 8, backgroundColor: '#e0e7ff', borderRadius: 8 },
  hotScroll: { paddingHorizontal: 20, gap: 12 },
  hotCard: { width: 140, backgroundColor: '#fff', padding: 16, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  hotIconBg: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fef2f2', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  hotName: { fontSize: 14, fontWeight: '700', color: '#1f2937', height: 40 },
  hotStock: { fontSize: 12, color: '#6b7280', marginTop: 8, marginBottom: 12 },
  hotAddBtn: { backgroundColor: '#5138a1', paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  hotAddText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  reqCard: { backgroundColor: '#fff', borderRadius: 16, marginHorizontal: 20, marginBottom: 16, borderWidth: 1, borderColor: '#e5e7eb', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 2, overflow: 'hidden' },
  reqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', backgroundColor: '#fafafa' },
  reqIdWrap: { flexDirection: 'row', alignItems: 'center' },
  reqId: { fontSize: 14, fontWeight: '800', color: '#1f2937' },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  reqBody: { padding: 16, position: 'relative' },
  reqInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  reqInfoText: { fontSize: 13, color: '#4b5563', fontWeight: '500' },
  expandIcon: { position: 'absolute', right: 16, top: '50%' },

  expandedContainer: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6', backgroundColor: '#f9fafb' },
  expandedTitle: { fontSize: 12, fontWeight: '700', color: '#6b7280', marginBottom: 10, textTransform: 'uppercase' },
  expandedItemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, alignItems: 'flex-start' },
  expandedItemName: { fontSize: 14, color: '#374151', flex: 1, paddingRight: 10 },
  expandedItemQty: { fontSize: 13, fontWeight: '700', color: '#5138a1' },
  approvedSubText: { fontSize: 12, fontWeight: '600', color: '#16a34a', marginTop: 2 },

  reqFooter: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 4 },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fef2f2', paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#fecaca' },
  cancelBtnText: { color: '#ef4444', fontWeight: '700', marginLeft: 8, fontSize: 13 },
  verifyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#16a34a', paddingVertical: 12, borderRadius: 12, shadowColor: '#16a34a', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 3 },
  verifyBtnText: { color: '#ffffff', fontWeight: '800', marginLeft: 8, fontSize: 14 },

  emptyState: { alignItems: 'center', marginTop: 40 },
  emptyText: { marginTop: 16, color: '#9ca3af', fontSize: 15, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: '#fff', borderRadius: 24, padding: 24, alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1f2937', marginBottom: 20 },
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16, marginBottom: 24 },
  avatarOption: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  avatarSelected: { borderWidth: 3, borderColor: '#5138a1' },
  closeBtn: { backgroundColor: '#f3f4f6', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 12 },
  closeBtnText: { color: '#4b5563', fontWeight: '700' },

  // Verification Sheet Styles
  verifyOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  verifySheet: { backgroundColor: '#ffffff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '85%', padding: 24 },
  verifyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  verifyTitle: { fontSize: 20, fontWeight: '900', color: '#1f2937' },
  verifySub: { fontSize: 13, fontWeight: '700', color: '#5138a1', marginTop: 2 },
  verifyGuide: { fontSize: 13, color: '#6b7280', marginBottom: 16, lineHeight: 18 },
  verifyList: { maxHeight: 360 },
  verifyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f9fafb', padding: 14, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  verifyRowWarn: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  verifyItemName: { fontSize: 14, fontWeight: '700', color: '#1f2937' },
  verifyItemMeta: { fontSize: 12, color: '#6b7280', marginTop: 3 },
  stepperWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  stepperBtn: { padding: 8 },
  stepperVal: { fontSize: 15, fontWeight: '800', color: '#1f2937', minWidth: 26, textAlign: 'center' },
  discrepancyBox: { backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fcd34d', borderRadius: 14, padding: 14, marginTop: 6, marginBottom: 12 },
  discrepancyTitle: { fontSize: 13, fontWeight: '800', color: '#92400e' },
  discrepancyHint: { fontSize: 12, color: '#78350f', marginBottom: 8, lineHeight: 17 },
  discrepancyInput: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#fde68a', borderRadius: 10, padding: 10, fontSize: 13, color: '#1f2937', textAlignVertical: 'top' },
  verifyFooter: { paddingTop: 14, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  confirmReceiptBtn: { flexDirection: 'row', backgroundColor: '#16a34a', paddingVertical: 15, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  confirmReceiptText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
});