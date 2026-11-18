import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Modal, LayoutAnimation } from 'react-native';
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

export default function HomeScreen({ userProfile, openQuantityModal, navigateTo }: any) {
  const [requests, setRequests] = useState<any[]>([]);
  const [hotItems, setHotItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [currentAvatar, setCurrentAvatar] = useState('default');
  
  // State for expanded card
  const [expandedRequestId, setExpandedRequestId] = useState<number | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, [userProfile]);

    const fetchDashboardData = async () => {
    // 2. Add safety check here too
    if (!userProfile || !userProfile.id) {
      setLoading(false);
      return; 
    }
    
    setLoading(true);
    if (userProfile.avatar) setCurrentAvatar(userProfile.avatar);

    const { data: items } = await supabase.from('items').select('*').eq('is_active', true).limit(5);
    if (items) setHotItems(items);

    const { data: reqs, error } = await supabase
      .from('requests')
      .select(`
        id, 
        status, 
        request_date, 
        request_items ( *, items (*) )
      `)
      .eq('user_id', userProfile.id)
      .order('request_date', { ascending: false });
      
    if (error) {
      console.error("Ralat memuat turun permohonan:", error.message);
    } else if (reqs) {
      setRequests(reqs);
    }

    setLoading(false);
  };


  const updateAvatar = async (avatarId: string) => {
    // 1. Add this safety check!
    if (!userProfile || !userProfile.id) {
      Alert.alert('Ralat', 'Sila log masuk semula.');
      return;
    }

    setCurrentAvatar(avatarId);
    setShowAvatarModal(false);
    
    const { error } = await supabase
      .from('users')
      .update({ avatar: avatarId })
      .eq('id', userProfile.id);
      
    if (error) {
      console.error("Avatar error:", error);
      Alert.alert('Ralat', 'Gagal menukar gambar profil.');
    }
  };


  const cancelRequest = async (id: number) => {
    Alert.alert('Batal Permohonan', 'Pasti mahu batalkan permohonan ini?', [
      { text: 'Tidak', style: 'cancel' },
      { text: 'Ya, Batal', style: 'destructive', onPress: async () => {
          const { error } = await supabase.from('requests').update({ status: 'Cancelled' }).eq('id', id);
          if (error) Alert.alert('Ralat', error.message); else fetchDashboardData();
        }
      }
    ]);
  };

  const toggleExpand = (id: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedRequestId(expandedRequestId === id ? null : id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return '#16a34a'; 
      case 'Rejected': return '#ef4444'; 
      case 'Cancelled': return '#6b7280'; 
      case 'Received': return '#2563eb'; 
      default: return '#f59e0b'; 
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'Approved': return 'Diluluskan';
      case 'Rejected': return 'Ditolak';
      case 'Cancelled': return 'Dibatalkan';
      case 'Received': return 'Diterima';
      default: return 'Dalam Proses';
    }
  };

  const activeAvatar = AVATARS.find(a => a.id === currentAvatar) || AVATARS[0];
  const userDept = DEPARTMENTS.find(d => d.id === userProfile?.department_id);

  const renderHotItem = (item: any) => (
    <TouchableOpacity key={item.id} activeOpacity={0.7} style={styles.hotCard} onPress={() => openQuantityModal(item)}>
      <View style={styles.hotIconBg}><Feather name="trending-up" size={18} color="#ef4444" /></View>
      <Text style={styles.hotName} numberOfLines={2}>{item.name}</Text>
      <Text style={styles.hotStock}>Baki: {item.current_stock} {item.unit}</Text>
      <View style={styles.hotAddBtn}><Text style={styles.hotAddText}>Mohon</Text></View>
    </TouchableOpacity>
  );

  const renderRequest = ({ item }: { item: any }) => {
    const dateObj = new Date(item.request_date);
    const formattedDate = dateObj.toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' });
    const formattedTime = dateObj.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' });
    const itemCount = item.request_items ? item.request_items.length : 0;
    const isExpanded = expandedRequestId === item.id;

    return (
      // Changed from TouchableOpacity to View to prevent touch conflicts
      <View style={styles.reqCard}>
        
        {/* Only the header and info body are clickable to expand the list */}
        <TouchableOpacity activeOpacity={0.8} onPress={() => toggleExpand(item.id)}>
          <View style={styles.reqHeader}>
            <View style={styles.reqIdWrap}>
              <Feather name="file-text" size={16} color="#5138a1" style={{ marginRight: 6 }} />
              <Text style={styles.reqId}>ID: #{item.id}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) + '15', borderColor: getStatusColor(item.status) + '30' }]}>
              <Text style={[styles.badgeText, { color: getStatusColor(item.status) }]}>{getStatusText(item.status)}</Text>
            </View>
          </View>

          <View style={styles.reqBody}>
            <View style={styles.reqInfoRow}>
              <Feather name="calendar" size={14} color="#6b7280" style={{ marginRight: 8 }} />
              <Text style={styles.reqInfoText}>{formattedDate} • {formattedTime}</Text>
            </View>
            <View style={styles.reqInfoRow}>
              <Feather name="package" size={14} color="#6b7280" style={{ marginRight: 8 }} />
              <Text style={styles.reqInfoText}>{itemCount} jenis barangan dipohon</Text>
            </View>
            
            <Feather 
              name={isExpanded ? "chevron-up" : "chevron-down"} 
              size={18} 
              color="#9ca3af" 
              style={styles.expandIcon} 
            />
          </View>
        </TouchableOpacity>

        {/* Dropdown Items Section */}
        {isExpanded && (
          <View style={styles.expandedContainer}>
            <Text style={styles.expandedTitle}>Senarai Barangan:</Text>
            {item.request_items?.map((reqItem: any, index: number) => {
              const qty = reqItem.quantity || reqItem.qty_requested || 0;
              const itemName = reqItem.items?.name || 'Item tidak dijumpai';
              const itemUnit = reqItem.items?.unit || '';

              return (
                <View key={reqItem.id || index} style={styles.expandedItemRow}>
                  <Text style={styles.expandedItemName}>• {itemName}</Text>
                  <Text style={styles.expandedItemQty}>{qty} {itemUnit}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Cancel Button is now completely separated from the expand trigger */}
        {item.status === 'Pending' && (
          <View style={styles.reqFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => cancelRequest(item.id)}>
              <Feather name="x-circle" size={16} color="#ef4444" />
              <Text style={styles.cancelBtnText}>Batal Permohonan</Text>
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
          <View style={styles.editBadge}><Feather name="edit-2" size={10} color="#fff" /></View>
        </TouchableOpacity>
        <View style={styles.profileInfo}>
          <Text style={styles.greeting}>Selamat Datang,</Text>
          <Text style={styles.name} numberOfLines={1}>{userProfile?.full_name || 'Kakitangan MDR'}</Text>
          <Text style={styles.jawatan} numberOfLines={1}>
            {userProfile?.jawatan || 'Tiada Jawatan'} {userDept ? `(${userDept.short})` : ''}
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        <View style={styles.section}>
          {/* Wrapped Title to fix spacing alignment */}
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
            <TouchableOpacity onPress={fetchDashboardData} style={styles.refreshBtn}>
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
              {AVATARS.map(av => (
                <TouchableOpacity key={av.id} style={[styles.avatarOption, { backgroundColor: av.color }, currentAvatar === av.id && styles.avatarSelected]} onPress={() => updateAvatar(av.id)}>
                  <Feather name={av.icon as any} size={32} color={av.iconColor} />
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowAvatarModal(false)}><Text style={styles.closeBtnText}>Tutup</Text></TouchableOpacity>
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
  
  // Expanded List Styles
  expandedContainer: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6', backgroundColor: '#f9fafb' },
  expandedTitle: { fontSize: 12, fontWeight: '700', color: '#6b7280', marginBottom: 10, textTransform: 'uppercase' },
  expandedItemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' },
  expandedItemName: { fontSize: 14, color: '#374151', flex: 1, paddingRight: 10 },
  expandedItemQty: { fontSize: 14, fontWeight: '700', color: '#5138a1' },

  reqFooter: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fef2f2', paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#fecaca' },
  cancelBtnText: { color: '#ef4444', fontWeight: '700', marginLeft: 8, fontSize: 13 },
  
  emptyState: { alignItems: 'center', marginTop: 40 },
  emptyText: { marginTop: 16, color: '#9ca3af', fontSize: 15, fontWeight: '600' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: '#fff', borderRadius: 24, padding: 24, alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1f2937', marginBottom: 20 },
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16, marginBottom: 24 },
  avatarOption: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  avatarSelected: { borderWidth: 3, borderColor: '#5138a1' },
  closeBtn: { backgroundColor: '#f3f4f6', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 12 },
  closeBtnText: { color: '#4b5563', fontWeight: '700' }
});