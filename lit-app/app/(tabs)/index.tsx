import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Quest = {
  title: string;
  type: string;
  steps: number;
  description?: string;
};

type QueueItem = {
  id?: string;
  text?: string;
  title?: string;
  task?: string;
  note?: string;
  type?: string;
};

type CheckIn = {
  id?: string;
  hours?: string;
  mood?: string;
  stress?: string;
  energy: number;
  mode: "Recovery" | "Progress";
  createdAt?: string;
};

type DayPlan = {
  Monday: string;
  Tuesday: string;
  Wednesday: string;
  Thursday: string;
  Friday: string;
  Saturday: string;
  Sunday: string;
};

type UserProfile = {
  name: string;
  longTermDream?: string;
  dreamCategory?: string;
  progressMeaning?: string;
  goalOne?: string;
  goalTwo?: string;
  goalThree?: string;
  biggestObstacle?: string;
  hasWorkOrSchool?: boolean;
  hasTransportation?: boolean;
  hasGymAccess?: boolean;
  hasQuietSpace?: boolean;
  hasFoodControl?: boolean;
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

type ModeState = "Recovery" | "Progress" | "Neutral";

const COMPLETED_QUESTS_KEY = "lit_completed_quests";
const TODAY_PROGRESS_DATE_KEY = "lit_today_progress_date";
const PROFILE_KEY = "lit_user_profile";
const CHECKIN_KEY = "lit_latest_checkin";
const LATEST_PRE_SLEEP_INTENTION_KEY = "lit_latest_pre_sleep_intention";
const TOMORROW_QUEUE_KEY = "lit_tomorrow_queue";
const DAY_PLAN_KEY = "lit_day_plan";

function getTodayKey() {
  return new Date().toLocaleDateString("en-CA");
}

function getWeekdayName() {
  const days: Array<keyof DayPlan> = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  return days[new Date().getDay()];
}

export default function HomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const rawMode = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const rawEnergy = Array.isArray(params.energy) ? params.energy[0] : params.energy;

  const hasRouteCheckIn =
    (rawMode === "Recovery" || rawMode === "Progress") &&
    rawEnergy !== undefined &&
    rawEnergy !== null &&
    rawEnergy !== "";

  const routeEnergyNumber = hasRouteCheckIn ? Number(rawEnergy) : NaN;
  const hasRouteEnergy = hasRouteCheckIn && !Number.isNaN(routeEnergyNumber);

  const [savedMode, setSavedMode] = useState<"Recovery" | "Progress">("Recovery");
  const [savedEnergy, setSavedEnergy] = useState(0);
  const [hasSavedCheckIn, setHasSavedCheckIn] = useState(false);
  const [latestCheckIn, setLatestCheckIn] = useState<CheckIn | null>(null);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [dayPlan, setDayPlan] = useState<DayPlan>({
    Monday: "",
    Tuesday: "",
    Wednesday: "",
    Thursday: "",
    Friday: "",
    Saturday: "",
    Sunday: "",
  });

  const hasEnergyData = hasRouteEnergy || hasSavedCheckIn;

  const currentMode: ModeState = hasEnergyData
    ? rawMode === "Recovery" || rawMode === "Progress"
      ? rawMode
      : savedMode
    : "Neutral";

  const isRecovery = currentMode === "Recovery";
  const isProgress = currentMode === "Progress";
  const isNeutral = currentMode === "Neutral";

  const energyYield = hasRouteEnergy ? routeEnergyNumber : savedEnergy;

  const [completedQuests, setCompletedQuests] = useState<string[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileChecked, setProfileChecked] = useState(false);
  const [latestIntention, setLatestIntention] = useState<PreSleepIntention | null>(null);

  useEffect(() => {
    loadCompletedQuests();
    loadProfile();
    loadLatestCheckIn();
    loadLatestIntention();
    loadQuickThoughts();
    loadDayPlan();
  }, []);

  useEffect(() => {
    if (hasRouteEnergy && (rawMode === "Recovery" || rawMode === "Progress")) {
      setSavedMode(rawMode);
      setSavedEnergy(routeEnergyNumber);
      setHasSavedCheckIn(true);
    }
  }, [hasRouteEnergy, rawMode, routeEnergyNumber]);

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

    setProfile(JSON.parse(saved));
    setProfileChecked(true);
  }

  async function loadQuickThoughts() {
    const saved = await AsyncStorage.getItem(TOMORROW_QUEUE_KEY);

    if (!saved) {
      setQueueItems([]);
      return;
    }

    const parsed = JSON.parse(saved);

    if (Array.isArray(parsed)) {
      setQueueItems(parsed);
    } else {
      setQueueItems([]);
    }
  }

  async function loadDayPlan() {
    const saved = await AsyncStorage.getItem(DAY_PLAN_KEY);

    if (!saved) return;

    const parsed = JSON.parse(saved);

    setDayPlan({
      Monday: parsed.Monday || "",
      Tuesday: parsed.Tuesday || "",
      Wednesday: parsed.Wednesday || "",
      Thursday: parsed.Thursday || "",
      Friday: parsed.Friday || "",
      Saturday: parsed.Saturday || "",
      Sunday: parsed.Sunday || "",
    });
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

    if (!saved) {
      setHasSavedCheckIn(false);
      setLatestCheckIn(null);
      return;
    }

    const checkIn = JSON.parse(saved);
    const validMode = checkIn.mode === "Recovery" || checkIn.mode === "Progress";
    const validEnergy = typeof checkIn.energy === "number";

    if (validMode && validEnergy) {
      setSavedMode(checkIn.mode);
      setSavedEnergy(checkIn.energy);
      setHasSavedCheckIn(true);
      setLatestCheckIn(checkIn);
    } else {
      setHasSavedCheckIn(false);
      setLatestCheckIn(null);
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

  const topGoal = profile?.goalOne?.trim() || "your top goal";
  const secondGoal = profile?.goalTwo?.trim() || "your next goal";
  const thirdGoal = profile?.goalThree?.trim() || "your future";
  const longTermDream = profile?.longTermDream?.trim();
  const dreamCategory = profile?.dreamCategory?.trim();

  const hoursSlept = latestCheckIn?.hours ? Number(latestCheckIn.hours) : null;
  const shouldSuggestNap =
    hasEnergyData &&
    hoursSlept !== null &&
    !Number.isNaN(hoursSlept) &&
    hoursSlept < 7;

  const todayName = getWeekdayName();
  const todayRole = dayPlan[todayName]?.trim();

  const flameLabel = useMemo(() => {
    if (!hasEnergyData) return "Check-in needed";
    if (energyYield >= 75) return "Bright Flame";
    if (energyYield >= 45) return "Steady Flame";
    return "Low Flame";
  }, [hasEnergyData, energyYield]);

  const modeTitle = isNeutral ? "Start Today" : isRecovery ? "Recovery Mode" : "Progress Mode";
  const modeInstruction = isNeutral
    ? "Complete a Morning Check-In to calculate your Energy Reserve."
    : isRecovery
    ? "Protect your energy and keep one promise."
    : "Use your energy on the path that matters.";

  const lunaMessage = isNeutral
    ? "Start with a Morning Check-In so I can build today’s quests around your real energy."
    : isRecovery
    ? "Recovery still counts. Pick the smallest honest step."
    : "Energy is available. Choose a quest that moves your path forward.";

  const meterFillCount = hasEnergyData ? Math.max(0, Math.min(10, Math.ceil(energyYield / 10))) : 0;

  function getAccentColor() {
    if (isNeutral) return "#22C55E";
    if (isRecovery) return "#A78BFA";
    return "#FBBF24";
  }

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

  function generateQuickThoughtQuests(): Quest[] {
    const unique = new Set<string>();
    const result: Quest[] = [];

    queueItems.forEach((item) => {
      const text =
        item?.text?.trim() ||
        item?.title?.trim() ||
        item?.task?.trim() ||
        item?.note?.trim();

      if (!text || unique.has(text)) return;

      unique.add(text);

      result.push({
        title: `Quick thought: ${text}`,
        type: "Quick Thought",
        steps: 1,
        description: item?.type ? `Saved from Quick Thoughts (${item.type})` : "Saved from Quick Thoughts",
      });
    });

    return result;
  }

  function generateQuests(): Quest[] {
    const napQuest: Quest = {
      title: "Take a recovery nap",
      type: "Recovery",
      steps: 1,
      description: "Aim for 30–60 minutes if your schedule allows.",
    };

    const dayPlanQuest: Quest | null = todayRole
      ? {
          title: `Day plan: ${todayRole}`,
          type: "Day Plan",
          steps: 1,
          description: "Use today’s theme to choose your next move.",
        }
      : null;

    const quickThoughtQuests = generateQuickThoughtQuests();

    if (isNeutral) {
      const neutralBase: Quest[] = [
        { title: "Complete Morning Check-In", type: "Start", steps: 1 },
        { title: "Review your current path", type: "Direction", steps: 1 },
        { title: "Choose one small action for today", type: "Plan", steps: 1 },
      ];

      const withNap = shouldSuggestNap
        ? [neutralBase[0], napQuest, neutralBase[1], neutralBase[2]]
        : neutralBase;

      const withDayPlan = dayPlanQuest ? [...withNap, dayPlanQuest] : withNap;
      return [...withDayPlan, ...quickThoughtQuests];
    }

    const category = profile?.dreamCategory?.trim() || "Purpose";
    const questMode: "Recovery" | "Progress" = isRecovery ? "Recovery" : "Progress";
    const categoryQuests = getCategoryQuests(category, questMode);

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

    const baseQuests = [
      ...categoryQuests,
      ...goalQuests,
      resourceQuest,
      movementQuest,
      transportQuest,
    ];

    const withNap = shouldSuggestNap ? [napQuest, ...baseQuests] : baseQuests;
    const withDayPlan = dayPlanQuest ? [...withNap, dayPlanQuest] : withNap;

    return [...withDayPlan, ...quickThoughtQuests];
  }

  const quests = generateQuests();

  const completedSteps = quests
    .filter((quest) => completedQuests.includes(quest.title))
    .reduce((sum, quest) => sum + quest.steps, 0);

  const completedVisibleQuests = quests.filter((quest) =>
    completedQuests.includes(quest.title)
  ).length;

  const rank = completedSteps >= 10 ? "Consistent" : "Beginner";

  if (!profileChecked) return null;

  return (
    <ScrollView
      style={isRecovery ? styles.recoveryScreen : isProgress ? styles.progressScreen : styles.neutralScreen}
      contentContainerStyle={styles.container}
    >
      <View style={isRecovery ? styles.recoveryHeader : isProgress ? styles.progressHeader : styles.neutralHeader}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity style={styles.headerSquareButton} onPress={() => navigateWithHaptic("/onboarding")}>
            <Text style={styles.headerSquareText}>Path</Text>
          </TouchableOpacity>

          <View style={styles.logoBlock}>
            <Text style={styles.logo}>lit</Text>
            <Text style={styles.subtitle}>Living in Truth</Text>
          </View>

          <TouchableOpacity style={styles.headerSquareButton} onPress={() => navigateWithHaptic("/onboarding")}>
            <Text style={styles.headerSquareText}>Goal</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.headerModePanel}>
          <Text style={styles.headerModeTitle}>{modeTitle}</Text>
          <Text style={styles.headerModeInstruction}>{modeInstruction}</Text>
        </View>
      </View>

      <View style={styles.timeTrackPanel}>
        <View style={styles.trackTopRow}>
          <Text style={styles.trackTitle}>Day Track</Text>
          <View style={[styles.trackModeMarker, { backgroundColor: getAccentColor() }]}>
            <Text style={styles.trackModeMarkerText}>{isNeutral ? "Start" : currentMode}</Text>
          </View>
        </View>

        <View style={styles.trackLineRow}>
          <View style={[styles.trackTick, isNeutral && styles.trackTickActive]} />
          <View style={[styles.trackTick, isProgress && styles.trackTickActive]} />
          <View style={styles.trackTick} />
          <View style={[styles.trackTick, isRecovery && styles.trackTickActive]} />
        </View>

        <View style={styles.trackLabelRow}>
          <Text style={styles.trackLabel}>6 AM{"\n"}morning</Text>
          <Text style={styles.trackLabel}>12 PM{"\n"}noon</Text>
          <Text style={styles.trackLabel}>6 PM{"\n"}evening</Text>
          <Text style={styles.trackLabel}>12 AM{"\n"}night</Text>
        </View>
      </View>

      <View style={isRecovery ? styles.recoveryLunaBox : isProgress ? styles.progressLunaBox : styles.neutralLunaBox}>
        <View style={styles.lunaAvatar}>
          <Text style={styles.lunaAvatarText}>L</Text>
        </View>

        <View style={styles.lunaDialogue}>
          <Text style={styles.lunaNameTag}>Luna</Text>
          <Text style={styles.lunaMessage}>{lunaMessage}</Text>
          <Text style={styles.lunaMainPath}>Main path: {topGoal}</Text>
        </View>
      </View>

      <View style={isRecovery ? styles.recoveryEnergyPanel : isProgress ? styles.progressEnergyPanel : styles.neutralEnergyPanel}>
        <View style={styles.energyHeaderRow}>
          <View>
            <Text style={styles.energyPanelTitle}>Energy Reserve</Text>
            <Text style={styles.energyPanelHint}>
              {hasEnergyData ? flameLabel : "Check-in needed"}
            </Text>
          </View>

          <View style={styles.modeBadge}>
            <Text style={styles.modeBadgeText}>
              {isNeutral ? "Not set" : isRecovery ? "Recovery" : "Progress"}
            </Text>
          </View>
        </View>

        <View style={styles.energyScoreRow}>
          <Text style={styles.energyScore}>{hasEnergyData ? energyYield : "—"}</Text>
          <Text style={styles.energyScoreTotal}>/100</Text>
        </View>

        <View style={styles.blockMeterRow}>
          {Array.from({ length: 10 }).map((_, index) => {
            const filled = index < meterFillCount;
            return (
              <View
                key={index}
                style={[
                  styles.meterBlock,
                  filled && isNeutral ? styles.neutralMeterBlockFilled : null,
                  filled && isProgress ? styles.progressMeterBlockFilled : null,
                  filled && isRecovery ? styles.recoveryMeterBlockFilled : null,
                ]}
              />
            );
          })}
        </View>

        <Text style={styles.energyInstruction}>
          {isNeutral
            ? "Complete a Morning Check-In to calculate today’s Energy Reserve."
            : isRecovery
            ? "Use your remaining energy carefully."
            : "Spend your energy on what matters most."}
        </Text>
      </View>

      {latestIntention ? (
        <View style={styles.nightSignalPanel}>
          <Text style={styles.panelTitle}>Night Signal</Text>
          <Text style={styles.panelInstruction}>Review the intention you saved before sleep.</Text>
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

      <View style={styles.questBoardPanel}>
        <View style={styles.panelHeaderRow}>
          <View>
            <Text style={styles.panelTitle}>Quest Board</Text>
            <Text style={styles.panelInstruction}>
              Complete quests for steps. If one does not happen, reflect instead of judging yourself.
            </Text>
          </View>
        </View>

        {quests.map((quest, index) => {
          const isComplete = completedQuests.includes(quest.title);

          return (
            <View
              key={`${quest.title}-${index}`}
              style={isComplete ? styles.questTileCleared : styles.questTile}
            >
              <TouchableOpacity style={styles.questMainRow} onPress={() => toggleQuest(quest.title)}>
                <View style={styles.questContent}>
                  <Text style={styles.questTitle}>{quest.title}</Text>
                  {quest.description ? (
                    <Text style={styles.questDescription}>{quest.description}</Text>
                  ) : null}

                  <View style={styles.questMetaRow}>
                    <View style={styles.questTypeBadge}>
                      <Text style={styles.questTypeText}>{quest.type}</Text>
                    </View>

                    <View style={styles.stepPill}>
                      <Text style={styles.stepPillText}>+{quest.steps} step</Text>
                    </View>
                  </View>
                </View>

                <Text style={styles.questCheckbox}>{isComplete ? "✅" : "⬜"}</Text>
              </TouchableOpacity>

              {!isComplete ? (
                <Link href={{ pathname: "/reflection", params: { quest: quest.title } }} asChild>
                  <TouchableOpacity style={styles.reflectButton} onPress={lightHaptic}>
                    <Text style={styles.reflectButtonText}>Missed? Reflect</Text>
                  </TouchableOpacity>
                </Link>
              ) : (
                <View style={styles.clearedBadge}>
                  <Text style={styles.clearedBadgeText}>Cleared</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>

      <View style={styles.featureMenuPanel}>
        <Text style={styles.panelTitle}>Daily Loadout</Text>

        <View style={styles.menuGrid}>
          <TouchableOpacity style={styles.menuTileGold} onPress={() => navigateWithHaptic("/sleep-checkin")}>
            <Text style={styles.menuTitle}>Morning Check-In</Text>
            <Text style={styles.menuInstruction}>Enter sleep, mood, and stress.</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuTileGold} onPress={() => navigateWithHaptic("/onboarding")}>
            <Text style={styles.menuTitle}>Set My Path</Text>
            <Text style={styles.menuInstruction}>Choose your dream and goals.</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.menuGridSecond}>
          <TouchableOpacity style={styles.menuTileGreen} onPress={() => navigateWithHaptic("/tomorrow-queue")}>
            <Text style={styles.menuTitle}>Quick Thoughts</Text>
            <Text style={styles.menuInstruction}>Save ideas before they disappear.</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuTileGreen} onPress={() => navigateWithHaptic("/day-plan")}>
            <Text style={styles.menuTitle}>Day Plan</Text>
            <Text style={styles.menuInstruction}>Set what each day is for.</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.featureMenuPanelBlue}>
        <Text style={styles.panelTitle}>Mind</Text>

        <View style={styles.menuGrid}>
          <TouchableOpacity style={styles.menuTileBlue} onPress={() => navigateWithHaptic("/journal")}>
            <Text style={styles.menuTitle}>Journal</Text>
            <Text style={styles.menuInstruction}>Write reflections and thought patterns.</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuTileBlue} onPress={() => navigateWithHaptic("/awareness-check")}>
            <Text style={styles.menuTitle}>Meditations</Text>
            <Text style={styles.menuInstruction}>Notice attention and distractions.</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.featureMenuPanelPurple}>
        <Text style={styles.panelTitle}>Sleep</Text>

        <View style={styles.menuGrid}>
          <TouchableOpacity style={styles.menuTilePurple} onPress={() => navigateWithHaptic("/pre-sleep-intention")}>
            <Text style={styles.menuTitle}>Pre-Sleep Intention</Text>
            <Text style={styles.menuInstruction}>Set one intention before bed.</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuTilePurple} onPress={() => navigateWithHaptic("/morning-intention-reflection")}>
            <Text style={styles.menuTitle}>Morning Reflection</Text>
            <Text style={styles.menuInstruction}>Check what carried into morning.</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.featureMenuPanelGreen}>
        <Text style={styles.panelTitle}>Growth</Text>

        <View style={styles.menuGrid}>
          <TouchableOpacity style={styles.menuTileGreen} onPress={() => navigateWithHaptic("/weekly-summary")}>
            <Text style={styles.menuTitle}>Weekly Summary</Text>
            <Text style={styles.menuInstruction}>Review patterns and progress.</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuTileGreen} onPress={() => navigateWithHaptic("/next-chapter")}>
            <Text style={styles.menuTitle}>Set Your Next Long-Term Goal</Text>
            <Text style={styles.menuInstruction}>Update your direction.</Text>
          </TouchableOpacity>
        </View>
      </View>

      {todayRole ? (
        <View style={styles.dayPlanPanel}>
          <Text style={styles.panelTitle}>Today’s Day Plan</Text>
          <Text style={styles.dayPlanText}>
            {todayName}: {todayRole}
          </Text>
          <Text style={styles.panelInstruction}>Use this as the theme for today’s quests.</Text>
        </View>
      ) : null}

      <View style={styles.pathMapPanel}>
        <Text style={styles.panelTitle}>Path Map</Text>
        <Text style={styles.panelInstruction}>Your dream and goals shape today’s quests.</Text>

        {dreamCategory ? (
          <View style={styles.pathCategoryBadge}>
            <Text style={styles.pathCategoryText}>Category: {dreamCategory}</Text>
          </View>
        ) : null}

        {longTermDream ? (
          <Text style={styles.pathDreamText}>Long-term dream: {longTermDream}</Text>
        ) : null}

        <View style={styles.pathStepCard}>
          <Text style={styles.pathStepNumber}>1</Text>
          <Text style={styles.pathStepText}>{topGoal}</Text>
        </View>

        <View style={styles.pathStepCard}>
          <Text style={styles.pathStepNumber}>2</Text>
          <Text style={styles.pathStepText}>{secondGoal}</Text>
        </View>

        <View style={styles.pathStepCard}>
          <Text style={styles.pathStepNumber}>3</Text>
          <Text style={styles.pathStepText}>{thirdGoal}</Text>
        </View>
      </View>

      <View style={styles.rankPanel}>
        <Text style={styles.panelTitle}>Rank & Steps</Text>
        <Text style={styles.panelInstruction}>Steps track completed daily actions, not perfection.</Text>

        <View style={styles.rankStatRow}>
          <View style={styles.rankStatBox}>
            <Text style={styles.rankStatLabel}>Rank</Text>
            <Text style={styles.rankStatValue}>{rank}</Text>
          </View>

          <View style={styles.rankStatBox}>
            <Text style={styles.rankStatLabel}>Steps</Text>
            <Text style={styles.rankStatValue}>{completedSteps}</Text>
          </View>
        </View>

        <Text style={styles.rankText}>
          Completed quests: {completedVisibleQuests}/{quests.length}
        </Text>

        <TouchableOpacity style={styles.resetButton} onPress={resetTodayProgress}>
          <Text style={styles.resetButtonText}>Reset Today Plan</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomActionBar}>
        <TouchableOpacity style={styles.bottomActionButton} onPress={lightHaptic}>
          <Text style={styles.bottomActionIcon}>⌂</Text>
          <Text style={styles.bottomActionText}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.bottomActionButton} onPress={lightHaptic}>
          <Text style={styles.bottomActionIcon}>☑</Text>
          <Text style={styles.bottomActionText}>Quests</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.bottomActionButton} onPress={() => navigateWithHaptic("/awareness-check")}>
          <Text style={styles.bottomActionIcon}>◌</Text>
          <Text style={styles.bottomActionText}>Mind</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.bottomActionButton} onPress={() => navigateWithHaptic("/weekly-summary")}>
          <Text style={styles.bottomActionIcon}>▣</Text>
          <Text style={styles.bottomActionText}>Stats</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.bottomActionButton} onPress={() => navigateWithHaptic("/journal")}>
          <Text style={styles.bottomActionIcon}>✎</Text>
          <Text style={styles.bottomActionText}>Journal</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  neutralScreen: {
    flex: 1,
    backgroundColor: "#ECFDF5",
  },
  progressScreen: {
    flex: 1,
    backgroundColor: "#FFF7ED",
  },
  recoveryScreen: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  container: {
    padding: 18,
    paddingTop: 52,
    paddingBottom: 36,
  },

  neutralHeader: {
    backgroundColor: "#DCFCE7",
    borderColor: "#22C55E",
    borderWidth: 4,
    borderRadius: 28,
    padding: 16,
    marginBottom: 14,
  },
  progressHeader: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FBBF24",
    borderWidth: 4,
    borderRadius: 28,
    padding: 16,
    marginBottom: 14,
  },
  recoveryHeader: {
    backgroundColor: "#1E1B4B",
    borderColor: "#A78BFA",
    borderWidth: 4,
    borderRadius: 28,
    padding: 16,
    marginBottom: 14,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerSquareButton: {
    width: 58,
    height: 58,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: "#111827",
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  headerSquareText: {
    color: "#111827",
    fontSize: 12,
    fontWeight: "900",
  },
  logoBlock: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 12,
  },
  logo: {
    color: "#111827",
    fontSize: 54,
    fontWeight: "900",
    letterSpacing: -2,
  },
  subtitle: {
    color: "#374151",
    fontSize: 13,
    fontWeight: "800",
    marginTop: -5,
  },
  headerModePanel: {
    backgroundColor: "#F9FAFB",
    borderColor: "#111827",
    borderWidth: 3,
    borderRadius: 18,
    padding: 14,
    marginTop: 14,
  },
  headerModeTitle: {
    color: "#111827",
    fontSize: 25,
    fontWeight: "900",
    marginBottom: 4,
  },
  headerModeInstruction: {
    color: "#374151",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800",
  },

  timeTrackPanel: {
    backgroundColor: "#111827",
    borderColor: "#374151",
    borderWidth: 3,
    borderRadius: 22,
    padding: 14,
    marginBottom: 14,
  },
  trackTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  trackTitle: {
    color: "#F9FAFB",
    fontSize: 17,
    fontWeight: "900",
  },
  trackModeMarker: {
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: "#F9FAFB",
  },
  trackModeMarkerText: {
    color: "#111827",
    fontSize: 12,
    fontWeight: "900",
  },
  trackLineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  trackTick: {
    width: "22%",
    height: 14,
    borderRadius: 5,
    backgroundColor: "#374151",
    borderWidth: 1,
    borderColor: "#6B7280",
  },
  trackTickActive: {
    backgroundColor: "#FBBF24",
    borderColor: "#F9FAFB",
  },
  trackLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  trackLabel: {
    width: "24%",
    color: "#D1D5DB",
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "800",
    textAlign: "center",
  },

  neutralLunaBox: {
    backgroundColor: "#DCFCE7",
    borderColor: "#22C55E",
    borderWidth: 3,
    borderRadius: 24,
    padding: 14,
    marginBottom: 14,
    flexDirection: "row",
  },
  progressLunaBox: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FBBF24",
    borderWidth: 3,
    borderRadius: 24,
    padding: 14,
    marginBottom: 14,
    flexDirection: "row",
  },
  recoveryLunaBox: {
    backgroundColor: "#EEF2FF",
    borderColor: "#A78BFA",
    borderWidth: 3,
    borderRadius: 24,
    padding: 14,
    marginBottom: 14,
    flexDirection: "row",
  },
  lunaAvatar: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: "#111827",
    borderWidth: 3,
    borderColor: "#FBBF24",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  lunaAvatarText: {
    color: "#F9FAFB",
    fontSize: 26,
    fontWeight: "900",
  },
  lunaDialogue: {
    flex: 1,
  },
  lunaNameTag: {
    alignSelf: "flex-start",
    backgroundColor: "#111827",
    color: "#F9FAFB",
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
    marginBottom: 6,
  },
  lunaMessage: {
    color: "#111827",
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "800",
    marginBottom: 6,
  },
  lunaMainPath: {
    color: "#374151",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
  },

  neutralEnergyPanel: {
    backgroundColor: "#14532D",
    borderColor: "#22C55E",
    borderWidth: 4,
    borderRadius: 26,
    padding: 18,
    marginBottom: 14,
  },
  progressEnergyPanel: {
    backgroundColor: "#111827",
    borderColor: "#FBBF24",
    borderWidth: 4,
    borderRadius: 26,
    padding: 18,
    marginBottom: 14,
  },
  recoveryEnergyPanel: {
    backgroundColor: "#1E1B4B",
    borderColor: "#A78BFA",
    borderWidth: 4,
    borderRadius: 26,
    padding: 18,
    marginBottom: 14,
  },
  energyHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  energyPanelTitle: {
    color: "#F9FAFB",
    fontSize: 22,
    fontWeight: "900",
  },
  energyPanelHint: {
    color: "#E5E7EB",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 3,
  },
  modeBadge: {
    backgroundColor: "#F9FAFB",
    borderColor: "#111827",
    borderWidth: 2,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  modeBadgeText: {
    color: "#111827",
    fontSize: 12,
    fontWeight: "900",
  },
  energyScoreRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 12,
  },
  energyScore: {
    color: "#FBBF24",
    fontSize: 58,
    lineHeight: 62,
    fontWeight: "900",
  },
  energyScoreTotal: {
    color: "#F9FAFB",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 9,
    marginLeft: 3,
  },
  blockMeterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  meterBlock: {
    width: "8.5%",
    height: 18,
    borderRadius: 5,
    backgroundColor: "#374151",
    borderWidth: 1,
    borderColor: "#6B7280",
  },
  neutralMeterBlockFilled: {
    backgroundColor: "#22C55E",
    borderColor: "#DCFCE7",
  },
  progressMeterBlockFilled: {
    backgroundColor: "#FBBF24",
    borderColor: "#FEF3C7",
  },
  recoveryMeterBlockFilled: {
    backgroundColor: "#A78BFA",
    borderColor: "#EEF2FF",
  },
  energyInstruction: {
    color: "#E5E7EB",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800",
  },

  nightSignalPanel: {
    backgroundColor: "#EEF2FF",
    borderColor: "#A78BFA",
    borderWidth: 3,
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
  },
  signalText: {
    color: "#111827",
    fontSize: 16,
    lineHeight: 23,
    fontWeight: "900",
    marginBottom: 8,
  },
  signalActionText: {
    color: "#374151",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800",
    marginBottom: 12,
  },
  signalButton: {
    backgroundColor: "#312E81",
    borderColor: "#A78BFA",
    borderWidth: 2,
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: "center",
  },
  signalButtonText: {
    color: "#F9FAFB",
    fontSize: 14,
    fontWeight: "900",
  },

  questBoardPanel: {
    backgroundColor: "#FEF3C7",
    borderColor: "#F59E0B",
    borderWidth: 4,
    borderRadius: 26,
    padding: 16,
    marginBottom: 14,
  },
  panelHeaderRow: {
    marginBottom: 10,
  },
  panelTitle: {
    color: "#111827",
    fontSize: 23,
    fontWeight: "900",
    marginBottom: 5,
  },
  panelInstruction: {
    color: "#374151",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "800",
    marginBottom: 10,
  },
  questTile: {
    backgroundColor: "#F9FAFB",
    borderColor: "#111827",
    borderWidth: 3,
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
  },
  questTileCleared: {
    backgroundColor: "#ECFDF5",
    borderColor: "#22C55E",
    borderWidth: 3,
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
  },
  questMainRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  questContent: {
    flex: 1,
  },
  questTitle: {
    color: "#111827",
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "900",
    marginBottom: 4,
  },
  questDescription: {
    color: "#374151",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800",
    marginBottom: 7,
  },
  questMetaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  questTypeBadge: {
    backgroundColor: "#E0F2FE",
    borderColor: "#0284C7",
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 9,
    marginRight: 8,
  },
  questTypeText: {
    color: "#0F172A",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  stepPill: {
    backgroundColor: "#FBBF24",
    borderColor: "#111827",
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 9,
  },
  stepPillText: {
    color: "#111827",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  questCheckbox: {
    fontSize: 24,
    marginLeft: 10,
  },
  reflectButton: {
    backgroundColor: "#111827",
    borderColor: "#374151",
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 9,
    alignItems: "center",
    marginTop: 10,
  },
  reflectButtonText: {
    color: "#F9FAFB",
    fontSize: 13,
    fontWeight: "900",
  },
  clearedBadge: {
    backgroundColor: "#22C55E",
    borderColor: "#14532D",
    borderWidth: 2,
    borderRadius: 999,
    paddingVertical: 6,
    alignItems: "center",
    marginTop: 10,
  },
  clearedBadgeText: {
    color: "#052E16",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },

  featureMenuPanel: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FBBF24",
    borderWidth: 3,
    borderRadius: 24,
    padding: 14,
    marginBottom: 14,
  },
  featureMenuPanelBlue: {
    backgroundColor: "#EFF6FF",
    borderColor: "#60A5FA",
    borderWidth: 3,
    borderRadius: 24,
    padding: 14,
    marginBottom: 14,
  },
  featureMenuPanelPurple: {
    backgroundColor: "#EEF2FF",
    borderColor: "#A78BFA",
    borderWidth: 3,
    borderRadius: 24,
    padding: 14,
    marginBottom: 14,
  },
  featureMenuPanelGreen: {
    backgroundColor: "#ECFDF5",
    borderColor: "#22C55E",
    borderWidth: 3,
    borderRadius: 24,
    padding: 14,
    marginBottom: 14,
  },
  menuGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  menuGridSecond: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  menuTileGold: {
    width: "48%",
    minHeight: 112,
    backgroundColor: "#FEF3C7",
    borderColor: "#F59E0B",
    borderWidth: 3,
    borderRadius: 18,
    padding: 12,
  },
  menuTileGreen: {
    width: "48%",
    minHeight: 112,
    backgroundColor: "#DCFCE7",
    borderColor: "#22C55E",
    borderWidth: 3,
    borderRadius: 18,
    padding: 12,
  },
  menuTileBlue: {
    width: "48%",
    minHeight: 112,
    backgroundColor: "#E0F2FE",
    borderColor: "#38BDF8",
    borderWidth: 3,
    borderRadius: 18,
    padding: 12,
  },
  menuTilePurple: {
    width: "48%",
    minHeight: 112,
    backgroundColor: "#EEF2FF",
    borderColor: "#A78BFA",
    borderWidth: 3,
    borderRadius: 18,
    padding: 12,
  },
  menuTitle: {
    color: "#111827",
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "900",
    marginBottom: 6,
  },
  menuInstruction: {
    color: "#374151",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800",
  },

  dayPlanPanel: {
    backgroundColor: "#E0F2FE",
    borderColor: "#38BDF8",
    borderWidth: 3,
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
  },
  dayPlanText: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 6,
  },

  pathMapPanel: {
    backgroundColor: "#F9FAFB",
    borderColor: "#111827",
    borderWidth: 3,
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
  },
  pathCategoryBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#111827",
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 11,
    marginBottom: 10,
  },
  pathCategoryText: {
    color: "#F9FAFB",
    fontSize: 12,
    fontWeight: "900",
  },
  pathDreamText: {
    color: "#374151",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800",
    marginBottom: 10,
  },
  pathStepCard: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FBBF24",
    borderWidth: 2,
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  pathStepNumber: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#111827",
    color: "#F9FAFB",
    fontSize: 14,
    fontWeight: "900",
    textAlign: "center",
    paddingTop: 5,
    overflow: "hidden",
    marginRight: 10,
  },
  pathStepText: {
    flex: 1,
    color: "#111827",
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "900",
  },

  rankPanel: {
    backgroundColor: "#ECFDF5",
    borderColor: "#22C55E",
    borderWidth: 3,
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
  },
  rankStatRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  rankStatBox: {
    width: "48%",
    backgroundColor: "#F9FAFB",
    borderColor: "#111827",
    borderWidth: 2,
    borderRadius: 16,
    padding: 12,
  },
  rankStatLabel: {
    color: "#374151",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  rankStatValue: {
    color: "#111827",
    fontSize: 22,
    fontWeight: "900",
  },
  rankText: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 12,
  },
  resetButton: {
    backgroundColor: "#111827",
    borderColor: "#FBBF24",
    borderWidth: 2,
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: "center",
  },
  resetButtonText: {
    color: "#F9FAFB",
    fontSize: 14,
    fontWeight: "900",
  },

  bottomActionBar: {
    backgroundColor: "#111827",
    borderColor: "#374151",
    borderWidth: 3,
    borderRadius: 24,
    padding: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  bottomActionButton: {
    width: "19%",
    backgroundColor: "#1F2937",
    borderColor: "#4B5563",
    borderWidth: 2,
    borderRadius: 14,
    paddingVertical: 8,
    alignItems: "center",
  },
  bottomActionIcon: {
    color: "#FBBF24",
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 2,
  },
  bottomActionText: {
    color: "#F9FAFB",
    fontSize: 10,
    fontWeight: "900",
  },
});