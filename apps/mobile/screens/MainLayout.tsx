import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, StyleSheet, SafeAreaView, ScrollView, Animated, Dimensions, Platform, LayoutAnimation, UIManager, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import HomeScreen from './HomeScreen';
import CatalogScreen from './CatalogScreen';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width, height } = Dimensions.get('window');

const smoothLayoutAnim = {
  duration: 250,
  create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
  update: { type: LayoutAnimation.Types.easeInEaseOut },
  delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
};

interface CartItem {
  item: any;
  quantity: number;
}

export default function MainLayout() {
  const [currentScreen, setCurrentScreen] = useState<'Home' | 'Catalog' | 'Panduan'>('Home');
  const [userProfile, setUserProfile] = useState<any>(null);
  
  // Global State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<any | null>(null);

  // Modals & UI State
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCategoryExpanded, setIsCategoryExpanded] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const slideAnim = useRef(new Animated.Value(-width)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchGlobalData();
  }, []);

  const fetchGlobalData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single();
      setUserProfile(profile);
    }
    const { data: catData } = await supabase.from('categories').select('id, name').order('sort_order', { ascending: true });
    if (catData) setCategories(catData);
  };

  const toggleMenu = (open: boolean) => {
    const useNative = Platform.OS !== 'web';
    if (open) {
      setIsMenuOpen(true);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, friction: 9, tension: 60, useNativeDriver: useNative }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: useNative })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -width, duration: 250, useNativeDriver: useNative }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: useNative })
      ]).start(() => setIsMenuOpen(false));
    }
  };

  const navigateTo = (screen: 'Home' | 'Catalog' | 'Panduan', category: any = null) => {
    LayoutAnimation.configureNext(smoothLayoutAnim);
    setActiveCategory(category);
    setCurrentScreen(screen);
    toggleMenu(false);
  };

  // --- CART LOGIC ---
  const addToCart = () => {
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) return Alert.alert('Ralat', 'Kuantiti tidak sah.');

    const existingIndex = cart.findIndex(c => c.item.id === selectedItem.id);
    const currentCartQty = existingIndex >= 0 ? cart[existingIndex].quantity : 0;
    const totalQty = currentCartQty + qty;

    // Tambah amaran pop-up visual di sini
    if (totalQty > selectedItem.current_stock) {
      return Alert.alert(
        'Stok Tidak Mencukupi', 
        `Jumlah yang dipohon (${totalQty}) melebihi baki stok semasa iaitu ${selectedItem.current_stock}.`
      );
    }

    LayoutAnimation.configureNext(smoothLayoutAnim);
    if (existingIndex >= 0) {
      const newCart = [...cart];
      newCart[existingIndex].quantity = totalQty;
      setCart(newCart);
    } else {
      setCart([...cart, { item: selectedItem, quantity: qty }]);
    }
    setSelectedItem(null);
    setQuantity('1');
  };

  const updateCartQty = (itemId: number, delta: number) => {
    const itemInCart = cart.find(c => c.item.id === itemId);
    if (!itemInCart) return;

    const newQty = itemInCart.quantity + delta;

    // Tambah amaran jika pengguna tekan butang '+' melebihi stok
    if (newQty > itemInCart.item.current_stock) {
      return Alert.alert('Stok Maksimum', 'Anda tidak boleh memohon lebih daripada baki sedia ada.');
    }

    if (newQty <= 0) return;

    LayoutAnimation.configureNext(smoothLayoutAnim);
    setCart(cart.map(c => c.item.id === itemId ? { ...c, quantity: newQty } : c));
  };

  const removeFromCart = (itemId: number) => {
    LayoutAnimation.configureNext(smoothLayoutAnim);
    setCart(cart.filter(c => c.item.id !== itemId));
  };

  const generateAndShareKEWPS8 = async (cartItems: CartItem[], profile: any) => {
    const htmlContent = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #000; font-size: 11px; }
            .header-right { text-align: right; font-weight: bold; font-size: 14px; margin-bottom: 5px; }
            .bpsi-box { float: right; border: 1px solid #000; width: 120px; height: 30px; margin-bottom: 20px; }
            .bpsi-text { float: right; font-weight: bold; margin-right: 10px; margin-top: 8px; }
            .clear { clear: both; }
            .title { text-align: center; font-weight: bold; font-size: 14px; margin-bottom: 20px; margin-top: 10px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th, td { border: 1px solid #000; padding: 6px; text-align: center; }
            th { background-color: #f3f4f6; font-size: 10px; font-weight: bold; }
            .item-name { text-align: left; }
            .footer-table { width: 100%; border: none; margin-top: 20px; }
            .footer-table td { border: none; text-align: left; vertical-align: top; width: 33%; padding: 0 10px; }
            .sign-line { border-bottom: 1px dotted #000; width: 100%; margin-top: 60px; margin-bottom: 5px; }
          </style>
        </head>
        <body>
          <div class="header-right">KEW.PS-8</div>
          <div><div class="bpsi-box"></div><div class="bpsi-text">No. BPSI :</div></div>
          <div class="clear"></div>
          <div class="title">BORANG PERMOHONAN STOK<br/>(INDIVIDU KEPADA STOR)</div>
          <table>
            <tr>
              <th colspan="4" style="font-size: 12px;">PERMOHONAN</th>
              <th colspan="3" style="font-size: 12px; background-color: #e5e7eb;">PEGAWAI PELULUS</th>
              <th colspan="2" style="font-size: 12px; background-color: #d1d5db;">PERAKUAN PENERIMAAN</th>
            </tr>
            <tr>
              <th style="width: 5%;">NO. KOD</th><th style="width: 30%;">PERIHAL STOK</th><th style="width: 8%;">KUANTITI DIMOHON</th><th style="width: 12%;">CATATAN</th>
              <th style="width: 8%; background-color: #e5e7eb;">BAKI SEDIA ADA</th><th style="width: 8%; background-color: #e5e7eb;">KUANTITI DILULUSKAN</th><th style="width: 12%; background-color: #e5e7eb;">CATATAN</th>
              <th style="width: 8%; background-color: #d1d5db;">KUANTITI DITERIMA</th><th style="width: 9%; background-color: #d1d5db;">CATATAN</th>
            </tr>
            ${cartItems.map((c, i) => `<tr><td>${i + 1}</td><td class="item-name">${c.item.name}</td><td>${c.quantity}</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`).join('')}
            ${Array.from({ length: Math.max(0, 5 - cartItems.length) }).map(() => `<tr><td style="color: transparent;">-</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`).join('')}
          </table>
          <table class="footer-table">
            <tr>
              <td>
                <b>Pemohon:</b><div class="sign-line"></div>
                <b>Nama :</b> ${profile?.full_name?.toUpperCase() || '........................................'}<br/><br/>
                <b>Jawatan :</b> ${profile?.jawatan?.toUpperCase() || '........................................'}<br/><br/>
                <b>Tarikh :</b> ${new Date().toLocaleDateString('ms-MY')}
              </td>
              <td><b>Pegawai Pelulus:</b><div class="sign-line"></div><b>Nama :</b> ........................................<br/><br/><b>Jawatan :</b> ........................................<br/><br/><b>Tarikh :</b> ........................................</td>
              <td><b>Pemohon (Penerima):</b><div class="sign-line"></div><b>Nama :</b> ${profile?.full_name?.toUpperCase() || '........................................'}<br/><br/><b>Jawatan :</b> ${profile?.jawatan?.toUpperCase() || '........................................'}<br/><br/><b>Tarikh :</b> ........................................</td>
            </tr>
          </table>
        </body>
      </html>
    `;
    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent, base64: false });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: 'Simpan / Cetak KEW.PS-8' });
    } catch (error) {
      Alert.alert('Ralat', 'Gagal menjana PDF.');
    }
  };

  const submitCartRequest = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    try {
      const { data: requestData, error: requestError } = await supabase.from('requests').insert([{ 
        user_id: userProfile.id, department_id: userProfile?.department_id || null, status: 'Pending', remarks: `Permohonan pukal (${cart.length} item) dari mobile.` 
      }]).select('id').single();
      if (requestError) throw requestError;

      const requestItems = cart.map(c => ({ request_id: requestData.id, item_id: c.item.id, qty_requested: c.quantity }));
      const { error: itemsError } = await supabase.from('request_items').insert(requestItems);
      if (itemsError) throw itemsError;
      
      const submittedCart = [...cart]; 
      Alert.alert(
        'Berjaya', 'Permohonan telah dihantar. Ingin jana PDF sebagai bukti permohonan?',
        [
          { text: 'Tutup', style: 'cancel' },
          { text: 'Jana PDF', onPress: () => generateAndShareKEWPS8(submittedCart, userProfile) }
        ]
      );
      LayoutAnimation.configureNext(smoothLayoutAnim);
      setCart([]); setIsCartOpen(false);
      
      // Auto-navigate back to Home to see the new Pending request
      navigateTo('Home');
    } catch (error: any) {
      Alert.alert('Gagal', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openQuantityModal = (item: any) => { setSelectedItem(item); setQuantity('1'); };

  return (
    <SafeAreaView style={styles.container}>
      {/* GLOBAL HEADER */}
      <View style={styles.headerContainer}>
        <TouchableOpacity activeOpacity={0.6} style={styles.menuIcon} onPress={() => toggleMenu(true)}>
          <Feather name="menu" size={28} color="#5138a1" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>
          {currentScreen === 'Home' ? 'Utama' : currentScreen === 'Panduan' ? 'Panduan' : activeCategory ? activeCategory.name : 'Semua Katalog'}
        </Text>
        
        <TouchableOpacity activeOpacity={0.6} style={styles.menuIcon} onPress={() => setIsCartOpen(true)}>
          <Feather name="shopping-cart" size={24} color="#5138a1" />
          {cart.length > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cart.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* DYNAMIC SCREEN RENDERING */}
      <View style={styles.screenWrapper}>
        {currentScreen === 'Home' && <HomeScreen userProfile={userProfile} openQuantityModal={openQuantityModal} navigateTo={navigateTo} />}
        {currentScreen === 'Catalog' && <CatalogScreen activeCategory={activeCategory} openQuantityModal={openQuantityModal} />}
        {currentScreen === 'Panduan' && (
          <View style={{flex:1, justifyContent:'center', alignItems:'center'}}>
            <Feather name="book-open" size={48} color="#d1d5db" />
            <Text style={{marginTop:16, color:'#6b7280'}}>Panduan Pengguna (Dalam Pembinaan)</Text>
          </View>
        )}
      </View>

      {/* UNIFIED GLOBAL MENU */}
      <Modal visible={isMenuOpen} transparent animationType="none">
        <View style={styles.drawerWrapper}>
          <Animated.View style={[styles.drawerOverlay, { opacity: fadeAnim }]}>
            <TouchableOpacity style={styles.drawerCloseArea} onPress={() => toggleMenu(false)} activeOpacity={1} />
          </Animated.View>
          <Animated.View style={[styles.drawerContent, { transform: [{ translateX: slideAnim }] }]}>
            <View style={styles.drawerHeader}>
              <Feather name="box" size={32} color="#fff" />
              <Text style={styles.drawerTitle}>Sistem Stor</Text>
              <Text style={styles.drawerSubtitle}>Majlis Daerah Raub</Text>
            </View>
            <ScrollView style={styles.drawerScroll}>
              
              <TouchableOpacity activeOpacity={0.7} style={[styles.drawerItem, currentScreen === 'Home' && styles.drawerItemActive]} onPress={() => navigateTo('Home')}>
                <Feather name="home" size={20} color={currentScreen === 'Home' ? "#5138a1" : "#6b7280"} style={styles.drawerItemIcon} />
                <Text style={[styles.drawerItemText, currentScreen === 'Home' && styles.drawerItemTextActive]}>Halaman Utama</Text>
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.7} style={styles.drawerItem} onPress={() => { LayoutAnimation.configureNext(smoothLayoutAnim); setIsCategoryExpanded(!isCategoryExpanded); }}>
                <Feather name="grid" size={20} color={currentScreen === 'Catalog' ? "#5138a1" : "#6b7280"} style={styles.drawerItemIcon} />
                <Text style={[styles.drawerItemText, currentScreen === 'Catalog' && styles.drawerItemTextActive]}>Kategori Katalog</Text>
                <Feather name={isCategoryExpanded ? "chevron-up" : "chevron-down"} size={20} color="#6b7280" />
              </TouchableOpacity>

              {isCategoryExpanded && (
                <View style={styles.submenu}>
                  <TouchableOpacity activeOpacity={0.7} style={styles.submenuItem} onPress={() => navigateTo('Catalog', null)}>
                    <Text style={[styles.submenuText, currentScreen === 'Catalog' && activeCategory === null && styles.submenuTextActive]}>Semua Kategori</Text>
                  </TouchableOpacity>
                  {categories.map(cat => (
                    <TouchableOpacity key={cat.id} activeOpacity={0.7} style={styles.submenuItem} onPress={() => navigateTo('Catalog', cat)}>
                      <Text style={[styles.submenuText, activeCategory?.id === cat.id && styles.submenuTextActive]}>{cat.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={styles.divider} />
              
              <TouchableOpacity activeOpacity={0.7} style={[styles.drawerItem, currentScreen === 'Panduan' && styles.drawerItemActive]} onPress={() => navigateTo('Panduan')}>
                <Feather name="help-circle" size={20} color={currentScreen === 'Panduan' ? "#5138a1" : "#6b7280"} style={styles.drawerItemIcon} />
                <Text style={[styles.drawerItemText, currentScreen === 'Panduan' && styles.drawerItemTextActive]}>Panduan Pengguna</Text>
              </TouchableOpacity>

            </ScrollView>
            <TouchableOpacity activeOpacity={0.7} style={styles.logoutBtn} onPress={() => supabase.auth.signOut()}>
              <Feather name="log-out" size={20} color="#ef4444" style={styles.drawerItemIcon} />
              <Text style={styles.logoutText}>Log Keluar</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* QUANTITY MODAL */}
      <Modal visible={selectedItem !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Tambah ke Troli</Text>
            <Text style={styles.modalSubtitle}>{selectedItem?.name}</Text>
            <Text style={styles.modalText}>Baki Semasa: {selectedItem?.current_stock} {selectedItem?.unit}</Text>
            <Text style={styles.label}>Kuantiti Dipohon:</Text>
            <TextInput style={styles.modalInput} keyboardType="numeric" value={quantity} onChangeText={setQuantity} />
            <View style={styles.modalActions}>
              <TouchableOpacity activeOpacity={0.7} style={[styles.modalButton, styles.cancelButton]} onPress={() => setSelectedItem(null)}>
                <Text style={styles.cancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.7} style={[styles.modalButton, styles.submitButton]} onPress={addToCart}>
                <Text style={styles.submitText}>Tambah</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* GLOBAL CART MODAL */}
      <Modal visible={isCartOpen} transparent animationType="slide">
        <View style={styles.cartOverlay}>
          <View style={styles.cartContent}>
            <View style={styles.cartHeader}>
              <Text style={styles.cartTitle}>Troli Permohonan</Text>
              <TouchableOpacity onPress={() => setIsCartOpen(false)}><Feather name="x" size={24} color="#6b7280" /></TouchableOpacity>
            </View>
            {cart.length === 0 ? (
              <View style={styles.emptyCart}>
                <Feather name="shopping-cart" size={48} color="#d1d5db" />
                <Text style={styles.emptyCartText}>Troli anda kosong.</Text>
              </View>
            ) : (
              <ScrollView style={styles.cartList}>
                {cart.map((c, index) => (
                  <View key={index} style={styles.cartItem}>
                    <View style={styles.cartItemInfo}>
                      <Text style={styles.cartItemName}>{c.item.name}</Text>
                      <Text style={styles.cartItemQty}>Baki: {c.item.current_stock} {c.item.unit}</Text>
                    </View>
                    <View style={styles.cartCounterContainer}>
                      <TouchableOpacity style={styles.counterBtn} onPress={() => updateCartQty(c.item.id, -1)}><Feather name="minus" size={16} color="#5138a1" /></TouchableOpacity>
                      <Text style={styles.counterText}>{c.quantity}</Text>
                      <TouchableOpacity style={styles.counterBtn} onPress={() => updateCartQty(c.item.id, 1)}><Feather name="plus" size={16} color="#5138a1" /></TouchableOpacity>
                    </View>
                    <TouchableOpacity onPress={() => removeFromCart(c.item.id)} style={styles.removeBtn}><Feather name="trash-2" size={20} color="#ef4444" /></TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
            <View style={styles.cartFooter}>
              <TouchableOpacity style={[styles.checkoutBtn, cart.length === 0 && styles.checkoutBtnDisabled]} disabled={cart.length === 0 || isSubmitting} onPress={submitCartRequest}>
                <Text style={styles.checkoutBtnText}>{isSubmitting ? 'Menghantar...' : 'Hantar Permohonan'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4effc' },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#f3f4f6' },
  menuIcon: { padding: 4, position: 'relative' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1f2937' },
  cartBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#ef4444', borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  cartBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  screenWrapper: { flex: 1 },
  
  // Modals & Drawer (Same styles from CatalogScreen)
  drawerWrapper: { flex: 1, flexDirection: 'row' },
  drawerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  drawerCloseArea: { flex: 1 },
  drawerContent: { position: 'absolute', top: 0, bottom: 0, left: 0, width: width * 0.75, maxWidth: 400, backgroundColor: '#ffffff', shadowColor: '#000', shadowOffset: { width: 5, height: 0 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 10, zIndex: 2 },
  drawerHeader: { backgroundColor: '#5138a1', padding: 32, paddingTop: 60, borderBottomRightRadius: 30 },
  drawerTitle: { color: '#ffffff', fontSize: 24, fontWeight: '800', marginTop: 12 },
  drawerSubtitle: { color: '#d8b4fe', fontSize: 14, marginTop: 4 },
  drawerScroll: { flex: 1, paddingTop: 20 },
  drawerItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 24 },
  drawerItemActive: { backgroundColor: '#f5f3ff', borderRightWidth: 3, borderColor: '#5138a1' },
  drawerItemIcon: { marginRight: 16 },
  drawerItemText: { flex: 1, fontSize: 16, fontWeight: '600', color: '#4b5563' },
  drawerItemTextActive: { color: '#5138a1', fontWeight: '800' },
  submenu: { backgroundColor: '#f9fafb', paddingVertical: 8, paddingHorizontal: 24 },
  submenuItem: { paddingVertical: 12, paddingLeft: 36 },
  submenuText: { fontSize: 15, color: '#6b7280', fontWeight: '500' },
  submenuTextActive: { color: '#5138a1', fontWeight: '800' },
  divider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 8, marginHorizontal: 24 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', padding: 24, borderTopWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fef2f2' },
  logoutText: { fontSize: 16, fontWeight: '700', color: '#ef4444' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: '#ffffff', padding: 24, borderRadius: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1f2937' },
  modalSubtitle: { fontSize: 16, fontWeight: '600', color: '#6b7280', marginTop: 8, marginBottom: 4 },
  modalText: { fontSize: 15, marginBottom: 16, color: '#5138a1', fontWeight: '700' },
  label: { fontSize: 14, fontWeight: '700', marginTop: 8, marginBottom: 8, color: '#1f2937' },
  modalInput: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 16, fontSize: 16, backgroundColor: '#f9fafb', color: '#1f2937' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 24, gap: 12 },
  modalButton: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  cancelButton: { backgroundColor: '#f3f4f6' },
  submitButton: { backgroundColor: '#5138a1' },
  cancelText: { color: '#4b5563', fontWeight: '700' },
  submitText: { color: '#ffffff', fontWeight: '700' },
  
  cartOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  cartContent: { backgroundColor: '#ffffff', borderTopLeftRadius: 30, borderTopRightRadius: 30, height: height * 0.75, padding: 24 },
  cartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  cartTitle: { fontSize: 22, fontWeight: '800', color: '#1f2937' },
  emptyCart: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyCartText: { marginTop: 16, fontSize: 16, color: '#9ca3af', fontWeight: '600' },
  cartList: { flex: 1 },
  cartItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  cartItemInfo: { flex: 1, paddingRight: 12 },
  cartItemName: { fontSize: 15, fontWeight: '700', color: '#1f2937', marginBottom: 4 },
  cartItemQty: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  cartCounterContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 10, marginRight: 12 },
  counterBtn: { padding: 8 },
  counterText: { fontSize: 16, fontWeight: '700', color: '#1f2937', marginHorizontal: 8, minWidth: 20, textAlign: 'center' },
  removeBtn: { padding: 8, backgroundColor: '#fef2f2', borderRadius: 8 },
  cartFooter: { paddingTop: 20, borderTopWidth: 1, borderColor: '#f3f4f6' },
  checkoutBtn: { backgroundColor: '#5138a1', paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  checkoutBtnDisabled: { backgroundColor: '#d1d5db' },
  checkoutBtnText: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
});