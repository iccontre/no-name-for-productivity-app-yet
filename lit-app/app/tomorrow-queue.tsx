// app/tomorrow-queue.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

type QueueItem = {
  id: string;
  text: string;
  type: string;
  createdAt: string;
};

const STORAGE_KEY = "lit_tomorrow_queue";

export default function TomorrowQueueScreen() {
  const [text, setText] = useState("");
  const [items, setItems] = useState<QueueItem[]>([]);

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved) setItems(JSON.parse(saved));
  }

  async function saveItems(nextItems: QueueItem[]) {
    setItems(nextItems);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextItems));
  }

  async function saveThought() {
    if (!text.trim()) return;
    const newItem: QueueItem = {
      id: String(Date.now()),
      text: text.trim(),
      type: "General",
      createdAt: new Date().toLocaleString(),
    };
    await saveItems([newItem, ...items]);
    setText("");
  }

  async function clearThoughts() {
    await saveItems([]);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Quick Thoughts</Text>

      <View style={styles.lunaCard}>
        <Text style={styles.lunaName}>🌙 Luna</Text>
        <Text style={styles.lunaText}>
          Save a thought before it disappears. You can turn it into a small action later.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>What do you want to save?</Text>
        <TextInput
          style={styles.input}
          placeholder="Example: look up that recipe, text someone back, finish the assignment intro..."
          placeholderTextColor="#9CA3AF"
          value={text}
          onChangeText={setText}
        />

        <TouchableOpacity style={styles.saveButton} onPress={saveThought}>
          <Text style={styles.saveButtonText}>Save Thought</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Saved Thoughts</Text>

      {items.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No quick thoughts yet. Save one idea, task, or reminder.</Text>
        </View>
      ) : (
        items.map((item) => (
          <View key={item.id} style={styles.itemCard}>
            <Text style={styles.itemText}>{item.text}</Text>
            <Text style={styles.itemDate}>{item.createdAt}</Text>
          </View>
        ))
      )}

      <TouchableOpacity style={styles.clearButton} onPress={clearThoughts}>
        <Text style={styles.clearButtonText}>Clear Thoughts</Text>
      </TouchableOpacity>

      <Link href="/" asChild>
        <TouchableOpacity style={styles.backButton}>
          <Text style={styles.backButtonText}>Back to Today</Text>
        </TouchableOpacity>
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7EBC8" },
  container: { padding: 24, paddingTop: 70, paddingBottom: 40 },
  title: { fontSize: 36, fontWeight: "900", color: "#111827", marginBottom: 14 },
  lunaCard: { backgroundColor: "#FFFFFF", borderRadius: 24, borderWidth: 2, borderColor: "#E5D39A", padding: 20, marginBottom: 16 },
  lunaName: { fontSize: 22, fontWeight: "900", color: "#111827", marginBottom: 8 },
  lunaText: { fontSize: 15, lineHeight: 22, color: "#374151", fontWeight: "700" },
  card: { backgroundColor: "#FFFFFF", borderRadius: 24, borderWidth: 2, borderColor: "#E5D39A", padding: 20, marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "900", color: "#374151", marginBottom: 8, textTransform: "uppercase" },
  input: { backgroundColor: "#F3F4F6", borderRadius: 14, borderWidth: 2, borderColor: "#E5E7EB", padding: 12, color: "#111827", fontSize: 16 },
  saveButton: { marginTop: 12, backgroundColor: "#111827", borderRadius: 14, padding: 12, alignItems: "center" },
  saveButtonText: { color: "#FFFFFF", fontWeight: "900" },
  sectionTitle: { fontSize: 22, fontWeight: "900", color: "#111827", marginBottom: 10 },
  emptyCard: { backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 2, borderColor: "#E5D39A", padding: 12, marginBottom: 10 },
  emptyText: { color: "#4B5563", fontWeight: "700" },
  itemCard: { backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 2, borderColor: "#E5D39A", padding: 12, marginBottom: 8 },
  itemText: { color: "#111827", fontWeight: "800", fontSize: 15, marginBottom: 6 },
  itemDate: { color: "#6B7280", fontSize: 12, fontWeight: "700" },
  clearButton: { backgroundColor: "#7F1D1D", borderRadius: 12, padding: 12, alignItems: "center", marginTop: 8, marginBottom: 10 },
  clearButtonText: { color: "#FFFFFF", fontWeight: "900" },
  backButton: { backgroundColor: "#FFFFFF", borderWidth: 2, borderColor: "#D1D5DB", borderRadius: 12, padding: 12, alignItems: "center" },
  backButtonText: { color: "#111827", fontWeight: "900" },
});