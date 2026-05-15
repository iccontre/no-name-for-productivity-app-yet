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
  const longTermDream = profile?.longTermDream?.trim();
  const dreamCategory = profile?.dreamCategory?.trim();

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
        <View style={styles.worldTopRow}>
          <View style={styles.worldLeft}>
            <Text style={styles.worldLabel}>{isRecovery ? "Recovery Realm" : "Progress Realm"}</Text>
            <Text style={styles.worldTitle}>{isRecovery ? "Recovery Mode" : "Progress Mode"}</Text>
            <Text style={styles.worldStatus}>
              {isRecovery
                ? "Protect your flame and restore direction"
                : "Energy available for meaningful action"}
            </Text>
          </View>

          <View style={isRecovery ? styles.recoveryGuideOrb : styles.progressGuideOrb}>
            <Text style={styles.guideOrbLabel}>Luna</Text>
            <Text style={styles.guideOrbState}>{isRecovery ? "Calm Guide" : "Active Guide"}</Text>
          </View>
        </View>

        <View style={styles.worldFooterRow}>
          <Text style={styles.logo}>lit</Text>
          <View style={styles.realmBadge}>
            <Text style={styles.realmBadgeText}>{isRecovery ? "Moonlit" : "Sunlit"}</Text>
          </View>
        </View>
      </View>

      <View style={styles.commandSection}>
        <Text style={styles.sectionTitle}>Start Today</Text>

        <TouchableOpacity
          style={[styles.commandTileLarge, isRecovery ? styles.commandTileRecovery : styles.commandTileProgress]}
          onPress={() => navigateWithHaptic("/sleep-checkin")}
        >
          <View style={styles.commandTileHead}>
            <Text style={styles.commandTileIcon}>⚡</Text>
            <View style={styles.commandPill}>
              <Text style={styles.commandPillText}>Core Ritual</Text>
            </View>
          </View>
          <Text style={styles.commandTitle}>Morning Check-In</Text>
          <Text style={styles.commandSubtitle}>Set today’s energy</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.commandTileLarge, isRecovery ? styles.commandTileRecovery : styles.commandTileProgress]}
          onPress={() => navigateWithHaptic("/onboarding")}
        >
          <View style={styles.commandTileHead}>
            <Text style={styles.commandTileIcon}>🧭</Text>
            <View style={styles.commandPill}>
              <Text style={styles.commandPillText}>Path</Text>
            </View>
          </View>
          <Text style={styles.commandTitle}>Set My Path</Text>
          <Text style={styles.commandSubtitle}>Choose your dream</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.commandSection}>
        <Text style={styles.sectionTitle}>Today Plan</Text>
        <View style={styles.tileRow}>
          <TouchableOpacity
            style={[styles.commandTileHalf, styles.tileGold]}
            onPress={() => navigateWithHaptic("/tomorrow-queue")}
          >
            <Text style={styles.commandTileIcon}>📌</Text>
            <Text style={styles.commandTitleSmall}>Tomorrow Queue</Text>
            <Text style={styles.commandSubtitleSmall}>Save future actions</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.commandTileHalf, styles.tileGreen]}
            onPress={() => navigateWithHaptic("/weekly-summary")}
          >
            <Text style={styles.commandTileIcon}>📊</Text>
            <Text style={styles.commandTitleSmall}>Weekly Summary</Text>
            <Text style={styles.commandSubtitleSmall}>Review your pattern</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.commandSection}>
        <Text style={styles.sectionTitle}>Mind & Sleep</Text>
        <View style={styles.tileRow}>
          <TouchableOpacity
            style={[styles.commandTileHalf, styles.tilePurple]}
            onPress={() => navigateWithHaptic("/journal")}
          >
            <Text style={styles.commandTileIcon}>📓</Text>
            <Text style={styles.commandTitleSmall}>Journal</Text>
            <Text style={styles.commandSubtitleSmall}>Track your thoughts</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.commandTileHalf, styles.tilePurple]}
            onPress={() => navigateWithHaptic("/awareness-check")}
          >
            <Text style={styles.commandTileIcon}>🧠</Text>
            <Text style={styles.commandTitleSmall}>Awareness Check</Text>
            <Text style={styles.commandSubtitleSmall}>Notice attention</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tileRowSecond}>
          <TouchableOpacity
            style={[styles.commandTileHalf, styles.tileNight]}
            onPress={() => navigateWithHaptic("/pre-sleep-intention")}
          >
            <Text style={styles.commandTileIcon}>🌙</Text>
            <Text style={styles.commandTitleSmall}>Pre-Sleep Intention</Text>
            <Text style={styles.commandSubtitleSmall}>Give tomorrow direction</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.commandTileHalf, styles.tileNight]}
            onPress={() => navigateWithHaptic("/morning-intention-reflection")}
          >
            <Text style={styles.commandTileIcon}>☀️</Text>
            <Text style={styles.commandTitleSmall}>Morning Reflection</Text>
            <Text style={styles.commandSubtitleSmall}>Connect night to action</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.commandSection}>
        <Text style={styles.sectionTitle}>Growth</Text>
        <TouchableOpacity
          style={[styles.commandTileLarge, styles.tileGrowth]}
          onPress={() => navigateWithHaptic("/next-chapter")}
        >
          <Text style={styles.commandTileIcon}>🌱</Text>
          <Text style={styles.commandTitle}>Next Chapter</Text>
          <Text style={styles.commandSubtitle}>Evolve your goals</Text>
        </TouchableOpacity>
      </View>

      {latestIntention ? (
        <View style={styles.signalCard}>
          <View style={styles.signalTopRow}>
            <Text style={styles.signalLabel}>Night Signal</Text>
            <View style={styles.signalPill}>
              <Text style={styles.signalPillText}>Carry Forward</Text>
            </View>
          </View>
          <Text style={styles.signalText}>{latestIntention.intention}</Text>

          {latestIntention.firstSmallAction ? (
            <Text style={styles.signalActionText}>
              First small action: {latestIntention.firstSmallAction}
            </Text>
          ) : null}

          <TouchableOpacity
            style={styles.signalButton}
            onPress={() => navigateWithHaptic("/morning-intention-reflection")}
          >
            <Text style={styles.signalButtonText}>Reflect This Morning</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={isRecovery ? styles.recoveryEnergyCard : styles.progressEnergyCard}>
        <View>
          <Text style={styles.energyLabel}>Energy Yield</Text>
          <Text style={styles.energyValue}>🔥 {energyYield}/100</Text>
          <Text style={styles.flameLabel}>{flameLabel}</Text>
          <Text style={styles.energyLine}>
            {isRecovery
              ? "Use your remaining energy carefully."
              : "Spend your energy on what matters most."}
          </Text>
        </View>

        <View style={styles.modeBadge}>
          <Text style={styles.modeBadgeText}>{mode}</Text>
        </View>
      </View>

      <View style={isRecovery ? styles.recoveryBriefingCard : styles.progressBriefingCard}>
        <Text style={styles.briefingTitle}>Luna’s Briefing</Text>
        <Text style={styles.briefingText}>
          {isRecovery
            ? "Recovery is still progress. Today’s job is to protect your energy and keep one promise to yourself."
            : "Progress is personal. Today’s job is to spend your energy on the path that matters to you."}
        </Text>
        <Text style={styles.briefingGoal}>Top goal: {topGoal}</Text>
      </View>

      {progressMeaning ? (
        <View style={styles.progressMeaningCard}>
          <Text style={styles.progressMeaningLabel}>Your definition of progress</Text>
          <Text style={styles.progressMeaningText}>{progressMeaning}</Text>
        </View>
      ) : null}

      <View style={styles.pathCard}>
        <Text style={styles.pathTitle}>Current Path</Text>

        {dreamCategory ? <Text style={styles.pathMeta}>Category: {dreamCategory}</Text> : null}
        {longTermDream ? <Text style={styles.pathMeta}>Long-term dream: {longTermDream}</Text> : null}

        <View style={styles.pathStepRow}>
          <Text style={styles.pathStepNumber}>1</Text>
          <Text style={styles.pathStepText}>{topGoal}</Text>
        </View>
        <View style={styles.pathStepRow}>
          <Text style={styles.pathStepNumber}>2</Text>
          <Text style={styles.pathStepText}>{secondGoal}</Text>
        </View>
        <View style={styles.pathStepRow}>
          <Text style={styles.pathStepNumber}>3</Text>
          <Text style={styles.pathStepText}>{thirdGoal}</Text>
        </View>
      </View>

      <Text style={isRecovery ? styles.questBoardTitleRecovery : styles.questBoardTitleProgress}>
        Quest Board
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
                  <View style={styles.questMetaRow}>
                    <View style={styles.questTypeBadge}>
                      <Text style={styles.questTypeBadgeText}>{quest.type}</Text>
                    </View>
                  </View>
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
                  <Text style={styles.reflectButtonText}>Reflect if missed</Text>
                </TouchableOpacity>
              </Link>
            )}
          </View>
        );
      })}

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Rank Panel</Text>
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
    paddingTop: 56,
    paddingBottom: 40,
  },

  progressHero: {
    backgroundColor: "#FDE68A",
    borderColor: "#F59E0B",
    borderWidth: 3,
    borderRadius: 30,
    padding: 20,
    marginBottom: 16,
  },
  recoveryHero: {
    backgroundColor: "#1E1B4B",
    borderColor: "#8B5CF6",
    borderWidth: 3,
    borderRadius: 30,
    padding: 20,
    marginBottom: 16,
  },
  worldTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  worldLeft: {
    flex: 1,
    marginRight: 12,
  },
  worldLabel: {
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    color: "#F9FAFB",
    marginBottom: 6,
  },
  worldTitle: {
    fontSize: 30,
    fontWeight: "900",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  worldStatus: {
    fontSize: 14,
    color: "#F9FAFB",
    fontWeight: "700",
    lineHeight: 20,
  },
  progressGuideOrb: {
    width: 110,
    borderRadius: 18,
    padding: 10,
    backgroundColor: "#FFF7ED",
    borderWidth: 2,
    borderColor: "#F59E0B",
    alignItems: "center",
  },
  recoveryGuideOrb: {
    width: 110,
    borderRadius: 18,
    padding: 10,
    backgroundColor: "#312E81",
    borderWidth: 2,
    borderColor: "#A78BFA",
    alignItems: "center",
  },
  guideOrbLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: "#F9FAFB",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  guideOrbState: {
    fontSize: 12,
    fontWeight: "800",
    color: "#E5E7EB",
    textAlign: "center",
  },
  worldFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logo: {
    fontSize: 48,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -2,
  },
  realmBadge: {
    backgroundColor: "#111827",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  realmBadgeText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 12,
  },

  commandSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#E5D39A",
    padding: 14,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 10,
  },
  commandTileLarge: {
    borderRadius: 18,
    borderWidth: 2,
    padding: 14,
    marginBottom: 10,
  },
  commandTileRecovery: {
    backgroundColor: "#EEF2FF",
    borderColor: "#A78BFA",
  },
  commandTileProgress: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FBBF24",
  },
  commandTileHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  commandTileIcon: {
    fontSize: 18,
  },
  commandPill: {
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#9CA3AF",
    backgroundColor: "#FFFFFF",
  },
  commandPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#374151",
  },
  commandTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 4,
  },
  commandSubtitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4B5563",
  },

  tileRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  tileRowSecond: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  commandTileHalf: {
    width: "48%",
    borderRadius: 18,
    borderWidth: 2,
    padding: 12,
    minHeight: 108,
  },
  tileGold: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FBBF24",
  },
  tileGreen: {
    backgroundColor: "#F0FDF4",
    borderColor: "#22C55E",
  },
  tilePurple: {
    backgroundColor: "#F9FAFB",
    borderColor: "#A78BFA",
  },
  tileNight: {
    backgroundColor: "#EEF2FF",
    borderColor: "#818CF8",
  },
  tileGrowth: {
    backgroundColor: "#F9FAFB",
    borderColor: "#A78BFA",
  },
  commandTitleSmall: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111827",
    marginTop: 8,
    marginBottom: 3,
  },
  commandSubtitleSmall: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
    lineHeight: 17,
  },

  signalCard: {
    backgroundColor: "#EEF2FF",
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#818CF8",
    padding: 16,
    marginBottom: 14,
  },
  signalTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  signalLabel: {
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    color: "#3730A3",
  },
  signalPill: {
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#A5B4FC",
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  signalPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#3730A3",
  },
  signalText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    lineHeight: 23,
    marginBottom: 8,
  },
  signalActionText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 12,
  },
  signalButton: {
    backgroundColor: "#312E81",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#A78BFA",
    paddingVertical: 10,
    alignItems: "center",
  },
  signalButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },

  progressEnergyCard: {
    backgroundColor: "#111827",
    borderColor: "#FBBF24",
    borderWidth: 3,
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  recoveryEnergyCard: {
    backgroundColor: "#312E81",
    borderColor: "#A78BFA",
    borderWidth: 3,
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  energyLabel: {
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    color: "#D1D5DB",
    marginBottom: 6,
  },
  energyValue: {
    fontSize: 34,
    fontWeight: "900",
    color: "#FBBF24",
  },
  flameLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#F9FAFB",
    marginTop: 2,
    marginBottom: 4,
  },
  energyLine: {
    color: "#E5E7EB",
    fontSize: 13,
    fontWeight: "700",
  },
  modeBadge: {
    backgroundColor: "#0F172A",
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  modeBadgeText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 12,
  },

  progressBriefingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#FBBF24",
    padding: 16,
    marginBottom: 14,
  },
  recoveryBriefingCard: {
    backgroundColor: "#EEF2FF",
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#A78BFA",
    padding: 16,
    marginBottom: 14,
  },
  briefingTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 8,
  },
  briefingText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#374151",
    fontWeight: "700",
    marginBottom: 8,
  },
  briefingGoal: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "800",
  },

  progressMeaningCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#E5D39A",
    padding: 14,
    marginBottom: 14,
  },
  progressMeaningLabel: {
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    color: "#6B7280",
    marginBottom: 6,
  },
  progressMeaningText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#374151",
    fontWeight: "700",
  },

  pathCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#E5D39A",
    padding: 16,
    marginBottom: 14,
  },
  pathTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 8,
  },
  pathMeta: {
    fontSize: 13,
    color: "#4B5563",
    fontWeight: "700",
    marginBottom: 6,
  },
  pathStepRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  pathStepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#111827",
    color: "#FFFFFF",
    textAlign: "center",
    textAlignVertical: "center",
    fontWeight: "900",
    fontSize: 12,
    overflow: "hidden",
    marginRight: 10,
    paddingTop: 4,
  },
  pathStepText: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
    fontWeight: "800",
  },

  questBoardTitleProgress: {
    fontSize: 24,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 10,
    marginTop: 2,
  },
  questBoardTitleRecovery: {
    fontSize: 24,
    fontWeight: "900",
    color: "#F9FAFB",
    marginBottom: 10,
    marginTop: 2,
  },

  progressQuestCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#E5D39A",
    padding: 12,
    marginBottom: 10,
  },
  recoveryQuestCard: {
    backgroundColor: "#1E1B4B",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#8B5CF6",
    padding: 12,
    marginBottom: 10,
  },
  completedQuestCard: {
    backgroundColor: "#ECFDF5",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#34D399",
    padding: 12,
    marginBottom: 10,
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
    fontSize: 23,
    marginRight: 10,
  },
  questTextBlock: {
    flex: 1,
  },
  questTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#F9FAFB",
    marginBottom: 6,
  },
  completedQuestText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#065F46",
    marginBottom: 6,
    textDecorationLine: "line-through",
  },
  questMetaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  questTypeBadge: {
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  questTypeBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#374151",
    textTransform: "uppercase",
  },
  stepPill: {
    backgroundColor: "#FBBF24",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#111827",
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginLeft: 10,
  },
  steps: {
    color: "#111827",
    fontWeight: "900",
    fontSize: 12,
  },
  reflectButton: {
    marginTop: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    paddingVertical: 9,
    alignItems: "center",
  },
  reflectButtonText: {
    color: "#374151",
    fontWeight: "800",
    fontSize: 13,
  },

  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#E5D39A",
    padding: 16,
    marginTop: 6,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "900",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  rank: {
    fontSize: 21,
    color: "#111827",
    fontWeight: "900",
    marginBottom: 6,
  },
  smallText: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 3,
  },
  resetButton: {
    marginTop: 12,
    backgroundColor: "#111827",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#FBBF24",
    paddingVertical: 10,
    alignItems: "center",
  },
  resetButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
});