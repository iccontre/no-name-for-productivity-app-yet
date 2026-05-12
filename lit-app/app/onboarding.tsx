import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

type UserProfile = {
  name: string;
  progressMeaning: string;
  goalOne: string;
  goalTwo: string;
  goalThree: string;
  biggestObstacle: string;
  hasWorkOrSchool: boolean;
  hasTransportation: boolean;
  hasGymAccess: boolean;
  hasQuietSpace: boolean;
  hasFoodControl: boolean;
};

const PROFILE_KEY = "lit_user_profile";

export default function OnboardingScreen() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [progressMeaning, setProgressMeaning] = useState("");
  const [goalOne, setGoalOne] = useState("");
  const [goalTwo, setGoalTwo] = useState("");
  const [goalThree, setGoalThree] = useState("");
  const [biggestObstacle, setBiggestObstacle] = useState("");

  const [hasWorkOrSchool, setHasWorkOrSchool] = useState(true);
  const [hasTransportation, setHasTransportation] = useState(false);
  const [hasGymAccess, setHasGymAccess] = useState(false);
  const [hasQuietSpace, setHasQuietSpace] = useState(false);
  const [hasFoodControl, setHasFoodControl] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const saved = await AsyncStorage.getItem(PROFILE_KEY);

    if (saved) {
      const profile: UserProfile = JSON.parse(saved);

      setName(profile.name || "");
      setProgressMeaning(profile.progressMeaning || "");
      setGoalOne(profile.goalOne || "");
      setGoalTwo(profile.goalTwo || "");
      setGoalThree(profile.goalThree || "");
      setBiggestObstacle(profile.biggestObstacle || "");
      setHasWorkOrSchool(profile.hasWorkOrSchool ?? true);
      setHasTransportation(profile.hasTransportation ?? false);
      setHasGymAccess(profile.hasGymAccess ?? false);
      setHasQuietSpace(profile.hasQuietSpace ?? false);
      setHasFoodControl(profile.hasFoodControl ?? false);
    }
  }

  async function saveProfile() {
    const profile: UserProfile = {
      name: name.trim(),
      progressMeaning: progressMeaning.trim(),
      goalOne: goalOne.trim(),
      goalTwo: goalTwo.trim(),
      goalThree: goalThree.trim(),
      biggestObstacle: biggestObstacle.trim(),
      hasWorkOrSchool,
      hasTransportation,
      hasGymAccess,
      hasQuietSpace,
      hasFoodControl,
    };

    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    router.push("/");
  }

  function ToggleButton({
    label,
    value,
    onPress,
  }: {
    label: string;
    value: boolean;
    onPress: () => void;
  }) {
    return (
      <TouchableOpacity
        style={[styles.toggleButton, value && styles.activeToggleButton]}
        onPress={onPress}
      >
        <Text style={[styles.toggleText, value && styles.activeToggleText]}>
          {value ? "✓ " : ""}{label}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.logo}>lit</Text>
      <Text style={styles.subtitle}>Living in Truth</Text>

      <View style={styles.lunaCard}>
        <Text style={styles.lunaName}>🌙 Luna</Text>
        <Text style={styles.lunaText}>
          Before we build your path, I want to understand what progress means to you.
          lit is not here to force a perfect life. It is here to help you move honestly
          from where you are.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Your name</Text>
        <TextInput
          style={styles.input}
          placeholder="Example: Isaac"
          placeholderTextColor="#9CA3AF"
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>What does progress mean to you right now?</Text>
        <TextInput
          style={styles.textArea}
          multiline
          placeholder="Example: sleeping better, making friends, feeling confident, improving school, making money..."
          placeholderTextColor="#9CA3AF"
          value={progressMeaning}
          onChangeText={setProgressMeaning}
        />

        <Text style={styles.label}>Top life direction 1</Text>
        <TextInput
          style={styles.input}
          placeholder="Example: improve sleep"
          placeholderTextColor="#9CA3AF"
          value={goalOne}
          onChangeText={setGoalOne}
        />

        <Text style={styles.label}>Top life direction 2</Text>
        <TextInput
          style={styles.input}
          placeholder="Example: make friends"
          placeholderTextColor="#9CA3AF"
          value={goalTwo}
          onChangeText={setGoalTwo}
        />

        <Text style={styles.label}>Top life direction 3</Text>
        <TextInput
          style={styles.input}
          placeholder="Example: build confidence"
          placeholderTextColor="#9CA3AF"
          value={goalThree}
          onChangeText={setGoalThree}
        />

        <Text style={styles.label}>What usually gets in your way?</Text>
        <TextInput
          style={styles.textArea}
          multiline
          placeholder="Example: phone use, anxiety, low energy, school, work, transportation, lack of motivation..."
          placeholderTextColor="#9CA3AF"
          value={biggestObstacle}
          onChangeText={setBiggestObstacle}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Your current resources</Text>
        <Text style={styles.helperText}>
          This helps lit suggest fair quests. You do not need money, transportation, or a perfect environment to make progress.
        </Text>

        <ToggleButton
          label="I have work or school responsibilities"
          value={hasWorkOrSchool}
          onPress={() => setHasWorkOrSchool(!hasWorkOrSchool)}
        />

        <ToggleButton
          label="I usually have transportation"
          value={hasTransportation}
          onPress={() => setHasTransportation(!hasTransportation)}
        />

        <ToggleButton
          label="I have gym access"
          value={hasGymAccess}
          onPress={() => setHasGymAccess(!hasGymAccess)}
        />

        <ToggleButton
          label="I have a quiet study/work space"
          value={hasQuietSpace}
          onPress={() => setHasQuietSpace(!hasQuietSpace)}
        />

        <ToggleButton
          label="I have control over food/meals"
          value={hasFoodControl}
          onPress={() => setHasFoodControl(!hasFoodControl)}
        />
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={saveProfile}>
        <Text style={styles.saveButtonText}>Save My Path</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.skipButton} onPress={() => router.push("/")}>
        <Text style={styles.skipButtonText}>Skip for now</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F7EBC8",
  },
  container: {
    padding: 24,
    paddingTop: 70,
    paddingBottom: 40,
  },
  logo: {
    fontSize: 52,
    fontWeight: "900",
    color: "#111827",
    letterSpacing: -2,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: -4,
    marginBottom: 24,
  },
  lunaCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    marginBottom: 18,
    borderWidth: 2,
    borderColor: "#E5D39A",
  },
  lunaName: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 8,
  },
  lunaText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#374151",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    marginBottom: 18,
    borderWidth: 2,
    borderColor: "#E5D39A",
  },
  label: {
    fontSize: 14,
    fontWeight: "900",
    color: "#374151",
    marginBottom: 10,
    marginTop: 12,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    padding: 14,
    fontSize: 16,
    color: "#111827",
    marginBottom: 6,
  },
  textArea: {
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    padding: 14,
    minHeight: 100,
    fontSize: 16,
    color: "#111827",
    marginBottom: 6,
    textAlignVertical: "top",
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 8,
  },
  helperText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#6B7280",
    marginBottom: 14,
  },
  toggleButton: {
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  activeToggleButton: {
    backgroundColor: "#111827",
    borderColor: "#FBBF24",
  },
  toggleText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#374151",
  },
  activeToggleText: {
    color: "#FFFFFF",
  },
  saveButton: {
    backgroundColor: "#111827",
    padding: 18,
    borderRadius: 20,
    alignItems: "center",
    marginBottom: 12,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
  },
  skipButton: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#D1D5DB",
  },
  skipButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "900",
  },
});
