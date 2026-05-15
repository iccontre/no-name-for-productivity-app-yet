import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Quest = {
  title: string;
  type: string;
  steps: number;
};

type UserProfile = {
  name: string;
  longTermDream?: string;
  dreamCategory?: string;
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

type PreSleepIntention = {
  id: string;
  date: string;
  intention: string;
  whyItMatters: string;
  firstSmallAction: string;
  dreamSymbol: string;
  createdAt: string;
};

const COMPLETED_QUESTS_KEY = "lit_completed_quests";
const TODAY_PROGRESS_DATE_KEY = "lit_today_progress_date";
const PROFILE_KEY = "lit_user_profile";
const CHECKIN_KEY = "lit_latest_checkin";
const LATEST_PRE_SLEEP_INTENTION_KEY = "lit_latest_pre_sleep_intention";

function getTodayKey() {
  return new Date().toLocaleDateString("en-CA");
}

export default function HomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const rawMode = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const rawEnergy = Array.isArray(params.energy) ? params.energy[0] : params.energy;

  const [savedMode, setSavedMode] = useState<"Recovery" | "Progress">("Progress");
  const [savedEnergy, setSavedEnergy] = useState(78);

  const mode = rawMode === "Recovery" || rawMode === "Progress" ? rawMode : savedMode;
  const energyYield = rawEnergy ? Number(rawEnergy) : savedEnergy;
  const isRecovery = mode === "Recovery";

  const [completedQuests, setCompletedQuests] = useState<string[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileChecked, setProfileChecked] = useState(false);
  const [latestIntention, setLatestIntention] = useState<PreSleepIntention | null>(null);

  useEffect(() => {
    loadCompletedQuests();
    loadProfile();
    loadLatestCheckIn();
    loadLatestIntention();
  }, []);

  async function lightHaptic() {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics may not run in every web preview.
    }
  }

  async function mediumHaptic() {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Haptics may not run in every web preview.
    }
  }

  async function successHaptic() {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Haptics may not run in every web preview.
    }
  }

  async function navigateWithHaptic(path: any) {
    await lightHaptic();
    router.push(path);
  }

  async function loadProfile() {
    const saved = await AsyncStorage.getItem(PROFILE_KEY);

    if (!saved) {
      setProfileChecked(true);
      router.replace("/onboarding");
      return;
    }

    const parsed = JSON.parse(saved) as UserProfile;
    setProfile(parsed);
    setProfileChecked(true);
  }

  async function loadCompletedQuests() {
    const today = getTodayKey();

    const savedDate = await AsyncStorage.getItem(TODAY_PROGRESS_DATE_KEY);
    const savedQuests = await AsyncStorage.getItem(COMPLETED_QUESTS_KEY);

    if (savedDate !== today) {
      setCompletedQuests([]);
      await AsyncStorage.setItem(TODAY_PROGRESS_DATE_KEY, today);
      await AsyncStorage.setItem(COMPLETED_QUESTS_KEY, JSON.stringify([]));
      return;
    }

    if (savedQuests) {
      setCompletedQuests(JSON.parse(savedQuests));
    }
  }

  async function loadLatestCheckIn() {
    const saved = await AsyncStorage.getItem(CHECKIN_KEY);

    if (saved) {
      const checkIn = JSON.parse(saved);

      if (checkIn.mode === "Recovery" || checkIn.mode === "Progress") {
        setSavedMode(checkIn.mode);
      }

      if (typeof checkIn.energy === "number") {
        setSavedEnergy(checkIn.energy);
      }
    }
  }

  async function loadLatestIntention() {
    const saved = await AsyncStorage.getItem(LATEST_PRE_SLEEP_INTENTION_KEY);

    if (saved) {
      setLatestIntention(JSON.parse(saved));
    }
  }

  async function saveCompletedQuests(nextCompleted: string[]) {
    const today = getTodayKey();

    setCompletedQuests(nextCompleted);
    await AsyncStorage.setItem(TODAY_PROGRESS_DATE_KEY, today);
    await AsyncStorage.setItem(COMPLETED_QUESTS_KEY, JSON.stringify(nextCompleted));
  }

  async function toggleQuest(title: string) {
    const isAlreadyComplete = completedQuests.includes(title);

    const nextCompleted = isAlreadyComplete
      ? completedQuests.filter((item) => item !== title)
      : [...completedQuests, title];

    if (isAlreadyComplete) {
      await lightHaptic();
    } else {
      await successHaptic();
    }

    await saveCompletedQuests(nextCompleted);
  }

  async function resetTodayProgress() {
    await mediumHaptic();
    await saveCompletedQuests([]);
  }

  const displayName = profile?.name?.trim() || "there";
  const topGoal = profile?.goalOne?.trim() || "your top goal";
  const secondGoal = profile?.goalTwo?.trim() || "your next goal";
  const thirdGoal = profile?.goalThree?.trim() || "your future";
  const progressMeaning = profile?.progressMeaning?.trim();

  function getCategoryQuests(category: string, modeType: "Recovery" | "Progress"): Quest[] {
    const normalized = category || "Purpose";

    const map: Record<string, { Recovery: string[]; Progress: string[] }> = {
      Health: {
        Progress: ["Do 15 minutes of movement", "Choose one better nutrition action", "Protect your sleep window tonight"],
        Recovery: ["Stretch for 5 calm minutes", "Choose one easy healthy meal", "Rest and protect sleep tonight"],
      },
      Money: {
        Progress: ["Research one income opportunity", "Spend 15 minutes building a useful skill", "Track one spending or saving decision"],
        Recovery: ["Write one small money step for tomorrow", "Review your goal without pressure", "Protect sleep so you can act with more energy"],
      },
      Mind: {
        Progress: ["Journal one honest page", "Notice one thought pattern today", "Pause before one reaction"],
        Recovery: ["Write a gentle brain-dump", "Name one feeling without judging it", "Take 3 deep breaths before your next task"],
      },
      "Friends / Connection": {
        Progress: ["Send one message to someone", "Start one small conversation", "Plan one social step"],
        Recovery: ["Reflect on one person you want to reconnect with", "Send a low-pressure message if it feels realistic", "Journal about what makes connection hard"],
      },
      "School / Work": {
        Progress: ["Complete one focus block", "Plan your top assignment early", "Clear one unfinished task"],
        Recovery: ["Pick one simple work/school priority", "Set up materials for tomorrow", "Rest so your focus can recover"],
      },
      Confidence: {
        Progress: ["Keep one promise to yourself", "Do one uncomfortable but safe action", "Write down one small win"],
        Recovery: ["Choose one tiny promise you can keep", "Speak kindly to yourself once today", "Reflect on a moment you handled well"],
      },
      Creativity: {
        Progress: ["Work on one creative project", "Capture and save one idea", "Make 20 minutes for creative practice"],
        Recovery: ["Open your project for 5 minutes", "Collect one inspiration", "Rest so your creativity can recharge"],
      },
      Sleep: {
        Progress: ["Keep a consistent sleep target", "Reduce phone use before bed", "Plan a calm wind-down tonight"],
        Recovery: ["Take one short rest break", "Use a low-stimulation wind-down", "Protect your bedtime tonight"],
      },
      "Phone Use": {
        Progress: ["Notice one screen-time trigger", "Replace one scroll with a useful action", "Create one phone-free focus block"],
        Recovery: ["Use one short phone break", "Move distracting apps out of reach", "Journal what pulls you into scrolling"],
      },
      Purpose: {
        Progress: ["Define what progress means today", "Take one honest step daily", "Reflect on what feels meaningful"],
        Recovery: ["Write one reason your path matters", "Choose one tiny step for tomorrow", "Rest and reconnect with your why"],
      },
    };

    const categorySet = map[normalized] ?? map.Purpose;
    return categorySet[modeType].map((title) => ({ title, type: normalized, steps: 1 }));
  }

  function generateQuests(): Quest[] {
    const category = profile?.dreamCategory?.trim() || "Purpose";
    const questMode: "Recovery" | "Progress" = isRecovery ? "Recovery" : "Progress";
    const baseQuests = getCategoryQuests(category, questMode);

    const goalQuests: Quest[] = [
      { title: `Goal step: ${topGoal}`, type: "Goal", steps: 1 },
      { title: `Goal step: ${secondGoal}`, type: "Goal", steps: 1 },
      { title: `Goal step: ${thirdGoal}`, type: "Goal", steps: 1 },
    ];

    const resourceQuest: Quest = profile?.hasQuietSpace
      ? { title: "Use your quiet space for one focus block", type: "Focus", steps: 1 }
      : { title: "Create a simple focus corner for 10 minutes", type: "Focus", steps: 1 };

    const movementQuest: Quest = profile?.hasGymAccess
      ? { title: "Movement option: gym or structured workout", type: "Body", steps: 1 }
      : { title: "Movement option: walk, stretch, or home workout", type: "Body", steps: 1 };

    const transportQuest: Quest = profile?.hasTransportation
      ? { title: "Plan one out-of-home step you can reach", type: "Logistics", steps: 1 }
      : { title: "Plan one step you can do from home", type: "Logistics", steps: 1 };

    return [...baseQuests, ...goalQuests, resourceQuest, movementQuest, transportQuest];
  }


  const quests = generateQuests();

  const completedSteps = quests
    .filter((quest) => completedQuests.includes(quest.title))
    .reduce((total, quest) => total + quest.steps, 0);

  const completedVisibleQuests = quests.filter((quest) =>
    completedQuests.includes(quest.title)
  ).length;

  const flameLabel =
    energyYield >= 75 ? "Bright Flame" : energyYield >= 45 ? "Steady Flame" : "Low Flame";

  if (!profileChecked) {
    return null;
  }

  return (
    <ScrollView
      style={isRecovery ? styles.recoveryScreen : styles.progressScreen}
      contentContainerStyle={styles.container}
    >
      <View style={isRecovery ? styles.recoveryHero : styles.progressHero}>
        <View style={styles.heroTopRow}>
          <View>
            <Text style={styles.modeIcon}>{isRecovery ? "🌙" : "☀️"}</Text>
            <Text style={styles.heroTitle}>{mode}</Text>
            <Text style={styles.heroSubtitle}>
              {isRecovery ? "Protect your flame." : "Spend your flame wisely."}
            </Text>
          </View>

          <View style={isRecovery ? styles.recoveryLunaOrb : styles.progressLunaOrb}>
            <Text style={styles.lunaFace}>{isRecovery ? "😴" : "🙂"}</Text>
          </View>
        </View>

        <View style={styles.brandRow}>
          <View>
            <Text style={styles.logo}>lit</Text>
            <Text style={styles.subtitle}>Living in Truth</Text>
          </View>
          <Text style={styles.spark}>🔥</Text>
        </View>
      </View>

      <View style={styles.actionPanel}>
        <Text style={styles.actionPanelTitle}>Start Today</Text>

        <TouchableOpacity
          style={styles.primaryActionButton}
          onPress={() => navigateWithHaptic("/sleep-checkin")}
        >
          <Text style={styles.primaryActionIcon}>🔥</Text>
          <View>
            <Text style={styles.primaryActionText}>Morning Check-In</Text>
            <Text style={styles.actionSubTextLight}>Set today's energy</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.goldActionButton}
          onPress={() => navigateWithHaptic("/onboarding")}
        >
          <Text style={styles.primaryActionIcon}>🧭</Text>
          <View>
            <Text style={styles.goldActionText}>Set My Path</Text>
            <Text style={styles.actionSubTextDark}>Update your long-term direction</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.actionPanel}>
        <Text style={styles.actionPanelTitle}>Today Plan</Text>

        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={styles.smallActionButtonGold}
            onPress={() => navigateWithHaptic("/tomorrow-queue")}
          >
            <Text style={styles.smallActionIcon}>📌</Text>
            <Text style={styles.smallActionText}>Tomorrow Queue</Text>
            <Text style={styles.smallActionSubText}>Plan your next step</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.smallActionButtonGreen}
            onPress={() => navigateWithHaptic("/weekly-summary")}
          >
            <Text style={styles.smallActionIcon}>📊</Text>
            <Text style={styles.smallActionText}>Weekly Summary</Text>
            <Text style={styles.smallActionSubText}>Review your momentum</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.actionPanel}>
        <Text style={styles.actionPanelTitle}>Mind & Sleep</Text>

        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={styles.smallActionButtonPurple}
            onPress={() => navigateWithHaptic("/journal")}
          >
            <Text style={styles.smallActionIcon}>📓</Text>
            <Text style={styles.smallActionText}>Journal</Text>
            <Text style={styles.smallActionSubText}>Name what is true</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.smallActionButtonPurple}
            onPress={() => navigateWithHaptic("/awareness-check")}
          >
            <Text style={styles.smallActionIcon}>🧠</Text>
            <Text style={styles.smallActionText}>Awareness Check</Text>
            <Text style={styles.smallActionSubText}>Pause before reacting</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionGridSecondRow}>
          <TouchableOpacity
            style={styles.smallActionButtonNight}
            onPress={() => navigateWithHaptic("/pre-sleep-intention")}
          >
            <Text style={styles.smallActionIcon}>🌙</Text>
            <Text style={styles.smallActionText}>Pre-Sleep Intention</Text>
            <Text style={styles.smallActionSubText}>Close your day clearly</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.smallActionButtonNight}
            onPress={() => navigateWithHaptic("/morning-intention-reflection")}
          >
            <Text style={styles.smallActionIcon}>☀️</Text>
            <Text style={styles.smallActionText}>Morning Reflection</Text>
            <Text style={styles.smallActionSubText}>Reconnect to last night</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.actionPanel}>
        <Text style={styles.actionPanelTitle}>Growth</Text>

        <TouchableOpacity
          style={styles.fullActionButtonPurple}
          onPress={() => navigateWithHaptic("/next-chapter")}
        >
          <Text style={styles.smallActionIcon}>🌱</Text>
          <Text style={styles.fullActionText}>Next Chapter</Text>
        </TouchableOpacity>
      </View>

      {latestIntention ? (
        <View style={styles.intentionPreviewCard}>
          <Text style={styles.intentionPreviewLabel}>Last night’s intention</Text>
          <Text style={styles.intentionPreviewText}>{latestIntention.intention}</Text>

          {latestIntention.firstSmallAction ? (
            <Text style={styles.intentionPreviewAction}>
              First small action: {latestIntention.firstSmallAction}
            </Text>
          ) : null}

          <TouchableOpacity
            style={styles.intentionReflectButton}
            onPress={() => navigateWithHaptic("/morning-intention-reflection")}
          >
            <Text style={styles.intentionReflectButtonText}>Reflect This Morning</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={isRecovery ? styles.recoveryLunaCard : styles.progressLunaCard}>
        <Text style={styles.lunaName}>
          {isRecovery ? "🌙 Luna is in Recovery" : "☀️ Luna is in Progress"}
        </Text>
        <Text style={styles.lunaText}>
          {isRecovery
            ? `Hey ${displayName}, Recovery is still progress. Protect your flame and take one honest step toward ${topGoal}.`
            : `Hey ${displayName}, progress is personal. Spend your energy truthfully on ${topGoal}.`}
        </Text>
      </View>

      <View style={isRecovery ? styles.recoveryEnergyCard : styles.progressEnergyCard}>
        <View>
          <Text style={styles.cardLabel}>Energy Yield</Text>
          <Text style={styles.energy}>🔥 {energyYield}/100</Text>
          <Text style={styles.flameLabel}>{flameLabel}</Text>
        </View>

        <View style={styles.energyBadge}>
          <Text style={styles.energyBadgeText}>{mode}</Text>
        </View>
      </View>

      {progressMeaning ? (
        <View style={styles.truthCard}>
          <Text style={styles.truthLabel}>Your definition of progress</Text>
          <Text style={styles.truthText}>{progressMeaning}</Text>
        </View>
      ) : null}

      <View style={styles.goalsCard}>
        <Text style={styles.cardLabel}>Your Current Path</Text>
        <Text style={styles.goalText}>1. {topGoal}</Text>
        <Text style={styles.goalText}>2. {secondGoal}</Text>
        <Text style={styles.goalText}>3. {thirdGoal}</Text>
      </View>

      <Text style={isRecovery ? styles.recoverySectionTitle : styles.progressSectionTitle}>
        Today’s Quests
      </Text>

      {quests.map((quest, index) => {
        const isComplete = completedQuests.includes(quest.title);

        return (
          <View
            key={index}
            style={
              isComplete
                ? styles.completedQuestCard
                : isRecovery
                ? styles.recoveryQuestCard
                : styles.progressQuestCard
            }
          >
            <TouchableOpacity style={styles.questMain} onPress={() => toggleQuest(quest.title)}>
              <View style={styles.questLeft}>
                <Text style={styles.checkbox}>{isComplete ? "✅" : "⬜"}</Text>
                <View style={styles.questTextBlock}>
                  <Text style={isComplete ? styles.completedQuestText : styles.questTitle}>
                    {quest.title}
                  </Text>
                  <Text style={styles.questType}>{quest.type}</Text>
                </View>
              </View>

              <View style={styles.stepPill}>
                <Text style={styles.steps}>+{quest.steps}</Text>
              </View>
            </TouchableOpacity>

            {!isComplete && (
              <Link
                href={{
                  pathname: "/reflection",
                  params: { quest: quest.title },
                }}
                asChild
              >
                <TouchableOpacity style={styles.reflectButton} onPress={lightHaptic}>
                  <Text style={styles.reflectButtonText}>Reflect if missed — data, not defeat</Text>
                </TouchableOpacity>
              </Link>
            )}
          </View>
        );
      })}

      <View style={styles.summaryCard}>
        <Text style={styles.cardLabel}>Progress</Text>
        <Text style={styles.rank}>Rank: {completedSteps >= 5 ? "Builder" : "Wanderer"}</Text>
        <Text style={styles.smallText}>Steps earned today: {completedSteps}</Text>
        <Text style={styles.smallText}>
          Completed quests: {completedVisibleQuests}/{quests.length}
        </Text>

        <TouchableOpacity style={styles.resetButton} onPress={resetTodayProgress}>
          <Text style={styles.resetButtonText}>Reset Today Plan</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  progressScreen: {
    flex: 1,
    backgroundColor: "#F7EBC8",
  },
  recoveryScreen: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  container: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  progressHero: {
    backgroundColor: "#FDE68A",
    borderColor: "#F59E0B",
    borderWidth: 3,
    borderRadius: 34,
    padding: 22,
    marginBottom: 18,
  },
  recoveryHero: {
    backgroundColor: "#1E1B4B",
    borderColor: "#8B5CF6",
    borderWidth: 3,
    borderRadius: 34,
    padding: 22,
    marginBottom: 18,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 26,
  },
  modeIcon: {
    fontSize: 42,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  heroSubtitle: {
    fontSize: 15,
    color: "#F9FAFB",
    fontWeight: "800",
    marginTop: 2,
  },
  progressLunaOrb: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: "#FFFFFF",
    borderWidth: 3,
    borderColor: "#F59E0B",
    alignItems: "center",
    justifyContent: "center",
  },
  recoveryLunaOrb: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: "#312E81",
    borderWidth: 3,
    borderColor: "#A78BFA",
    alignItems: "center",
    justifyContent: "center",
  },
  lunaFace: {
    fontSize: 32,
  },
  brandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  logo: {
    fontSize: 52,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -2,
  },
  subtitle: {
    marginTop: -6,
    fontSize: 14,
    color: "#E5E7EB",
    fontWeight: "700",
  },
  spark: {
    fontSize: 34,
  },
  actionPanel: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#E5D39A",
    padding: 16,
    marginBottom: 16,
  },
  actionPanelTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 12,
  },
  primaryActionButton: {
    backgroundColor: "#111827",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  goldActionButton: {
    backgroundColor: "#FDE68A",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 2,
    borderColor: "#F59E0B",
    flexDirection: "row",
    alignItems: "center",
  },
  primaryActionIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  primaryActionText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 16,
  },
  goldActionText: {
    color: "#111827",
    fontWeight: "900",
    fontSize: 16,
  },
  actionSubTextLight: {
    color: "#D1D5DB",
    fontSize: 12,
    fontWeight: "700",
  },
  actionSubTextDark: {
    color: "#374151",
    fontSize: 12,
    fontWeight: "700",
  },
  actionGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionGridSecondRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  smallActionButtonGold: {
    width: "48%",
    backgroundColor: "#FFFBEB",
    padding: 14,
    borderRadius: 18,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FBBF24",
  },
  smallActionButtonGreen: {
    width: "48%",
    backgroundColor: "#F0FDF4",
    padding: 14,
    borderRadius: 18,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#22C55E",
  },
  smallActionButtonPurple: {
    width: "48%",
    backgroundColor: "#F9FAFB",
    padding: 14,
    borderRadius: 18,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#A78BFA",
  },
  smallActionButtonNight: {
    width: "48%",
    backgroundColor: "#EEF2FF",
    padding: 14,
    borderRadius: 18,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#A78BFA",
  },
  fullActionButtonPurple: {
    backgroundColor: "#F9FAFB",
    padding: 14,
    borderRadius: 18,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#A78BFA",
  },
  smallActionIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  smallActionText: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
  },
  smallActionSubText: {
    color: "#4B5563",
    fontWeight: "700",
    fontSize: 11,
    textAlign: "center",
    marginTop: 2,
  },
  fullActionText: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "900",
    textAlign: "center",
  },
  intentionPreviewCard: {
    backgroundColor: "#EEF2FF",
    borderRadius: 24,
    padding: 20,
    marginBottom: 18,
    borderWidth: 2,
    borderColor: "#A78BFA",
  },
  intentionPreviewLabel: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 8,
    textTransform: "uppercase",
    fontWeight: "900",
  },
  intentionPreviewText: {
    fontSize: 20,
    lineHeight: 28,
    color: "#111827",
    fontWeight: "900",
    marginBottom: 8,
  },
  intentionPreviewAction: {
    fontSize: 15,
    lineHeight: 22,
    color: "#374151",
    fontWeight: "700",
    marginBottom: 14,
  },
  intentionReflectButton: {
    backgroundColor: "#312E81",
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#A78BFA",
  },
  intentionReflectButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  progressLunaCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#F59E0B",
    borderWidth: 2,
    borderRadius: 26,
    padding: 20,
    marginBottom: 18,
  },
  recoveryLunaCard: {
    backgroundColor: "#EEF2FF",
    borderColor: "#A78BFA",
    borderWidth: 2,
    borderRadius: 26,
    padding: 20,
    marginBottom: 18,
  },
  lunaName: {
    fontSize: 21,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 8,
  },
  lunaText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#374151",
    fontWeight: "600",
  },
  progressEnergyCard: {
    backgroundColor: "#111827",
    borderColor: "#FBBF24",
    borderWidth: 3,
    borderRadius: 28,
    padding: 22,
    marginBottom: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  recoveryEnergyCard: {
    backgroundColor: "#312E81",
    borderColor: "#A78BFA",
    borderWidth: 3,
    borderRadius: 28,
    padding: 22,
    marginBottom: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardLabel: {
    fontSize: 13,
    color: "#9CA3AF",
    marginBottom: 8,
    textTransform: "uppercase",
    fontWeight: "900",
  },
  energy: {
    fontSize: 38,
    fontWeight: "900",
    color: "#FBBF24",
  },
  flameLabel: {
    color: "#F9FAFB",
    fontSize: 15,
    fontWeight: "800",
  },
  energyBadge: {
    backgroundColor: "#0F172A",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  energyBadgeText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  truthCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
    borderWidth: 2,
    borderColor: "#E5D39A",
  },
  truthLabel: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 8,
    textTransform: "uppercase",
    fontWeight: "900",
  },
  truthText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#374151",
    fontWeight: "700",
  },
  goalsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
    borderWidth: 2,
    borderColor: "#E5D39A",
  },
  goalText: {
    fontSize: 15,
    color: "#111827",
    fontWeight: "900",
    marginBottom: 6,
  },
  progressSectionTitle: {
    fontSize: 26,
    color: "#111827",
    fontWeight: "900",
    marginBottom: 10,
    marginTop: 2,
  },
  recoverySectionTitle: {
    fontSize: 26,
    color: "#F9FAFB",
    fontWeight: "900",
    marginBottom: 10,
    marginTop: 2,
  },
  progressQuestCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 14,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#E5D39A",
  },
  recoveryQuestCard: {
    backgroundColor: "#1E1B4B",
    borderRadius: 22,
    padding: 14,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#8B5CF6",
  },
  completedQuestCard: {
    backgroundColor: "#ECFDF5",
    borderRadius: 22,
    padding: 14,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#34D399",
  },
  questMain: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  questLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  checkbox: {
    fontSize: 24,
    marginRight: 10,
  },
  questTextBlock: {
    flex: 1,
  },
  questTitle: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "900",
    marginBottom: 4,
  },
  completedQuestText: {
    fontSize: 16,
    color: "#065F46",
    fontWeight: "900",
    marginBottom: 4,
    textDecorationLine: "line-through",
  },
  questType: {
    fontSize: 12,
    color: "#D1D5DB",
    fontWeight: "800",
    textTransform: "uppercase",
  },
  stepPill: {
    backgroundColor: "#FBBF24",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#111827",
    marginLeft: 10,
  },
  steps: {
    color: "#111827",
    fontWeight: "900",
    fontSize: 13,
  },
  reflectButton: {
    marginTop: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#D1D5DB",
  },
  reflectButtonText: {
    color: "#374151",
    fontSize: 13,
    fontWeight: "800",
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    marginTop: 6,
    borderWidth: 2,
    borderColor: "#E5D39A",
  },
  rank: {
    fontSize: 24,
    color: "#111827",
    fontWeight: "900",
    marginBottom: 8,
  },
  smallText: {
    color: "#374151",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  resetButton: {
    backgroundColor: "#111827",
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    marginTop: 12,
    borderWidth: 2,
    borderColor: "#FBBF24",
  },
  resetButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
});