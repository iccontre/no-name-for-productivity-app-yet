// app/day-plan.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

type DayPlan = {
  Monday: string;
  Tuesday: string;
  Wednesday: string;
  Thursday: string;
  Friday: string;
  Saturday: string;
  Sunday: string;
};

const DAY_PLAN_KEY = "lit_day_plan";

const EMPTY_PLAN: DayPlan = {
  Monday: "",
  Tuesday: "",
  Wednesday: "",
  Thursday: "",
  Friday: "",
  Saturday: "",
  Sunday: "",
};

export default function DayPlanScreen() {
  const [plan, setPlan] = useState<DayPlan>(EMPTY_PLAN);

  useEffect(() => {
    loadPlan();
  }, []);

  async function loadPlan() {
    const saved = await AsyncStorage.getItem(DAY_PLAN_KEY);
    if (!saved) return;
    const parsed = JSON.parse(saved);
    setPlan({
      Monday: parsed.Monday || "",
      Tuesday: parsed.Tuesday || "",
      Wednesday: parsed.Wednesday || "",
      Thursday: parsed.Thursday || "",
      Friday: parsed.Friday || "",
      Saturday: parsed.Saturday || "",
      Sunday: parsed.Sunday || "",
    });
  }

  async function savePlan() {
    await AsyncStorage.setItem(DAY_PLAN_KEY, JSON.stringify(plan));
  }

  function update(day: keyof DayPlan, value: string) {
    setPlan((prev) => ({ ...prev, [day]: value }));
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Day Plan</Text>

      <View style={styles.lunaCard}>
        <Text style={styles.lunaName}>🌙 Luna</Text>
        <Text style={styles.lunaText}>
          Give each day a main role. This helps your quests match your week.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Monday</Text>
        <TextInput style={styles.input} placeholder="Example: coding day" placeholderTextColor="#9CA3AF" value={plan.Monday} onChangeText={(v) => update("Monday", v)} />

        <Text style={styles.label}>Tuesday</Text>
        <TextInput style={styles.input} placeholder="Example: catching up day" placeholderTextColor="#9CA3AF" value={plan.Tuesday} onChangeText={(v) => update("Tuesday", v)} />

        <Text style={styles.label}>Wednesday</Text>
        <TextInput style={styles.input} placeholder="Example: fitness day" placeholderTextColor="#9CA3AF" value={plan.Wednesday} onChangeText={(v) => update("Wednesday", v)} />

        <Text style={styles.label}>Thursday</Text>
        <TextInput style={styles.input} placeholder="Example: deep work day" placeholderTextColor="#9CA3AF" value={plan.Thursday} onChangeText={(v) => update("Thursday", v)} />

        <Text style={styles.label}>Friday</Text>
        <TextInput style={styles.input} placeholder="Example: social day" placeholderTextColor="#9CA3AF" value={plan.Friday} onChangeText={(v) => update("Friday", v)} />

        <Text style={styles.label}>Saturday</Text>
        <TextInput style={styles.input} placeholder="Example: creative day" placeholderTextColor="#9CA3AF" value={plan.Saturday} onChangeText={(v) => update("Saturday", v)} />

        <Text style={styles.label}>Sunday</Text>
        <TextInput style={styles.input} placeholder="Example: reset day" placeholderTextColor="#9CA3AF" value={plan.Sunday} onChangeText={(v) => update("Sunday", v)} />
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={savePlan}>
        <Text style={styles.saveButtonText}>Save Day Plan</Text>
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
  label: { fontSize: 14, fontWeight: "900", color: "#374151", marginBottom: 8, marginTop: 10, textTransform: "uppercase" },
  input: { backgroundColor: "#F3F4F6", borderRadius: 14, borderWidth: 2, borderColor: "#E5E7EB", padding: 12, color: "#111827", fontSize: 16 },
  saveButton: { backgroundColor: "#111827", borderRadius: 16, padding: 14, alignItems: "center", marginBottom: 10 },
  saveButtonText: { color: "#FFFFFF", fontWeight: "900", fontSize: 16 },
  backButton: { backgroundColor: "#FFFFFF", borderRadius: 12, borderWidth: 2, borderColor: "#D1D5DB", padding: 12, alignItems: "center" },
  backButtonText: { color: "#111827", fontWeight: "900" },
});