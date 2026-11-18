import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, ScrollView, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const smoothLayoutAnim = {
  duration: 250,
  create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
  update: { type: LayoutAnimation.Types.easeInEaseOut },
  delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
};

export default function CatalogScreen({ activeCategory, openQuantityModal }: any) {
  const [items, setItems] = useState<any[]>([]);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [allSubcategories, setAllSubcategories] = useState<any[]>([]);
  const [displaySubcategories, setDisplaySubcategories] = useState<any[]>([]);
  
  const [activeSubcategory, setActiveSubcategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCatalogData();
  }, []);

  useEffect(() => {
    let result = items;
    if (activeCategory !== null) result = result.filter(item => item.category_id === activeCategory.id);
    if (activeSubcategory !== null) result = result.filter(item => item.subcategory_id === activeSubcategory);
    if (searchQuery.trim() !== '') {
      result = result.filter(item => {
        const query = searchQuery.toLowerCase();
        return (item.name.toLowerCase().includes(query) || (item.item_code && item.item_code.toLowerCase().includes(query)) || (item.search_keywords && item.search_keywords.toLowerCase().includes(query)));
      });
    }
    LayoutAnimation.configureNext(smoothLayoutAnim);
    setFilteredItems(result);
  }, [searchQuery, activeCategory, activeSubcategory, items]);

  useEffect(() => {
    LayoutAnimation.configureNext(smoothLayoutAnim);
    if (activeCategory === null) {
      setDisplaySubcategories([]);
    } else {
      setDisplaySubcategories(allSubcategories.filter(sub => sub.category_id === activeCategory.id));
    }
    setActiveSubcategory(null);
  }, [activeCategory, allSubcategories]);

  const fetchCatalogData = async () => {
    setIsLoading(true);
    const { data: subData } = await supabase.from('subcategories').select('id, category_id, name').order('sort_order', { ascending: true });
    if (subData) setAllSubcategories(subData);

    const { data: itemData } = await supabase.from('items').select('id, item_code, name, current_stock, category_id, subcategory_id, unit, search_keywords').eq('is_active', true).order('name');
    if (itemData) { setItems(itemData); setFilteredItems(itemData); }
    setIsLoading(false);
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <Text style={styles.itemCode}>{item.item_code}</Text>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemStock}>Baki: {item.current_stock} {item.unit}</Text>
      </View>
      <TouchableOpacity activeOpacity={0.7} style={styles.button} onPress={() => openQuantityModal(item)}>
        <Text style={styles.buttonText}>Pilih</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchWrapper}>
          <Feather name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
          <TextInput style={styles.searchInput} placeholder="Cari item atau kod..." placeholderTextColor="#9ca3af" value={searchQuery} onChangeText={setSearchQuery} />
        </View>
      </View>

      {displaySubcategories.length > 0 ? (
        <View style={styles.subcategoryContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
            <TouchableOpacity activeOpacity={0.7} style={[styles.categoryPill, activeSubcategory === null && styles.activePill]} onPress={() => { LayoutAnimation.configureNext(smoothLayoutAnim); setActiveSubcategory(null); }}>
              <Text style={[styles.categoryText, activeSubcategory === null && styles.activeText]}>Semua</Text>
            </TouchableOpacity>
            {displaySubcategories.map((sub) => (
              <TouchableOpacity key={sub.id} activeOpacity={0.7} style={[styles.categoryPill, activeSubcategory === sub.id && styles.activePill]} onPress={() => { LayoutAnimation.configureNext(smoothLayoutAnim); setActiveSubcategory(sub.id); }}>
                <Text style={[styles.categoryText, activeSubcategory === sub.id && styles.activeText]}>{sub.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : null}
      
      {isLoading ? (
        <ActivityIndicator size="large" color="#5138a1" style={{ marginTop: 50 }} />
      ) : (
        <FlatList data={filteredItems} keyExtractor={(item) => item.id.toString()} renderItem={renderItem} contentContainerStyle={styles.list} ListEmptyComponent={<Text style={styles.emptyText}>Tiada item dijumpai.</Text>} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4effc' },
  searchContainer: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#f4effc' },
  searchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 20, paddingHorizontal: 16, height: 50, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16, color: '#1f2937' }, 
  subcategoryContainer: { paddingBottom: 10, backgroundColor: '#f4effc' },
  categoryScroll: { paddingHorizontal: 20, gap: 8 },
  categoryPill: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#ffffff', borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb' },
  activePill: { backgroundColor: '#5138a1', borderColor: '#5138a1' },
  categoryText: { color: '#6b7280', fontWeight: '600' },
  activeText: { color: '#ffffff', fontWeight: 'bold' },
  list: { padding: 20, paddingBottom: 100 },
  card: { flexDirection: 'row', backgroundColor: '#ffffff', padding: 16, borderRadius: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 3 },
  cardInfo: { flex: 1, paddingRight: 10, justifyContent: 'center' },
  itemCode: { fontSize: 12, color: '#9ca3af', fontWeight: '600' },
  itemName: { fontSize: 16, fontWeight: '700', color: '#1f2937', marginTop: 4 },
  itemStock: { fontSize: 14, color: '#5138a1', fontWeight: '700', marginTop: 6 },
  button: { backgroundColor: '#5138a1', justifyContent: 'center', paddingHorizontal: 16, borderRadius: 12 },
  buttonText: { color: '#ffffff', fontWeight: '700' },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#9ca3af', fontSize: 16 },
});