import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Stethoscope,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Printer,
  RotateCcw,
  Activity,
  Heart,
  Calculator,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  Minus,
  Apple,
  Dumbbell,
  Moon,
  TrendingUp,
  Award,
  User,
  FolderLock,
  Star,
  Trash2,
  Search,
  FileText,
  Check,
  Lock,
  RefreshCw,
  Send
} from "lucide-react";
import { pcosData, faqs, questions, rotterdamPhenotypes } from "./data";
import { UserAnswers, PCOSProfile, RotterdamAnswers, RotterdamPhenotype } from "./types";
import {
  db,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  query,
  orderBy,
  deleteDoc
} from "./firebase";

import coverImgImport from "./assets/images/pcos_watercolor_illustration_1783960996955.jpg";

const imageSources = [
  coverImgImport,
  "pcos_watercolor_illustration_1783960996955.jpg",
  "/pcos_watercolor_illustration_1783960996955.jpg",
  "./pcos_watercolor_illustration_1783960996955.jpg",
  "https://ais-dev-xquqh5q2kld7p6vmc4rwik-600739606182.asia-northeast1.run.app/pcos_watercolor_illustration_1783960996955.jpg",
  "https://ais-pre-xquqh5q2kld7p6vmc4rwik-600739606182.asia-northeast1.run.app/pcos_watercolor_illustration_1783960996955.jpg"
];

export default function App() {
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [viewState, setViewState] = useState<"welcome" | "evaluating" | "patient-info" | "result" | "admin">("welcome");
  const [currentStep, setCurrentStep] = useState<number>(0); // Step 0: Rotterdam, Step 1-4: Q1-Q4
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"portrait" | "medical" | "lifestyle">("portrait");
  
  const [answers, setAnswers] = useState<UserAnswers>({
    q1: null,
    q2: null,
    q3: null,
    q4: null
  });

  const [rotterdamAnswers, setRotterdamAnswers] = useState<RotterdamAnswers>({
    hasMenstrualIssue: false,
    hasAndrogenIssue: false,
    hasUltrasoundIssue: false
  });

  // BMI Tool State
  const [showBmiCalc, setShowBmiCalc] = useState<boolean>(false);
  const [heightCm, setHeightCm] = useState<string>("");
  const [weightKg, setWeightKg] = useState<string>("");
  const [waistCm, setWaistCm] = useState<string>("");
  const [calculatedBmi, setCalculatedBmi] = useState<number | null>(null);
  const [bmiCategory, setBmiCategory] = useState<string>("");

  // Patient Info & Firestore States
  const [patientName, setPatientName] = useState<string>("");
  const [patientId, setPatientId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionId, setSubmissionId] = useState<string>("");

  // Feedback Form States
  const [feedbackRating, setFeedbackRating] = useState<number>(0);
  const [feedbackComment, setFeedbackComment] = useState<string>("");
  const [isFeedbackSubmitting, setIsFeedbackSubmitting] = useState<boolean>(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(false);

  // Admin Dashboard States
  const [showAdminLogin, setShowAdminLogin] = useState<boolean>(false);
  const [adminPin, setAdminPin] = useState<string>("");
  const [adminError, setAdminError] = useState<string>("");
  const [adminRecords, setAdminRecords] = useState<any[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState<boolean>(false);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterPhenotype, setFilterPhenotype] = useState<string>("all");
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);

  const [unsyncedCount, setUnsyncedCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncErrorMsg, setSyncErrorMsg] = useState<string>("");
  const [submitError, setSubmitError] = useState<string>("");

  // Helper to wrap Firestore operations in a promise that rejects after timeoutMs
  const promiseWithTimeout = <T,>(promise: Promise<T>, timeoutMs: number, errorMsg: string): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error(errorMsg)), timeoutMs))
    ]);
  };

  // Check unsynced list on load
  useEffect(() => {
    const checkUnsynced = () => {
      const raw = localStorage.getItem("pcos_unsynced_submissions");
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          setUnsyncedCount(parsed.length || 0);
        } catch {
          setUnsyncedCount(0);
        }
      } else {
        setUnsyncedCount(0);
      }
    };
    checkUnsynced();
    
    // Auto-sync once on mount after 1.5 seconds (gives network time to settle)
    const timer = setTimeout(() => {
      syncUnsyncedSubmissions();
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);

  // Sync function to upload any unsynced submissions from localStorage
  const syncUnsyncedSubmissions = async () => {
    const raw = localStorage.getItem("pcos_unsynced_submissions");
    if (!raw) {
      setUnsyncedCount(0);
      return;
    }
    let unsyncedList: any[] = [];
    try {
      unsyncedList = JSON.parse(raw);
    } catch {
      localStorage.removeItem("pcos_unsynced_submissions");
      setUnsyncedCount(0);
      return;
    }
    if (unsyncedList.length === 0) {
      setUnsyncedCount(0);
      return;
    }
    if (isSyncing) return;
    setIsSyncing(true);
    
    const remaining: any[] = [];
    for (const record of unsyncedList) {
      try {
        const { localId, ...payload } = record;
        const docRef = await promiseWithTimeout(
          addDoc(collection(db, "submissions"), payload),
          3000,
          "云端同步超时"
        );
        console.log("Successfully synced local record to Firestore:", docRef.id);
        
        if (submissionId === localId) {
          setSubmissionId(docRef.id);
        }
      } catch (err) {
        console.warn("同步单条记录失败，保留在缓存中:", err);
        remaining.push(record);
      }
    }
    
    if (remaining.length > 0) {
      localStorage.setItem("pcos_unsynced_submissions", JSON.stringify(remaining));
    } else {
      localStorage.removeItem("pcos_unsynced_submissions");
    }
    setUnsyncedCount(remaining.length);
    setIsSyncing(false);
  };

  const startEvaluation = () => {
    setViewState("evaluating");
    setCurrentStep(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      setViewState("patient-info");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const selectOption = (value: number) => {
    if (currentStep === 0) return; // Safeguard
    
    const currentQuestionKey = questions[currentStep - 1].id;
    setAnswers(prev => ({
      ...prev,
      [currentQuestionKey]: value
    }));

    setTimeout(() => {
      if (currentStep < 4) {
        setCurrentStep(prev => prev + 1);
      } else {
        setViewState("patient-info");
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 300);
  };

  const submitPatientData = async (e?: React.FormEvent, overrideName?: string, overrideId?: string) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    setSubmitError("");
    
    try {
      const finalProfile = getMatchedProfile();
      const finalRotterdam = getMatchedRotterdamPhenotype();
      
      const finalName = (overrideName !== undefined ? overrideName : patientName).trim() || "匿名患者";
      const finalId = (overrideId !== undefined ? overrideId : patientId).trim() || "未提供";

      const payload = {
        patientName: finalName,
        patientId: finalId,
        answers,
        rotterdamAnswers,
        matchedRotterdam: {
          code: finalRotterdam.code,
          name: finalRotterdam.name,
          definition: finalRotterdam.definition
        },
        matchedProfile: {
          id: finalProfile.id,
          title: finalProfile.title,
          concernText: finalProfile.concernText
        },
        heightCm,
        weightKg,
        waistCm,
        calculatedBmi: calculatedBmi || null,
        bmiCategory: bmiCategory || "",
        createdAt: new Date().toISOString(),
        feedback: null
      };

      const tempLocalId = `local_${Date.now()}`;

      try {
        // 尝试在 2.5 秒内写入云端，如超时直接捕获并进入本地缓存，绝对防手机卡死
        const docRef = await promiseWithTimeout(
          addDoc(collection(db, "submissions"), payload),
          2500,
          "写入云端数据库超时"
        );
        setSubmissionId(docRef.id);
        console.log("档案已成功保存至云端，记录ID:", docRef.id);
      } catch (err) {
        console.warn("保存到云端失败/超时，自动保存至本地缓存，稍后连网后将自动同步:", err);
        
        // 保存至本地 localStorage 的待同步队列中
        try {
          const unsyncedRaw = localStorage.getItem("pcos_unsynced_submissions");
          const unsyncedList = unsyncedRaw ? JSON.parse(unsyncedRaw) : [];
          unsyncedList.push({ localId: tempLocalId, ...payload });
          localStorage.setItem("pcos_unsynced_submissions", JSON.stringify(unsyncedList));
          setUnsyncedCount(unsyncedList.length);
        } catch (storageErr) {
          console.error("写入本地缓存失败:", storageErr);
        }
        
        setSubmissionId(tempLocalId);
      }

      // 无论云端是否成功，都直接进入结果页，提供无缝体验
      setViewState("result");
      setActiveTab("portrait");
      window.scrollTo({ top: 0, behavior: "smooth" });

      // 1秒后在后台静默尝试同步历史暂存记录
      setTimeout(() => {
        syncUnsyncedSubmissions();
      }, 1000);

    } catch (globalErr: any) {
      console.error("提交档案时遭遇全局未捕获异常:", globalErr);
      setSubmitError(globalErr?.message || String(globalErr));
      
      // 强力兜底：即使发生严重错误，也确保切换到结果页，绝不让手机端卡住
      try {
        const fallbackLocalId = `local_fallback_${Date.now()}`;
        setSubmissionId(fallbackLocalId);
        setViewState("result");
        setActiveTab("portrait");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch (fallbackErr) {
        console.error("兜底方案也失败:", fallbackErr);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitFeedback = async () => {
    if (!submissionId) return;
    setIsFeedbackSubmitting(true);
    const feedbackPayload = {
      rating: feedbackRating,
      comment: feedbackComment.trim(),
      submittedAt: new Date().toISOString()
    };

    if (submissionId.startsWith("local_")) {
      // 本地缓存档案更新反馈
      try {
        const raw = localStorage.getItem("pcos_unsynced_submissions");
        if (raw) {
          const unsynced: any[] = JSON.parse(raw);
          const updated = unsynced.map(record => {
            if (record.localId === submissionId) {
              return { ...record, feedback: feedbackPayload };
            }
            return record;
          });
          localStorage.setItem("pcos_unsynced_submissions", JSON.stringify(updated));
        }
        setFeedbackSubmitted(true);
      } catch (err) {
        console.error("本地保存反馈失败:", err);
      } finally {
        setIsFeedbackSubmitting(false);
      }
      return;
    }

    // 云端档案更新反馈
    try {
      const docRef = doc(db, "submissions", submissionId);
      await promiseWithTimeout(
        updateDoc(docRef, { feedback: feedbackPayload }),
        2500,
        "提交云端反馈超时"
      );
      setFeedbackSubmitted(true);
    } catch (err) {
      console.warn("提交反馈至云端超时或失败，已自动转存本地:", err);
      // 虽然失败了，但为了让用户感到连贯，仍展示成功，并尝试在本地记录中保留(如果是之后待同步)
      try {
        const raw = localStorage.getItem("pcos_unsynced_submissions");
        if (raw) {
          const unsynced: any[] = JSON.parse(raw);
          const updated = unsynced.map(record => {
            if (record.localId === submissionId) {
              return { ...record, feedback: feedbackPayload };
            }
            return record;
          });
          localStorage.setItem("pcos_unsynced_submissions", JSON.stringify(updated));
        }
      } catch (e) {
        console.error(e);
      }
      setFeedbackSubmitted(true);
    } finally {
      setIsFeedbackSubmitting(false);
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPin === "1234") {
      setViewState("admin");
      setShowAdminLogin(false);
      setAdminPin("");
      setAdminError("");
      fetchAdminRecords();
    } else {
      setAdminError("PIN 码错误，请重新输入");
    }
  };

  const handleAdminLogout = () => {
    setViewState("welcome");
    setAdminRecords([]);
    setSelectedRecord(null);
  };

  const fetchAdminRecords = async () => {
    setIsLoadingRecords(true);
    let fetched: any[] = [];
    try {
      // 1. 尝试以 3.5秒超时 获取云端记录，防卡死
      const q = query(collection(db, "submissions"), orderBy("createdAt", "desc"));
      const querySnapshot = await promiseWithTimeout(
        getDocs(q),
        3500,
        "加载云端记录超时"
      );
      querySnapshot.forEach((doc) => {
        fetched.push({ id: doc.id, ...doc.data() });
      });
    } catch (err) {
      console.error("加载云端记录失败或超时，展示本地记录:", err);
    }

    // 2. 获取本地缓存记录
    let localRecords: any[] = [];
    try {
      const raw = localStorage.getItem("pcos_unsynced_submissions");
      if (raw) {
        const unsyncedList = JSON.parse(raw);
        localRecords = unsyncedList.map((item: any) => ({
          id: item.localId,
          ...item,
          isLocalOnly: true
        }));
      }
    } catch (err) {
      console.error("加载本地缓存档案失败:", err);
    }

    // 3. 合并并按创建时间倒序排列
    const combined = [...localRecords, ...fetched];
    combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    setAdminRecords(combined);
    setIsLoadingRecords(false);
  };

  const deleteRecord = (id: string) => {
    setRecordToDelete(id);
  };

  const confirmDeleteRecord = async () => {
    if (!recordToDelete) return;
    try {
      if (recordToDelete.startsWith("local_")) {
        // 本地缓存直接删除
        const raw = localStorage.getItem("pcos_unsynced_submissions");
        if (raw) {
          const unsynced = JSON.parse(raw);
          const updated = unsynced.filter((r: any) => r.localId !== recordToDelete);
          localStorage.setItem("pcos_unsynced_submissions", JSON.stringify(updated));
          setUnsyncedCount(updated.length);
        }
        setAdminRecords(prev => prev.filter(r => r.id !== recordToDelete));
      } else {
        // 云端记录2.5秒超时删除
        await promiseWithTimeout(
          deleteDoc(doc(db, "submissions", recordToDelete)),
          2500,
          "删除云端记录超时"
        );
        setAdminRecords(prev => prev.filter(r => r.id !== recordToDelete));
      }
      if (selectedRecord?.id === recordToDelete) {
        setSelectedRecord(null);
      }
      setRecordToDelete(null);
    } catch (err) {
      console.error("删除记录失败:", err);
      setRecordToDelete(null);
    }
  };

  const toggleRotterdamOption = (key: keyof RotterdamAnswers) => {
    setRotterdamAnswers(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const calculateBmi = () => {
    const h = parseFloat(heightCm);
    const w = parseFloat(weightKg);
    if (!h || !w || h <= 0 || w <= 0) return;

    const heightM = h / 100;
    const bmi = w / (heightM * heightM);
    const roundedBmi = Math.round(bmi * 10) / 10;
    setCalculatedBmi(roundedBmi);

    const wc = parseFloat(waistCm);
    const isAbdominal = wc >= 80;

    let targetSel = 2; // Lean/Standard

    if (roundedBmi >= 24 || isAbdominal) {
      setBmiCategory(roundedBmi >= 28 ? "肥胖 (推荐选: 超重/肥胖)" : "超重 (推荐选: 超重/肥胖)");
      if (isAbdominal && roundedBmi < 24) {
        setBmiCategory("腹型肥胖 (推荐选: 超重/肥胖)");
      }
      targetSel = 1;
    } else {
      setBmiCategory(roundedBmi < 18.5 ? "偏瘦 (推荐选: 正常/偏瘦)" : "标准体重 (推荐选: 正常/偏瘦)");
      targetSel = 2;
    }

    setAnswers(prev => ({
      ...prev,
      q2: targetSel
    }));
  };

  const resetApp = () => {
    setViewState("welcome");
    setCurrentStep(0);
    setAnswers({ q1: null, q2: null, q3: null, q4: null });
    setRotterdamAnswers({
      hasMenstrualIssue: false,
      hasAndrogenIssue: false,
      hasUltrasoundIssue: false
    });
    setCalculatedBmi(null);
    setBmiCategory("");
    setHeightCm("");
    setWeightKg("");
    setWaistCm("");
    
    // Clear submission and feedback states
    setPatientName("");
    setPatientId("");
    setSubmissionId("");
    setFeedbackRating(0);
    setFeedbackComment("");
    setFeedbackSubmitted(false);

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Determine standard profile (Green/Yellow/Red medical data mapping)
  const getMatchedProfile = (): PCOSProfile => {
    const { q1, q2, q3, q4 } = answers;
    if (q1 === null || q2 === null || q3 === null || q4 === null) {
      return pcosData["1.1"];
    }

    if (q4 === 1) { // Pregnancy priority
      if (q1 === 3) {
        return q2 === 1 ? pcosData["3.2"] : pcosData["3.4"];
      } else {
        if (q2 === 1) {
          return q3 === 1 ? pcosData["2.2"] : pcosData["2.1"];
        } else {
          return q3 === 1 ? pcosData["2.4"] : pcosData["2.3"];
        }
      }
    } else { // Regulating/Metabolic scale
      if (q1 === 3) {
        return q2 === 1 ? pcosData["3.1"] : pcosData["3.3"];
      } else {
        if (q2 === 1) {
          return q3 === 1 ? pcosData["1.2"] : pcosData["1.1"];
        } else {
          return q3 === 1 ? pcosData["1.4"] : pcosData["1.3"];
        }
      }
    }
  };

  // Determine Rotterdam Phenotype (A, B, C, D, or Subclinical)
  const getMatchedRotterdamPhenotype = (): RotterdamPhenotype => {
    const { hasMenstrualIssue, hasAndrogenIssue, hasUltrasoundIssue } = rotterdamAnswers;
    
    // Check combinations
    if (hasMenstrualIssue && hasAndrogenIssue && hasUltrasoundIssue) {
      return rotterdamPhenotypes[0]; // A
    } else if (hasMenstrualIssue && hasAndrogenIssue && !hasUltrasoundIssue) {
      return rotterdamPhenotypes[1]; // B
    } else if (!hasMenstrualIssue && hasAndrogenIssue && hasUltrasoundIssue) {
      return rotterdamPhenotypes[2]; // C
    } else if (hasMenstrualIssue && !hasAndrogenIssue && hasUltrasoundIssue) {
      return rotterdamPhenotypes[3]; // D
    } else {
      return rotterdamPhenotypes[4]; // Subclinical/Pre-PCOS
    }
  };

  const matchedProfile = getMatchedProfile();
  const matchedRotterdam = getMatchedRotterdamPhenotype();
  const currentQuestion = currentStep > 0 ? questions[currentStep - 1] : null;

  const filteredRecords = adminRecords.filter(rec => {
    const nameMatch = (rec.patientName || "").toLowerCase().includes(searchTerm.toLowerCase());
    const idMatch = (rec.patientId || "").toLowerCase().includes(searchTerm.toLowerCase());
    const phenoMatch = filterPhenotype === "all" || (rec.matchedRotterdam?.code === filterPhenotype);
    return (nameMatch || idMatch) && phenoMatch;
  });

  return (
    <div className="antialiased font-sans flex flex-col min-h-screen selection:bg-rose-100 selection:text-watercolor-title pb-16 relative bg-[#fffdfa]/50">
      
      {/* Decorative leaf overlays */}
      <div className="absolute top-0 left-0 w-48 h-48 pointer-events-none opacity-45 z-0 no-print">
        <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none">
          <path d="M0 0 C25 15 45 35 60 70" stroke="#ebd9c8" strokeWidth="0.8" strokeDasharray="1 1"/>
          <path d="M15 15 C10 8 12 2 22 8 C30 13 22 18 15 15 Z" fill="#d1ead8" stroke="#782828" strokeWidth="0.3"/>
          <path d="M28 28 C23 20 25 14 35 20 C43 25 35 30 28 28 Z" fill="#eaf7ee" stroke="#782828" strokeWidth="0.3"/>
          <path d="M40 45 C35 37 37 31 47 37 C55 42 47 47 40 45 Z" fill="#d1ead8" stroke="#782828" strokeWidth="0.3"/>
        </svg>
      </div>
      <div className="absolute top-0 right-0 w-48 h-48 pointer-events-none opacity-40 z-0 no-print">
        <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none">
          <path d="M100 0 C75 15 55 35 40 70" stroke="#ebd9c8" strokeWidth="0.8" strokeDasharray="1 1"/>
          <path d="M85 15 C90 8 88 2 78 8 C70 13 78 18 85 15 Z" fill="#d1ead8" stroke="#782828" strokeWidth="0.3"/>
          <path d="M72 28 C77 20 75 14 65 20 C57 25 65 30 72 28 Z" fill="#eaf7ee" stroke="#782828" strokeWidth="0.3"/>
        </svg>
      </div>

      {/* Header */}
      <header className="bg-[#fffdf9]/80 backdrop-blur-md border-b border-watercolor-border/40 sticky top-0 z-40 shadow-xs no-print">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#fdf1f5] border border-[#fbdce2] rounded-xl text-watercolor-title shadow-xs">
              <Stethoscope size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <span className="font-bold font-serif text-watercolor-title tracking-tight block text-sm md:text-base">PCOS 循证表型分型与诊疗决策系统</span>
              <span className="text-[9px] md:text-[10px] text-watercolor-title/70 font-mono -mt-0.5 block">ROTTERDAM PHENOTYPES & EVIDENCE-BASED GUIDELINES</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {viewState === "admin" ? (
              <button
                onClick={handleAdminLogout}
                className="px-3 py-1.5 text-xs bg-watercolor-title hover:bg-[#8f3a3a] text-white border border-[#fbdce2] rounded-xl font-medium cursor-pointer flex items-center gap-1 shadow-xs transition-colors"
                id="admin-logout-btn"
              >
                <RotateCcw size={13} />
                <span>退出后台</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setShowAdminLogin(true);
                  setAdminError("");
                  setAdminPin("");
                }}
                className="p-2 bg-[#fdf1f5] hover:bg-[#fbdce2] text-watercolor-title border border-[#fbdce2] rounded-xl font-medium cursor-pointer flex items-center justify-center shadow-xs transition-all"
                title="管理后台"
                id="admin-path-btn"
              >
                <FolderLock size={15} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 pt-8 shrink-0 grow w-full relative z-10">
        <AnimatePresence mode="wait">
          
          {/* WELCOME VIEW */}
          {viewState === "welcome" && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              {/* Elegant Booklet Cover Header Layout */}
              <div className="bg-[#fffdf9]/90 rounded-3xl border border-watercolor-border/60 p-6 md:p-10 shadow-xs relative overflow-hidden flex flex-col md:flex-row gap-8 items-center">
                <div className="absolute top-0 right-0 w-80 h-80 bg-watercolor-pink-trans/30 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-watercolor-blue-trans/25 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>

                {/* Leaf branch decoration in bottom left corner */}
                <svg className="absolute bottom-0 left-0 w-24 h-24 opacity-30 pointer-events-none" viewBox="0 0 100 100" fill="none">
                  <path d="M0 100 C20 80 40 70 80 60" stroke="#782828" strokeWidth="1"/>
                  <path d="M15 85 C10 75 12 65 25 75 C35 82 25 88 15 85 Z" fill="#d1ead8" stroke="#782828" strokeWidth="0.5"/>
                  <path d="M35 75 C30 65 32 55 45 65 C55 72 45 78 35 75 Z" fill="#eaf7ee" stroke="#782828" strokeWidth="0.5"/>
                </svg>

                {/* Left Text Content */}
                <div className="relative space-y-5 md:w-3/5 order-2 md:order-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#fdf1f5] border border-[#fbdce2] rounded-full text-xs text-watercolor-title font-serif font-bold">
                    <Sparkles size={14} className="text-watercolor-title" />
                    <span>多囊卵巢综合征患者教育与双重评估平台</span>
                  </div>

                  <h1 className="text-3xl md:text-[2.6rem] lg:text-[3rem] font-bold text-watercolor-title tracking-tight leading-tight font-serif animate-fade-in" style={{ lineHeight: 1.15 }}>
                    PCOS 循证诊疗<br/>与生活方式决策系统
                  </h1>

                  <p className="text-base text-watercolor-title/95 font-serif font-bold tracking-wide -mt-2">
                    —— 筛查鹿特丹表型分型 · 配置精细化生活膳食与医学方案 ——
                  </p>

                  <p className="text-[#333333] font-normal leading-relaxed text-sm md:text-base">
                    您好！欢迎使用升级版 PCOS 循证自测系统。多囊（PCOS）在女性不同年龄与体质中表现迥异。国际主流医学指南一致强调：必须区分<strong>鹿特丹表型分型</strong>与<strong>个体化代谢风险</strong>，以此配置科学的“医学、膳食、运动与生活方式”综合处方，避免一概而论。
                  </p>

                  <p className="text-[#555555] text-xs md:text-sm font-medium leading-relaxed border-l-2 border-watercolor-title pl-3.5 bg-white/60 py-2 rounded-r-lg">
                    测评流程包含：<strong>① 鹿特丹分型自我排查</strong>（包含排卵、高雄表现、超声3项）+ <strong>② 生活代谢评估</strong>（包含困扰、BMI、血糖、备孕4问）。测评完成后，系统将一键为您生成融汇<strong>【鹿特丹表型与健康画像】</strong>、<strong>【一线医学方案（绿/黄/红避坑科普卡）】</strong>与<strong>【精细化膳食生活干预】</strong>的专属评估报告书。
                  </p>

                  <div className="pt-4">
                    <button
                      onClick={startEvaluation}
                      className="px-8 py-4 bg-watercolor-title hover:bg-[#8f3a3a] text-white font-serif font-bold rounded-2xl shadow-lg shadow-watercolor-title/15 hover:shadow-watercolor-title/25 transition-all flex items-center justify-center gap-2 group cursor-pointer text-base border border-watercolor-border/30 animate-pulse"
                      id="start-btn"
                    >
                      <span>进入分型与生活双向测评</span>
                      <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>

                {/* Right Image Container */}
                <div className="md:w-2/5 order-1 md:order-2 flex justify-center relative w-full">
                  <div className="absolute -top-4 -left-4 w-12 h-12 text-[#1e5631]/40 pointer-events-none">
                    <svg width="48" height="48" viewBox="0 0 100 100" fill="none">
                      <path d="M10 90 C20 60 40 40 90 10" stroke="#782828" strokeWidth="0.8"/>
                      <path d="M35 55 C30 45 32 35 45 45 C55 52 45 58 35 55 Z" fill="#d1ead8" stroke="#782828" strokeWidth="0.3"/>
                    </svg>
                  </div>
                  {/* Framed generated image representing "人体妇科解剖示意图柔和写实" */}
                  <div className="relative bg-white p-2.5 rounded-3xl shadow-md border border-watercolor-border/60 max-w-[280px] md:max-w-full overflow-hidden transform rotate-1 hover:rotate-0 transition-transform duration-300">
                    <img
                      src={imageSources[currentImgIndex]}
                      alt="PCOS 循证治疗知情辅助手册"
                      className="rounded-2xl object-cover w-full h-auto aspect-[3/4]"
                      referrerPolicy="no-referrer"
                      onError={() => {
                        if (currentImgIndex + 1 < imageSources.length) {
                          setCurrentImgIndex(currentImgIndex + 1);
                        }
                      }}
                    />
                    <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-xs p-3 rounded-xl border border-watercolor-border/40 text-center pointer-events-none">
                      <span className="block text-xs font-serif font-bold text-watercolor-title">PCOS 双向管理白皮书</span>
                      <span className="block text-[9px] text-[#555] font-sans mt-0.5">鹿特丹分型 · 膳食干预 · 循证医学</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Three columns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#fffdf9]/90 border border-watercolor-border/50 rounded-2xl p-5 shadow-xs flex items-center gap-4 relative overflow-hidden">
                  <div className="absolute -top-1 -right-1 opacity-20 pointer-events-none">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="8" fill="#fff" stroke="#782828" strokeWidth="0.5"/>
                      <circle cx="12" cy="12" r="2" fill="#fff9db"/>
                    </svg>
                  </div>
                  <div className="p-3 bg-[#fdf1f5] border border-[#fbdce2] rounded-xl text-watercolor-title shrink-0">
                    <Heart size={20} className="text-watercolor-title" />
                  </div>
                  <div>
                    <span className="block text-xs text-[#666666]">国际金标准</span>
                    <strong className="text-base font-serif font-bold text-watercolor-title block mt-0.5">鹿特丹诊断标准</strong>
                    <span className="text-[10px] text-[#888888]">多囊表型分型，治疗的前提</span>
                  </div>
                </div>

                <div className="bg-[#fffdf9]/90 border border-watercolor-border/50 rounded-2xl p-5 shadow-xs flex items-center gap-4 relative overflow-hidden">
                  <div className="p-3 bg-[#e5eef9] border border-[#cbdbe5] rounded-xl text-watercolor-title shrink-0">
                    <Activity size={20} className="text-watercolor-title" />
                  </div>
                  <div>
                    <span className="block text-xs text-[#666666]">代谢干预率</span>
                    <strong className="text-base font-serif font-bold text-watercolor-title block mt-0.5">生活重塑占 80%</strong>
                    <span className="text-[10px] text-[#888888]">精细化膳食对调理排卵具有决定权</span>
                  </div>
                </div>

                <div className="bg-[#fffdf9]/90 border border-watercolor-border/50 rounded-2xl p-5 shadow-xs flex items-center gap-4 relative overflow-hidden">
                  <div className="p-3 bg-[#eaf7ee] border border-[#d1ead8] rounded-xl text-[#1e5631] shrink-0">
                    <Sparkles size={20} className="text-[#1e5631]" />
                  </div>
                  <div>
                    <span className="block text-xs text-[#666666]">双向健康画像</span>
                    <strong className="text-base font-serif font-bold text-watercolor-title block mt-0.5">表型与代谢双维度</strong>
                    <span className="text-[10px] text-[#888888]">同时评估鹿特丹分型与生活治疗卡</span>
                  </div>
                </div>
              </div>

              {/* FAQs accordion list */}
              <div className="bg-[#fffdf9]/95 rounded-3xl border border-watercolor-border/60 p-6 md:p-8 shadow-xs space-y-6 relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-watercolor-pink-trans/30 rounded-full blur-2xl pointer-events-none"></div>

                <div className="flex gap-3 items-center relative z-10">
                  <div className="p-2 bg-[#fdf1f5] border border-[#fbdce2] text-watercolor-title rounded-lg shrink-0">
                    <Stethoscope size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg md:text-2xl font-serif font-bold text-watercolor-title">PCOS 姐妹高频科普解惑与真伪指南</h2>
                    <p className="text-xs text-[#666666] mt-0.5">循证医学权威解读，拒绝市面伪科学概念与消费陷阱</p>
                  </div>
                </div>

                <div className="space-y-3 relative z-10" id="faqs-list">
                  {faqs.map((faq, idx) => {
                    const isOpen = activeFaq === idx;
                    return (
                      <div key={idx} className="border border-watercolor-border/30 rounded-2xl overflow-hidden" id={`faq-${idx}`}>
                        <button
                          onClick={() => setActiveFaq(isOpen ? null : idx)}
                          className="w-full text-left p-4 bg-watercolor-pink-trans/35 hover:bg-watercolor-pink-trans/55 flex justify-between items-center gap-4 transition-colors cursor-pointer"
                        >
                          <span className="font-bold font-serif text-sm md:text-base text-watercolor-body flex items-start gap-2">
                            <span className="text-xs bg-watercolor-highlight text-watercolor-title border border-watercolor-border/40 px-2 py-0.5 rounded font-serif font-bold mt-0.5 shrink-0">
                              疑问 {idx + 1}
                            </span>
                            <span>{faq.q}</span>
                          </span>
                          <span className="p-1 bg-white border border-watercolor-border/30 rounded text-[#782828] shrink-0">
                            {isOpen ? <Minus size={14} className="stroke-[2.5]" /> : <Plus size={14} className="stroke-[2.5]" />}
                          </span>
                        </button>
                        
                        <AnimatePresence>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden bg-white border-t border-watercolor-border/20"
                            >
                              <p className="p-4 text-xs md:text-sm text-[#444444] leading-relaxed font-sans">
                                {faq.a}
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-[#eaf7ee]/75 border border-[#d1ead8] rounded-2xl p-4 text-center">
                <p className="text-xs text-[#1e5631] font-medium font-sans">
                  🌱 祝愿每一名深受多囊困扰的姐妹，都能掌握自己身体的律动和激素的秘密。
                </p>
              </div>
            </motion.div>
          )}

          {/* EVALUATING WIZARD VIEW */}
          {viewState === "evaluating" && (
            <motion.div
              key="evaluating"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="max-w-2xl mx-auto"
            >
              {/* Step Header */}
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {currentStep > 0 && (
                    <button
                      onClick={prevStep}
                      className="px-3 py-1.5 text-xs flex items-center gap-1 text-watercolor-body hover:text-watercolor-title bg-white/80 hover:bg-[#fdf1f5] border border-watercolor-border/50 rounded-xl transition-colors shadow-xs cursor-pointer"
                    >
                      <ChevronLeft size={14} />
                      <span>上一步</span>
                    </button>
                  )}
                  <span className="text-xs font-serif font-bold text-watercolor-title bg-[#fdf1f5] border border-[#fbdce2] px-2.5 py-1 rounded-full">
                    {currentStep === 0 ? "第一阶段：鹿特丹表型筛查" : `第二阶段：个人诉求问答 ${currentStep} / 4`}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-[#555555] font-medium font-sans">
                    评估进度 {Math.round((currentStep / 4) * 100)}%
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-[#cbdbe5]/30 h-2.5 rounded-full mb-8 overflow-hidden border border-watercolor-border/30">
                <div
                  className="bg-gradient-to-r from-[#fbdce2] to-[#cbdbe5] h-full transition-all duration-300 border-r border-[#ebd9c8]"
                  style={{ width: `${(currentStep / 4) * 100}%` }}
                ></div>
              </div>

              {/* ROTTERDAM SCREENING STEP (Step 0) */}
              {currentStep === 0 ? (
                <div className="bg-[#fffdf9]/95 rounded-3xl border border-watercolor-border/60 p-6 md:p-8 shadow-xs relative overflow-hidden space-y-6" id="rotterdam-step">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-watercolor-pink-trans/20 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>

                  <div className="flex gap-3 items-start">
                    <div className="p-2.5 bg-[#fdf1f5] border border-[#fbdce2] text-watercolor-title rounded-xl shrink-0 mt-1">
                      <Stethoscope size={20} />
                    </div>
                    <div>
                      <h2 className="text-xl font-serif font-bold text-watercolor-title leading-snug">
                        第一部分：鹿特丹标准自我排查 (核心三项指标)
                      </h2>
                      <p className="text-[10px] text-[#666666] mt-1 font-mono tracking-wider">
                        ROTTERDAM CRITERIA SCREENING · 多选排查
                      </p>
                    </div>
                  </div>

                  <div className="bg-[#e5eef9]/60 border border-watercolor-border/50 rounded-2xl p-4">
                    <div className="flex gap-2 items-start text-xs leading-relaxed text-[#333333]">
                      <AlertCircle size={15} className="text-watercolor-title mt-0.5 shrink-0" />
                      <div>
                        <strong>诊断判定规则 (Rotterdam 2003)：</strong>
                        多囊诊断需<strong>满足以下 3 项中的至少 2 项</strong>，并排除其他导致高雄激素和排卵异常的疾病。请点击勾选符合您实际身体状况的指标。
                      </div>
                    </div>
                  </div>

                  {/* Criteria Selectors */}
                  <div className="space-y-4">
                    <button
                      onClick={() => toggleRotterdamOption("hasMenstrualIssue")}
                      className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-4 cursor-pointer focus:outline-none ${
                        rotterdamAnswers.hasMenstrualIssue
                          ? "bg-[#fdf1f5]/85 border-[#782828] shadow-xs"
                          : "bg-white border-watercolor-border/40 hover:border-[#782828]/40 hover:bg-[#fffdf9]/50"
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-lg border shrink-0 flex items-center justify-center mt-0.5 ${
                        rotterdamAnswers.hasMenstrualIssue ? "bg-watercolor-title border-watercolor-title text-white" : "border-watercolor-border/60 bg-white"
                      }`}>
                        {rotterdamAnswers.hasMenstrualIssue && "✓"}
                      </div>
                      <div>
                        <strong className="block text-sm md:text-base text-watercolor-body font-serif font-bold">
                          指标 A：稀发排卵或无排卵 (月经状况不调)
                        </strong>
                        <span className="block text-xs md:text-sm text-[#555555] mt-1 leading-relaxed">
                          主要表现为月经稀发（周期 &gt; 35天或一年中大姨妈次数少于8次）、频发（周期 &lt; 21天）、闭经（停经超过6个月）或完全没有排卵迹象。
                        </span>
                      </div>
                    </button>

                    <button
                      onClick={() => toggleRotterdamOption("hasAndrogenIssue")}
                      className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-4 cursor-pointer focus:outline-none ${
                        rotterdamAnswers.hasAndrogenIssue
                          ? "bg-[#fdf1f5]/85 border-[#782828] shadow-xs"
                          : "bg-white border-watercolor-border/40 hover:border-[#782828]/40 hover:bg-[#fffdf9]/50"
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-lg border shrink-0 flex items-center justify-center mt-0.5 ${
                        rotterdamAnswers.hasAndrogenIssue ? "bg-watercolor-title border-watercolor-title text-white" : "border-watercolor-border/60 bg-white"
                      }`}>
                        {rotterdamAnswers.hasAndrogenIssue && "✓"}
                      </div>
                      <div>
                        <strong className="block text-sm md:text-base text-watercolor-body font-serif font-bold">
                          指标 B：高雄激素表现 (临床症状或血清生化)
                        </strong>
                        <span className="block text-xs md:text-sm text-[#555555] mt-1 leading-relaxed">
                          临床高雄表现如顽固性的面部/后背出油爆痘、下巴/腹股沟体毛明显增粗浓密、发际线后移脱发；或医院抽血报告单中总睾酮、游离睾酮或DHEAS异常升高。
                        </span>
                      </div>
                    </button>

                    <button
                      onClick={() => toggleRotterdamOption("hasUltrasoundIssue")}
                      className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-4 cursor-pointer focus:outline-none ${
                        rotterdamAnswers.hasUltrasoundIssue
                          ? "bg-[#fdf1f5]/85 border-[#782828] shadow-xs"
                          : "bg-white border-watercolor-border/40 hover:border-[#782828]/40 hover:bg-[#fffdf9]/50"
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-lg border shrink-0 flex items-center justify-center mt-0.5 ${
                        rotterdamAnswers.hasUltrasoundIssue ? "bg-watercolor-title border-watercolor-title text-white" : "border-watercolor-border/60 bg-white"
                      }`}>
                        {rotterdamAnswers.hasUltrasoundIssue && "✓"}
                      </div>
                      <div>
                        <strong className="block text-sm md:text-base text-watercolor-body font-serif font-bold">
                          指标 C：卵巢多囊样改变 (阴道或直肠B超外观)
                        </strong>
                        <span className="block text-xs md:text-sm text-[#555555] mt-1 leading-relaxed">
                          B超单诊断提示卵巢增大（体积 &gt; 10ml），或提示一侧或双侧卵巢中，直径 2-9mm 的窦卵泡数量达到 12 个或以上。
                        </span>
                      </div>
                    </button>
                  </div>

                  {/* Live Phenotype Preview Box */}
                  <div className="bg-[#eaf7ee]/70 border border-[#d1ead8] rounded-2xl p-5">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div>
                        <span className="inline-flex items-center gap-1 text-[10px] bg-[#d1ead8] text-[#1e5631] font-serif font-bold px-2 py-0.5 rounded border border-[#a3d8b4]">
                          <TrendingUp size={10} /> 实时表型预测
                        </span>
                        <h4 className="text-base font-serif font-bold text-watercolor-title mt-1.5">
                          预测分型：<span className="text-[#1e5631] font-black">{matchedRotterdam.name}</span>
                        </h4>
                        <p className="text-xs text-[#555555] mt-1 leading-relaxed">
                          {matchedRotterdam.definition}
                        </p>
                      </div>
                      <div className="shrink-0">
                        <span className="text-3xl font-black font-mono text-[#1e5631] border-2 border-dashed border-[#1e5631]/40 rounded-full w-14 h-14 flex items-center justify-center bg-white shadow-xs">
                          {matchedRotterdam.code === "Subclinical" ? "疑似" : matchedRotterdam.code}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Navigation Footer */}
                  <div className="pt-4 flex justify-end">
                    <button
                      onClick={nextStep}
                      className="px-6 py-3 bg-watercolor-title hover:bg-[#8f3a3a] text-white font-serif font-bold rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer transition-colors"
                      id="next-btn-0"
                    >
                      <span>进入第二阶段测评 (4个临床问题)</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                /* METABOLIC AND LIFESTYLE QUESTIONS (Step 1-4) */
                <div className="bg-[#fffdf9]/95 rounded-3xl border border-watercolor-border/60 p-6 md:p-8 shadow-xs relative overflow-hidden" id={`step-${currentStep}`}>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-watercolor-pink-trans/20 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>

                  <div className="flex gap-3 items-start mb-4">
                    <div className="p-2.5 bg-[#fdf1f5] border border-[#fbdce2] text-watercolor-title rounded-xl shrink-0 mt-1">
                      <Activity size={20} className="text-watercolor-title" />
                    </div>
                    <div>
                      <h2 className="text-xl font-serif font-bold text-watercolor-title leading-snug">
                        {currentQuestion?.text}
                      </h2>
                      <p className="text-[10px] text-[#666666] mt-1 font-mono tracking-wider">
                        QUESTION {currentStep} OF 4 · 单项选择
                      </p>
                    </div>
                  </div>

                  {/* Judgement Standard */}
                  <div className="bg-[#e5eef9]/60 border border-watercolor-border/50 rounded-2xl p-5 mb-6 relative overflow-hidden">
                    <div className="absolute -bottom-6 -right-6 opacity-15 pointer-events-none text-[#ebd9c8]">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 8v8M8 12h8"/>
                      </svg>
                    </div>
                    <div className="flex gap-2.5 items-start text-[#333333] relative z-10">
                      <AlertCircle size={16} className="text-watercolor-title mt-0.5 shrink-0" />
                      <div className="text-xs md:text-sm leading-relaxed font-sans">
                        <span className="font-serif font-bold text-[#782828] bg-watercolor-highlight px-1.5 py-0.5 rounded mr-1">
                          如何自我判断
                        </span>
                        <span>{currentQuestion?.judgementStandard}</span>
                      </div>
                    </div>
                  </div>

                  {/* BMI Calculator (On Step 2, index=2 in 5-step flow) */}
                  {currentStep === 2 && (
                    <div className="mb-6">
                      <button
                        onClick={() => setShowBmiCalc(!showBmiCalc)}
                        className="w-full py-2.5 px-4 bg-watercolor-pink-trans/35 border border-watercolor-border/40 rounded-xl text-watercolor-title hover:bg-watercolor-pink-trans/55 text-xs font-serif font-bold flex items-center justify-center gap-2 transition-all shadow-inner cursor-pointer"
                      >
                        <Calculator size={14} />
                        <span>身边的 BMI 智能计算助手 (点击展开/折叠)</span>
                      </button>

                      <AnimatePresence>
                        {showBmiCalc && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden bg-white/60 border-x border-b border-watercolor-border/40 rounded-b-xl p-5 mt-1"
                          >
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-xs text-[#555555] mb-1 font-medium font-sans">身高 (厘米)</label>
                                <input
                                  type="number"
                                  placeholder="如 160"
                                  value={heightCm}
                                  onChange={(e) => setHeightCm(e.target.value)}
                                  className="w-full bg-white border border-watercolor-border/40 rounded-lg p-2 text-sm focus:border-watercolor-title/60 focus:outline-none font-mono text-[#333333]"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-[#555555] mb-1 font-medium font-sans">体重 (公斤)</label>
                                <input
                                  type="number"
                                  placeholder="如 55"
                                  value={weightKg}
                                  onChange={(e) => setWeightKg(e.target.value)}
                                  className="w-full bg-white border border-watercolor-border/40 rounded-lg p-2 text-sm focus:border-watercolor-title/60 focus:outline-none font-mono text-[#333333]"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-[#555555] mb-1 font-medium font-sans">女性腰围 (厘米 · 可选)</label>
                                <input
                                  type="number"
                                  placeholder="如 78"
                                  value={waistCm}
                                  onChange={(e) => setWaistCm(e.target.value)}
                                  className="w-full bg-white border border-watercolor-border/40 rounded-lg p-2 text-sm focus:border-watercolor-title/60 focus:outline-none font-mono text-[#333333]"
                                />
                              </div>
                            </div>
                            
                            <div className="flex flex-wrap justify-between items-center gap-3 mt-4 border-t border-watercolor-border/20 pt-3">
                              <button
                                onClick={calculateBmi}
                                className="px-4 py-1.5 bg-watercolor-title hover:bg-[#8f3a3a] text-white rounded-lg text-xs font-serif font-bold transition shadow-xs cursor-pointer"
                              >
                                计算健康指标并预填体重
                              </button>
                              {calculatedBmi !== null && (
                                <div className="text-right">
                                  <span className="text-xs text-[#555555] mr-2">
                                    BMI: <strong className="font-mono text-watercolor-title">{calculatedBmi}</strong>
                                  </span>
                                  <span className="text-xs px-2.5 py-0.5 bg-watercolor-highlight border border-[#ebd9c8] text-watercolor-title rounded-full font-serif font-bold shadow-xs">
                                    {bmiCategory}
                                  </span>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Options List */}
                  <div className="space-y-4">
                    {currentQuestion?.options.map((opt) => {
                      const isSelected = answers[currentQuestion.id] === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => selectOption(opt.value)}
                          className={`w-full text-left p-4 md:p-5 rounded-2xl border transition-all duration-200 flex items-start gap-4 cursor-pointer focus:outline-none ${
                            isSelected
                              ? "bg-[#fdf1f5]/85 border-[#782828] ring-2 ring-[#782828]/10 shadow-xs"
                              : "bg-white border-watercolor-border/40 hover:border-[#782828]/40 hover:bg-[#fffdf9]/50"
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-full border shrink-0 flex items-center justify-center mt-0.5 ${
                              isSelected ? "border-watercolor-title bg-watercolor-title" : "border-watercolor-border/60 bg-white"
                            }`}
                          >
                            {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full"></div>}
                          </div>
                          <div className="grow">
                            <p
                              className={`font-serif font-bold text-sm md:text-base ${
                                isSelected ? "text-[#782828]" : "text-watercolor-body"
                              }`}
                            >
                              {opt.label}
                            </p>
                            <p className="text-xs md:text-sm text-[#555555] mt-1 leading-relaxed">
                              {opt.desc}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <p className="text-center text-xs text-[#666666] mt-6 leading-relaxed font-sans">
                温馨提示：本自测基于国内外临床诊疗推荐，非直接开具药方或绝对医学判定，请结合线下复诊获取针对性诊断。
              </p>
            </motion.div>
          )}

          {/* PATIENT INFO INTERMEDIATE SCREEN */}
          {viewState === "patient-info" && (
            <motion.div
              key="patient-info"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="max-w-md mx-auto"
            >
              <div className="bg-[#fffdf9]/95 rounded-3xl border border-watercolor-border/60 p-6 md:p-8 shadow-xs relative overflow-hidden space-y-6">
                <div className="absolute top-0 right-0 w-32 h-32 bg-watercolor-pink-trans/20 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>

                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-[#fdf1f5] border border-[#fbdce2] text-watercolor-title rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                    <User size={24} className="stroke-[2]" />
                  </div>
                  <h2 className="text-xl font-serif font-bold text-watercolor-title">生成并保存您的健康档案</h2>
                  <p className="text-xs text-[#666666] max-w-xs mx-auto leading-relaxed">
                    为了在医生后台生成您的病程档案，并使门诊医生能够调阅您的自测表型数据，请填写您的姓名与编号（支持使用化名）。
                  </p>
                </div>

                <form onSubmit={submitPatientData} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[#555555] mb-1">
                      1. 您的称呼 / 姓名 (必填，支持匿名/化名)
                    </label>
                    <input
                      type="text"
                      required
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder="如：张女士 或 匿名"
                      className="w-full bg-white border border-watercolor-border/40 rounded-xl p-3 text-sm focus:border-watercolor-title/60 focus:outline-none text-[#333333] placeholder-[#999999]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#555555] mb-1">
                      2. 病案号 / 诊疗ID (可选，用于医生核对信息)
                    </label>
                    <input
                      type="text"
                      value={patientId}
                      onChange={(e) => setPatientId(e.target.value)}
                      placeholder="如门诊登记的病历号或编号，也可不填"
                      className="w-full bg-white border border-watercolor-border/40 rounded-xl p-3 text-sm focus:border-watercolor-title/60 focus:outline-none text-[#333333] placeholder-[#999999]"
                    />
                  </div>

                  <div className="bg-[#e5eef9]/60 border border-watercolor-border/30 rounded-xl p-3 text-[11px] text-[#444444] leading-relaxed flex gap-2 items-start">
                    <ShieldCheck size={16} className="text-watercolor-title shrink-0 mt-0.5" />
                    <span>
                      <strong>隐私安全保护：</strong>
                      所有数据将保存在医院临床私有云中，仅供授权医生及科研人员作病情评估与疗效改善参考，不会对外公开或泄露给第三方。
                    </span>
                  </div>

                  <div className="pt-2 flex flex-col gap-3">
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          submitPatientData(undefined, "匿名患者", "未提供");
                        }}
                        className="w-1/3 py-3 border border-watercolor-border/50 text-watercolor-body hover:bg-[#faf6f0] rounded-xl text-xs font-serif font-bold transition-all cursor-pointer text-center"
                      >
                        跳过直接看结果
                      </button>
                      
                      <button
                        type="submit"
                        disabled={!patientName.trim() || isSubmitting}
                        className="w-2/3 py-3 bg-watercolor-title text-white hover:bg-[#8f3a3a] rounded-xl text-xs font-serif font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw size={14} className="animate-spin" />
                            <span>正在保存档案...</span>
                          </>
                        ) : (
                          <>
                            <span>保存并生成评估报告</span>
                            <ChevronRight size={14} />
                          </>
                        )}
                      </button>
                    </div>

                    {submitError && (
                      <p className="text-[10px] text-red-600 font-sans font-bold pt-1 text-center">
                        ⚠️ 提交异常（已自动启用本地缓存模式）：{submitError}
                      </p>
                    )}
                  </div>
                </form>
              </div>
            </motion.div>
          )}

          {/* RESULT PROFILE VIEW */}
          {viewState === "result" && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="max-w-3xl mx-auto space-y-8"
              id="result-panel"
            >
              {/* Header Utility Panel */}
              <div className="flex justify-between items-center no-print">
                <button
                  onClick={resetApp}
                  className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-[#fffdf9] text-watercolor-body border border-watercolor-border/50 rounded-xl text-sm font-medium transition-all shadow-xs cursor-pointer"
                >
                  <RotateCcw size={16} />
                  <span>重新录入进行评估</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-4 py-2 bg-watercolor-title hover:bg-[#8f3a3a] text-white rounded-xl text-sm font-semibold transition-all shadow-xs border border-watercolor-border/30 cursor-pointer"
                >
                  <Printer size={16} />
                  <span>保存自测报告/打印</span>
                </button>
              </div>
              
              {/* 同步状态栏 */}
              {unsyncedCount > 0 && (
                <div className="bg-[#fffdf9] border-2 border-dashed border-[#ebd9c8] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs no-print text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-[#fdf1f5] text-watercolor-title rounded-xl flex items-center justify-center shrink-0">
                      <Activity size={18} className="animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-xs font-serif font-bold text-watercolor-title">部分自测档案未同步至云端后台</h4>
                      <p className="text-[10px] text-[#666666] leading-relaxed mt-0.5">
                        受当前手机网络环境限制，有 <strong>{unsyncedCount}</strong> 份记录已安全暂存在本地。网络正常后可点击重试同步。
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={syncUnsyncedSubmissions}
                    disabled={isSyncing}
                    className="px-4 py-2 bg-watercolor-title text-white hover:bg-[#8f3a3a] disabled:bg-gray-400 rounded-xl text-xs font-serif font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    {isSyncing ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>正在同步...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw size={14} />
                        <span>手动重试云端同步</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Combined Master Profile Hero Card */}
              <div className="bg-gradient-to-br from-[#fbdce2] to-[#cbdbe5] border border-watercolor-border/70 rounded-3xl p-6 md:p-8 text-watercolor-body relative overflow-hidden shadow-xs">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#fffdf9]/20 rounded-full blur-2xl -ml-16 -mb-16 pointer-events-none"></div>

                <div className="absolute top-4 right-4 opacity-15 pointer-events-none">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#782828" strokeWidth="1">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 2a15 15 0 0 1 0 20M2 12a15 15 0 0 1 20 0" />
                  </svg>
                </div>

                <div className="relative space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      <span className="text-[10px] bg-white/80 text-watercolor-title border border-watercolor-border/50 px-2.5 py-0.5 rounded font-mono font-black tracking-wider">
                        ROTTERDAM: {matchedRotterdam.code}
                      </span>
                      <span className="text-[10px] bg-white/80 text-watercolor-title border border-watercolor-border/50 px-2.5 py-0.5 rounded font-mono font-black tracking-wider">
                        METABOLIC PROFILE: {matchedProfile.id}
                      </span>
                      {submissionId.startsWith("local_") ? (
                        <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200/60 px-2.5 py-0.5 rounded font-serif font-bold tracking-wider flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                          本地暂存 (待同步)
                        </span>
                      ) : (
                        <span className="text-[10px] bg-emerald-50/90 text-emerald-700 border border-emerald-200/60 px-2.5 py-0.5 rounded font-serif font-bold tracking-wider flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#1e5631]"></span>
                          云端同步 (已连接)
                        </span>
                      )}
                    </div>
                    {(matchedProfile.id.startsWith("2") || matchedProfile.id === "3.2" || matchedProfile.id === "3.4") && (
                      <span className="text-xs bg-[#fdf1f5] text-watercolor-title border border-watercolor-border/40 px-3 py-1 rounded-full font-serif font-bold flex items-center gap-1.5 shadow-xs">
                        👶 备孕受孕黄金期
                      </span>
                    )}
                  </div>

                  {/* Main Title combining Rotterdam and Metabolic */}
                  <div>
                    <span className="text-xs font-bold text-[#782828] uppercase tracking-widest font-mono">
                      双向系统临床自测报告书
                    </span>
                    <h1 className="text-2xl md:text-3.5xl font-serif font-bold text-watercolor-title tracking-tight leading-snug mt-1">
                      您的表型诊断：{matchedRotterdam.name}
                    </h1>
                    <p className="text-xs md:text-sm text-[#782828] font-serif font-medium mt-1">
                      代谢伴随状态：{matchedProfile.title}
                    </p>
                  </div>

                  {/* Sub Badges Panel */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-4 border-t border-watercolor-border/40">
                    <div className="bg-white/70 border border-[#ebd9c8]/50 p-3 rounded-2xl shadow-xs">
                      <span className="block text-[10px] text-[#666666] font-sans font-semibold">主要困扰</span>
                      <strong className="text-xs md:text-sm font-serif font-bold text-watercolor-title block truncate mt-0.5">
                        {matchedProfile.concernText}
                      </strong>
                    </div>
                    <div className="bg-white/70 border border-[#ebd9c8]/50 p-3 rounded-2xl shadow-xs">
                      <span className="block text-[10px] text-[#666666] font-sans font-semibold">体重状况</span>
                      <strong className="text-xs md:text-sm font-serif font-bold text-watercolor-title block truncate mt-0.5">
                        {matchedProfile.weightText}
                      </strong>
                    </div>
                    <div className="bg-white/70 border border-[#ebd9c8]/50 p-3 rounded-2xl shadow-xs">
                      <span className="block text-[10px] text-[#666666] font-sans font-semibold">血糖状况</span>
                      <strong className="text-xs md:text-sm font-serif font-bold text-watercolor-title block truncate mt-0.5">
                        {matchedProfile.glycemicText}
                      </strong>
                    </div>
                    <div className="bg-white/70 border border-[#ebd9c8]/50 p-3 rounded-2xl shadow-xs">
                      <span className="block text-[10px] text-[#666666] font-sans font-semibold">备孕意向</span>
                      <strong className="text-xs md:text-sm font-serif font-bold text-watercolor-title block truncate mt-0.5">
                        {matchedProfile.pregnancyText}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* THREE-TAB NAVIGATION PANEL (HIDES IN PRINT LAYER) */}
              <div className="flex border-b border-watercolor-border/40 pb-px gap-2 overflow-x-auto no-print scrollbar-none" id="tabs-nav">
                <button
                  onClick={() => setActiveTab("portrait")}
                  className={`px-5 py-3 rounded-t-xl text-xs md:text-sm font-serif font-bold transition-all relative shrink-0 cursor-pointer ${
                    activeTab === "portrait"
                      ? "text-watercolor-title bg-[#fffdf9] border-t border-x border-watercolor-border/40 shadow-xs"
                      : "text-watercolor-body/70 hover:text-watercolor-title hover:bg-watercolor-pink-trans/10"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Award size={15} />
                    鹿特丹表型与健康画像
                  </span>
                  {activeTab === "portrait" && (
                    <motion.div
                      layoutId="active-tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-watercolor-title"
                    />
                  )}
                </button>

                <button
                  onClick={() => setActiveTab("medical")}
                  className={`px-5 py-3 rounded-t-xl text-xs md:text-sm font-serif font-bold transition-all relative shrink-0 cursor-pointer ${
                    activeTab === "medical"
                      ? "text-watercolor-title bg-[#fffdf9] border-t border-x border-watercolor-border/40 shadow-xs"
                      : "text-watercolor-body/70 hover:text-watercolor-title hover:bg-watercolor-pink-trans/10"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Stethoscope size={15} />
                    指南循证医学调经治疗卡
                  </span>
                  {activeTab === "medical" && (
                    <motion.div
                      layoutId="active-tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-watercolor-title"
                    />
                  )}
                </button>

                <button
                  onClick={() => setActiveTab("lifestyle")}
                  className={`px-5 py-3 rounded-t-xl text-xs md:text-sm font-serif font-bold transition-all relative shrink-0 cursor-pointer ${
                    activeTab === "lifestyle"
                      ? "text-watercolor-title bg-[#fffdf9] border-t border-x border-watercolor-border/40 shadow-xs"
                      : "text-watercolor-body/70 hover:text-watercolor-title hover:bg-watercolor-pink-trans/10"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Apple size={15} />
                    精细化饮食与运动生活方案
                  </span>
                  {activeTab === "lifestyle" && (
                    <motion.div
                      layoutId="active-tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-watercolor-title"
                    />
                  )}
                </button>
              </div>

              {/* TABS CONTAINER */}
              <div className="bg-transparent space-y-8">
                
                {/* TAB 1: PORTRAIT & CLINICAL PICTURE */}
                {(activeTab === "portrait" || typeof window === "undefined") && (
                  <div className={`${activeTab !== "portrait" ? "hidden print:block" : "block"} space-y-6`} id="tab-portrait">
                    <div className="bg-[#fffdf9]/95 rounded-3xl border border-watercolor-border/60 p-6 md:p-8 shadow-xs space-y-6">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-[#fdf1f5] border border-[#fbdce2] text-watercolor-title rounded-xl shrink-0">
                          <Award size={20} />
                        </div>
                        <div>
                          <h3 className="text-base md:text-lg font-serif font-bold text-watercolor-title">
                            🏆 鹿特丹表型诊断报告（{matchedRotterdam.englishName}）
                          </h3>
                          <p className="text-[10px] text-[#666] font-mono mt-0.5">ROTTERDAM PHENOTYPE DEFINITION & DIAGNOSTIC REVELATION</p>
                        </div>
                      </div>

                      <div className="p-5 bg-white border border-watercolor-border/30 rounded-2xl space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-watercolor-border/20 pb-4">
                          <div>
                            <span className="text-[10px] text-[#777] block">临床诊断标准依据</span>
                            <span className="text-xs md:text-sm font-serif font-bold text-watercolor-title block mt-1">
                              {matchedRotterdam.clinicalCriteria}
                            </span>
                          </div>
                          <div className="md:col-span-2">
                            <span className="text-[10px] text-[#777] block">分型定义说明</span>
                            <span className="text-xs md:text-sm text-[#333] block mt-1 leading-relaxed">
                              {matchedRotterdam.definition}
                            </span>
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] text-[#777] block mb-2">核心临床体征与倾向</span>
                          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs md:text-sm text-[#444] leading-relaxed">
                            {matchedRotterdam.characteristics.map((c, i) => (
                              <li key={i} className="flex gap-2 items-start bg-[#fffdf9] p-2.5 border border-watercolor-border/20 rounded-xl">
                                <span className="text-[#782828] font-bold shrink-0">✦</span>
                                <span>{c}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Bento grid health portrait */}
                      <div>
                        <h4 className="text-sm font-serif font-bold text-watercolor-title mb-4 flex items-center gap-1.5">
                          <span>📊 深度多维健康画像 (身体指数评价)</span>
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Hormone */}
                          <div className="bg-[#fdf1f5]/55 border border-[#fbdce2]/60 rounded-2xl p-5 relative overflow-hidden">
                            <div className="absolute top-2 right-2 opacity-5 pointer-events-none">
                              <Activity size={48} className="text-watercolor-title" />
                            </div>
                            <strong className="block text-xs md:text-sm text-watercolor-title font-serif font-bold">1. 激素与内分泌特征</strong>
                            <p className="text-xs md:text-sm text-[#444] mt-2 leading-relaxed">
                              {matchedRotterdam.healthPortrait.hormoneFeature}
                            </p>
                          </div>

                          {/* Metabolic */}
                          <div className="bg-[#e5eef9]/55 border border-[#cbdbe5]/60 rounded-2xl p-5 relative overflow-hidden">
                            <div className="absolute top-2 right-2 opacity-5 pointer-events-none">
                              <TrendingUp size={48} className="text-watercolor-title" />
                            </div>
                            <strong className="block text-xs md:text-sm text-[#1e40af] font-serif font-bold">2. 长远血管与代谢风险</strong>
                            <p className="text-xs md:text-sm text-[#444] mt-2 leading-relaxed">
                              {matchedRotterdam.healthPortrait.metabolicRisk}
                            </p>
                          </div>

                          {/* Follicle */}
                          <div className="bg-[#eaf7ee]/55 border border-[#d1ead8]/60 rounded-2xl p-5 relative overflow-hidden">
                            <div className="absolute top-2 right-2 opacity-5 pointer-events-none">
                              <Heart size={48} className="text-watercolor-title" />
                            </div>
                            <strong className="block text-xs md:text-sm text-[#1e5631] font-serif font-bold">3. 卵泡储备与发育质量</strong>
                            <p className="text-xs md:text-sm text-[#444] mt-2 leading-relaxed">
                              {matchedRotterdam.healthPortrait.follicleQuality}
                            </p>
                          </div>

                          {/* Mind */}
                          <div className="bg-[#faf6f0]/60 border border-[#ebd9c8]/60 rounded-2xl p-5 relative overflow-hidden">
                            <div className="absolute top-2 right-2 opacity-5 pointer-events-none">
                              <Moon size={48} className="text-watercolor-title" />
                            </div>
                            <strong className="block text-xs md:text-sm text-[#92400e] font-serif font-bold">4. 神经、精力与压力感受</strong>
                            <p className="text-xs md:text-sm text-[#444] mt-2 leading-relaxed">
                              {matchedRotterdam.healthPortrait.mindEnergy}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: MEDICAL RECOMMENDATIONS (GREEN/YELLOW/RED) */}
                {(activeTab === "medical" || typeof window === "undefined") && (
                  <div className={`${activeTab !== "medical" ? "hidden print:block" : "block"} space-y-6`} id="tab-medical">
                    {/* 一线基础方案 (Bud green) */}
                    <div className="bg-[#eaf7ee]/70 border border-[#d1ead8] rounded-3xl p-6 md:p-8 relative overflow-hidden">
                      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-[#fffdf9]/30 rounded-full blur-2xl pointer-events-none"></div>

                      <div className="flex items-center gap-3 mb-6 relative z-10">
                        <div className="p-2.5 bg-[#d1ead8] text-[#1e5631] border border-[#a3d8b4] rounded-xl shrink-0">
                          <CheckCircle2 size={24} className="stroke-[2.5]" />
                        </div>
                        <div>
                          <h2 className="text-lg md:text-xl font-serif font-bold text-[#1e5631] flex items-center gap-2">
                            <span>✅ 一线基础方案</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-[#d1ead8] text-[#1e5631] border border-[#a3d8b4] rounded">
                              指南强推荐
                            </span>
                          </h2>
                          <p className="text-xs text-[#2a5c38] mt-0.5">这是临床共识中权重极高、必须优先启动和执行的核心底层方案</p>
                        </div>
                      </div>

                      <div className="space-y-6 relative z-10">
                        {matchedProfile.firstLine.map((item, idx) => (
                          <div key={idx} className="bg-[#fffdf9]/90 border border-watercolor-border/40 rounded-2xl p-5 shadow-xs relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-[#4ade80]"></div>
                            <h3 className="text-base font-serif font-bold text-watercolor-title flex items-center gap-2">
                              <span className="text-xs bg-[#eaf7ee] text-[#1e5631] border border-[#d1ead8] w-5 h-5 rounded-full flex items-center justify-center font-serif font-bold">
                                {idx + 1}
                              </span>
                              <span>{item.name}</span>
                            </h3>
                            <div className="mt-3 bg-white/70 border border-watercolor-border/20 rounded-xl p-3.5">
                              <span className="inline-block text-xs font-serif font-bold text-[#1e5631] bg-[#eaf7ee] px-2.5 py-0.5 rounded-md mb-1.5">
                                🌟 作用机制通俗比喻
                              </span>
                              <p className="text-xs md:text-sm text-[#333333] leading-relaxed font-sans">
                                {item.metaphor}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 二线或辅助选择 (Morandi yellow) */}
                    <div className="bg-[#faf6f0]/70 border border-watercolor-border/50 rounded-3xl p-6 md:p-8 relative overflow-hidden">
                      <div className="flex items-center gap-3 mb-6 relative z-10">
                        <div className="p-2.5 bg-[#fef3c7] text-[#92400e] border border-[#fde047]/60 rounded-xl shrink-0">
                          <AlertTriangle size={24} className="stroke-[2.5]" />
                        </div>
                        <div>
                          <h2 className="text-lg md:text-xl font-serif font-bold text-[#92400e] flex items-center gap-2">
                            <span>⚠️ 二线或辅助选择</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-[#fef3c7] text-[#92400e] border border-[#fde047]/60 rounded">
                              有辅助证据但非一线
                            </span>
                          </h2>
                          <p className="text-xs text-[#92400e]/80 mt-0.5">当基础方案收益未达预期，或在专科医师精密评估下可考虑的辅助补充配合</p>
                        </div>
                      </div>

                      <div className="space-y-6 relative z-10">
                        {matchedProfile.secondLine.map((item, idx) => (
                          <div key={idx} className="bg-[#fffdf9]/90 border border-watercolor-border/40 rounded-2xl p-5 shadow-xs relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-[#f59e0b]"></div>
                            <h3 className="text-base font-serif font-bold text-watercolor-title flex items-center gap-2">
                              <span className="text-xs bg-[#faf6f0] text-[#92400e] border border-watercolor-border/30 w-5 h-5 rounded-full flex items-center justify-center font-serif font-bold">
                                {idx + 1}
                              </span>
                              <span>{item.name}</span>
                            </h3>
                            <div className="mt-3 bg-white/70 border border-watercolor-border/20 rounded-xl p-3.5">
                              <span className="inline-block text-xs font-serif font-bold text-[#92400e] bg-[#fef3c7] px-2.5 py-0.5 rounded-md mb-1.5">
                                🔍 作用机制通俗比喻
                              </span>
                              <p className="text-xs md:text-sm text-[#333333] leading-relaxed font-sans">
                                {item.metaphor}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 避坑指南 (Gentle pale pink) */}
                    <div className="bg-[#fdf1f5]/70 border border-[#fbdce2] rounded-3xl p-6 md:p-8 relative overflow-hidden">
                      <div className="flex items-center gap-3 mb-6 relative z-10">
                        <div className="p-2.5 bg-[#ffe4e6] text-[#9f1239] border border-[#fecdd3] rounded-xl shrink-0">
                          <XCircle size={24} className="stroke-[2.5]" />
                        </div>
                        <div>
                          <h2 className="text-lg md:text-xl font-serif font-bold text-[#9f1239] flex items-center gap-2">
                            <span>❌ 无证据或有害行为</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-[#ffe4e6] text-[#9f1239] border border-[#fecdd3] rounded">
                              避开网上伪科普
                            </span>
                          </h2>
                          <p className="text-xs text-[#9f1239]/80 mt-0.5">市场上流传甚广、缺乏科学临床效力、甚至极有可能损害女性内分泌环境的骗术</p>
                        </div>
                      </div>

                      <div className="space-y-4 relative z-10">
                        {matchedProfile.harmful.map((item, idx) => (
                          <div key={idx} className="bg-[#fffdf9]/90 border border-watercolor-border/40 rounded-2xl p-5 shadow-xs relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-[#f43f5e]"></div>
                            <h3 className="text-base font-serif font-bold text-[#9f1239] flex items-center gap-2">
                              <span className="text-xs bg-[#fdf1f5] text-[#9f1239] border border-[#fbdce2] w-5 h-5 rounded-full flex items-center justify-center font-serif font-bold">
                                {idx + 1}
                              </span>
                              <span>{item.name}</span>
                            </h3>
                            <p className="text-xs md:text-sm text-[#444444] mt-2.5 leading-relaxed font-sans border-l-2 border-dashed border-[#fecdd3] pl-3">
                              <strong className="text-[#9f1239] font-serif font-bold block">为什么别信：</strong>
                              <span>{item.reason}</span>
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: DETAILED LIFESTYLE & DIETARY INTERVENTIONS */}
                {(activeTab === "lifestyle" || typeof window === "undefined") && (
                  <div className={`${activeTab !== "lifestyle" ? "hidden print:block" : "block"} space-y-6`} id="tab-lifestyle">
                    <div className="bg-[#fffdf9]/95 rounded-3xl border border-watercolor-border/60 p-6 md:p-8 shadow-xs space-y-8">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-[#fdf1f5] border border-[#fbdce2] text-watercolor-title rounded-xl shrink-0">
                          <Apple size={20} />
                        </div>
                        <div>
                          <h3 className="text-base md:text-lg font-serif font-bold text-watercolor-title">
                            🌱 表型精细化生活方式与膳食干预处方
                          </h3>
                          <p className="text-[10px] text-[#666] font-mono mt-0.5">LIFESTYLE MODIFICATION & PERSONAL DIETETIC PRESCRIPTION</p>
                        </div>
                      </div>

                      {/* Warning notice */}
                      <div className="bg-[#eaf7ee] border border-[#d1ead8] p-4 rounded-2xl text-xs md:text-sm text-[#1e5631] leading-relaxed">
                        国际所有 PCOS 诊疗共识均建议：<strong>无论是否服用药物，生活方式调整都是多囊改善、恢复排卵、管理体质的根本根基。</strong>以下为您精心生成的精细化改善准则：
                      </div>

                      <div className="space-y-6">
                        {/* Diet plan card */}
                        <div className="border border-watercolor-border/30 rounded-2xl p-5 space-y-3 bg-white">
                          <h4 className="text-sm md:text-base font-serif font-bold text-watercolor-title flex items-center gap-2">
                            <Apple size={18} className="text-[#1e5631]" />
                            <span>🍎 膳食与个性化营养管理建议</span>
                          </h4>
                          <ul className="space-y-2.5 text-xs md:text-sm text-[#444] leading-relaxed">
                            {matchedRotterdam.lifestyleIntervention.dietPlan.map((d, i) => (
                              <li key={i} className="flex gap-2 items-start pl-1">
                                <span className="text-[#1e5631] font-bold mt-0.5 shrink-0">✦</span>
                                <span>{d}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Exercise plan card */}
                        <div className="border border-watercolor-border/30 rounded-2xl p-5 space-y-3 bg-white">
                          <h4 className="text-sm md:text-base font-serif font-bold text-watercolor-title flex items-center gap-2">
                            <Dumbbell size={18} className="text-[#1e40af]" />
                            <span>🏋️‍♀️ 运动与骨骼肌代谢促进方案</span>
                          </h4>
                          <ul className="space-y-2.5 text-xs md:text-sm text-[#444] leading-relaxed">
                            {matchedRotterdam.lifestyleIntervention.exercisePlan.map((e, i) => (
                              <li key={i} className="flex gap-2 items-start pl-1">
                                <span className="text-[#1e40af] font-bold mt-0.5 shrink-0">✦</span>
                                <span>{e}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Rest and Supp card */}
                        <div className="border border-watercolor-border/30 rounded-2xl p-5 space-y-3 bg-white">
                          <h4 className="text-sm md:text-base font-serif font-bold text-watercolor-title flex items-center gap-2">
                            <Moon size={18} className="text-[#92400e]" />
                            <span>💊 作息时间与针对性微营养补充</span>
                          </h4>
                          <ul className="space-y-2.5 text-xs md:text-sm text-[#444] leading-relaxed">
                            {matchedRotterdam.lifestyleIntervention.restAndSupp.map((r, i) => (
                              <li key={i} className="flex gap-2 items-start pl-1">
                                <span className="text-[#92400e] font-bold mt-0.5 shrink-0">✦</span>
                                <span>{r}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Safety Disclaimer Callout */}
              <div className="bg-[#e5eef9]/70 border border-watercolor-border/50 rounded-3xl p-6 md:p-8 relative overflow-hidden">
                <div className="flex gap-4 items-start relative z-10">
                  <div className="p-2 bg-white/85 rounded-xl border border-watercolor-border/30 text-watercolor-title shrink-0">
                    <ShieldCheck size={20} />
                  </div>
                  <div className="space-y-2.5">
                    <h4 className="text-sm font-serif font-bold text-watercolor-title">⚠️ 严谨循证医学安全提示：</h4>
                    <p className="text-xs md:text-sm text-[#444444] leading-relaxed font-sans">
                      本评估及调护方案整理自国内外临床指南和多囊诊疗共识，仅作为健康教育、学术科普和避坑自测参考。由于多囊病因复杂、个体差异显著且合并长远的心血管、子宫内膜病变或孕产期高糖高血压风险，切勿擅自依照知识讲解服药或自行停服正规医嘱处方。
                    </p>
                    <p className="text-xs md:text-sm text-[#782828] leading-relaxed font-serif font-bold border-l-4 border-[#782828]/50 pl-3.5 pt-2 bg-[#fdf1f5]/80 rounded-r-lg">
                      “以上科普不能替代线下诊疗，请务必携带此方案前往正规医院生殖医学科或妇科内分泌科，由医生结合化验检查开具处方。”
                    </p>
                  </div>
                </div>
              </div>

              {/* Patient Feedback Card (Shown if submission ID exists) */}
              {submissionId && (
                <div className="bg-[#fffdf9]/95 rounded-3xl border border-watercolor-border/60 p-6 md:p-8 shadow-xs relative overflow-hidden mt-6 no-print">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-watercolor-pink-trans/20 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>
                  
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="p-2 bg-[#fdf1f5] border border-[#fbdce2] text-watercolor-title rounded-xl shrink-0">
                      <Star size={20} className="fill-current text-amber-500" />
                    </div>
                    <div>
                      <h3 className="text-base md:text-lg font-serif font-bold text-watercolor-title">
                        💌 测评结果与建议反馈
                      </h3>
                      <p className="text-[10px] text-[#666] font-mono mt-0.5">PATIENT FEEDBACK & ASSESSMENT RATING</p>
                    </div>
                  </div>

                  {feedbackSubmitted ? (
                    <div className="bg-[#eaf7ee] border border-[#d1ead8] p-5 rounded-2xl text-center space-y-2">
                      <div className="w-10 h-10 bg-white text-[#1e5631] border border-[#d1ead8] rounded-full flex items-center justify-center mx-auto shadow-xs">
                        <Check size={20} className="stroke-[3]" />
                      </div>
                      <h4 className="text-sm font-bold font-serif text-[#1e5631]">感谢您的宝贵反馈！</h4>
                      <p className="text-xs text-[#1e5631]/80">您的真实改善意见是我们和科研/临床团队不断迭代该循证知识库的根本源泉。</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-xs text-[#555555] leading-relaxed">
                        请评价该循证自测系统为您生成的诊疗与生活干预报告。您的评分与匿名意见将保存在系统病历中，方便您的主治医生后续在后台管理端调阅并制定更贴合您的康复决策。
                      </p>

                      <div>
                        <span className="block text-xs font-medium text-[#555555] mb-2">对生成报告的实用性评分：</span>
                        <div className="flex gap-2.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setFeedbackRating(star)}
                              className="p-1 cursor-pointer transition-transform hover:scale-110 focus:outline-none"
                            >
                              <Star
                                size={28}
                                className={`stroke-[1.5] ${
                                  star <= feedbackRating
                                    ? "fill-amber-400 text-amber-500"
                                    : "text-gray-300 hover:text-amber-300"
                                }`}
                              />
                            </button>
                          ))}
                          {feedbackRating > 0 && (
                            <span className="text-xs font-serif font-bold text-watercolor-title ml-2 self-center bg-watercolor-highlight px-2.5 py-0.5 rounded border border-[#ebd9c8]">
                              {feedbackRating} 分 ({feedbackRating === 5 ? "非常完美" : feedbackRating === 4 ? "实用清晰" : feedbackRating === 3 ? "比较有用" : feedbackRating === 2 ? "内容一般" : "仍需改进"})
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="feedbackComment" className="block text-xs font-medium text-[#555555]">
                          补充您的改善意见或体验反馈 (可选)：
                        </label>
                        <textarea
                          id="feedbackComment"
                          value={feedbackComment}
                          onChange={(e) => setFeedbackComment(e.target.value)}
                          placeholder="例如：排版清晰，避坑指南非常有启发；或者写下您的康复希冀..."
                          rows={3}
                          className="w-full bg-white border border-watercolor-border/40 rounded-xl p-3 text-xs focus:border-watercolor-title/60 focus:outline-none text-[#333333] placeholder-[#999999]"
                        ></textarea>
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={submitFeedback}
                          disabled={feedbackRating === 0 || isFeedbackSubmitting}
                          className="px-5 py-2.5 bg-watercolor-title text-white hover:bg-[#8f3a3a] disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-xs font-serif font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          {isFeedbackSubmitting ? (
                            <>
                              <RefreshCw size={12} className="animate-spin" />
                              <span>正在提交中...</span>
                            </>
                          ) : (
                            <>
                              <span>提交评估反馈</span>
                              <Send size={12} />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Reset button footer */}
              <div className="flex justify-center pt-4 no-print relative z-10">
                <button
                  onClick={resetApp}
                  className="px-8 py-3 bg-white hover:bg-[#faf6f0] text-watercolor-body border border-watercolor-border/50 font-serif font-bold rounded-xl transition text-sm shadow-xs cursor-pointer"
                >
                  重新测试其他组合表型
                </button>
              </div>
            </motion.div>
          )}

          {/* DOCTOR WORKBENCH (ADMIN VIEW) */}
          {viewState === "admin" && (
            <motion.div
              key="admin"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Admin Dashboard Header */}
              <div className="bg-[#fffdf9]/95 rounded-3xl border border-watercolor-border/60 p-6 shadow-xs relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="absolute top-0 right-0 w-32 h-32 bg-watercolor-pink-trans/20 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>
                <div>
                  <h2 className="text-xl md:text-2xl font-serif font-bold text-watercolor-title flex items-center gap-2">
                    <FolderLock size={22} className="text-watercolor-title shrink-0" />
                    <span>临床医生诊断与患者档案管理后台</span>
                  </h2>
                  <p className="text-xs text-[#666666] mt-0.5">查看多囊患者自测分型数据、代谢风险等级及患者反馈</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={fetchAdminRecords}
                    disabled={isLoadingRecords}
                    className="px-3.5 py-2 bg-white hover:bg-[#faf6f0] text-watercolor-body border border-watercolor-border/50 rounded-xl text-xs font-serif font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw size={13} className={isLoadingRecords ? "animate-spin" : ""} />
                    <span>刷新数据</span>
                  </button>
                  <button
                    onClick={handleAdminLogout}
                    className="px-3.5 py-2 bg-watercolor-title hover:bg-[#8f3a3a] text-white border border-transparent rounded-xl text-xs font-serif font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw size={13} />
                    <span>退出后台</span>
                  </button>
                </div>
              </div>

              {/* Summary Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border border-watercolor-border/30 rounded-2xl p-4 shadow-xs">
                  <span className="text-xs text-[#666666] font-medium block">自测建档总人数</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-serif font-bold text-watercolor-title">{adminRecords.length}</span>
                    <span className="text-[10px] text-[#888888]">例患者</span>
                  </div>
                </div>
                <div className="bg-white border border-watercolor-border/30 rounded-2xl p-4 shadow-xs">
                  <span className="text-xs text-[#666666] font-medium block">经典型 (Phenotype A)</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-serif font-bold text-[#b91c1c]">
                      {adminRecords.filter(r => r.matchedRotterdam?.code === "A").length}
                    </span>
                    <span className="text-[10px] text-[#888888]">例 (占比 {adminRecords.length ? Math.round((adminRecords.filter(r => r.matchedRotterdam?.code === "A").length / adminRecords.length) * 100) : 0}%)</span>
                  </div>
                </div>
                <div className="bg-white border border-watercolor-border/30 rounded-2xl p-4 shadow-xs">
                  <span className="text-xs text-[#666666] font-medium block">伴高危代谢风险比例</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-serif font-bold text-amber-700">
                      {adminRecords.filter(r => (r.calculatedBmi && r.calculatedBmi >= 24) || (r.waistCm && parseFloat(r.waistCm) >= 80)).length}
                    </span>
                    <span className="text-[10px] text-[#888888]">例 (腰围≥80或BMI≥24)</span>
                  </div>
                </div>
                <div className="bg-white border border-watercolor-border/30 rounded-2xl p-4 shadow-xs">
                  <span className="text-xs text-[#666666] font-medium block">患者自评满意度</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-serif font-bold text-[#1e5631]">
                      {(() => {
                        const rated = adminRecords.filter(r => r.feedback?.rating > 0);
                        if (!rated.length) return "5.0";
                        const sum = rated.reduce((acc, curr) => acc + curr.feedback.rating, 0);
                        return (sum / rated.length).toFixed(1);
                      })()}
                    </span>
                    <span className="text-[10px] text-[#888888]">星 (共 {adminRecords.filter(r => r.feedback?.rating > 0).length} 条反馈)</span>
                  </div>
                </div>
              </div>

              {/* Main Workspace splitscreen */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left side: Records List */}
                <div className="lg:col-span-5 bg-white rounded-3xl border border-watercolor-border/50 p-5 shadow-xs space-y-4">
                  {/* Search and Filters */}
                  <div className="space-y-3 text-left">
                    <div className="relative">
                      <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="搜索患者姓名、病案号..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-[#fffdf9] border border-watercolor-border/30 rounded-xl py-2 pl-9 pr-4 text-xs focus:border-watercolor-title/50 focus:outline-none text-[#333333]"
                      />
                    </div>
                    
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { code: "all", label: "全部" },
                        { code: "A", label: "表型 A" },
                        { code: "B", label: "表型 B" },
                        { code: "C", label: "表型 C" },
                        { code: "D", label: "表型 D" },
                        { code: "Subclinical", label: "表型 Sub" }
                      ].map((item) => (
                        <button
                          key={item.code}
                          onClick={() => setFilterPhenotype(item.code)}
                          className={`px-2 py-1 text-[10px] rounded-lg border font-serif font-bold transition-all cursor-pointer ${
                            filterPhenotype === item.code
                              ? "bg-watercolor-title text-white border-transparent"
                              : "bg-[#fffdf9] text-watercolor-body border-watercolor-border/30 hover:bg-[#faf6f0]"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* List Container */}
                  <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                    {isLoadingRecords ? (
                      <div className="text-center py-10 space-y-2">
                        <RefreshCw size={24} className="animate-spin text-watercolor-title mx-auto" />
                        <p className="text-xs text-[#666666]">正在加载云端患者病史记录...</p>
                      </div>
                    ) : filteredRecords.length === 0 ? (
                      <div className="text-center py-12 text-[#888888] space-y-1 bg-[#fffdf9]/50 border border-dashed border-watercolor-border/30 rounded-2xl">
                        <FileText size={24} className="mx-auto text-gray-300" />
                        <p className="text-xs">未找到符合条件的患者建档记录</p>
                      </div>
                    ) : (
                      filteredRecords.map((rec) => {
                        const isSelected = selectedRecord?.id === rec.id;
                        const dateStr = rec.createdAt ? new Date(rec.createdAt).toLocaleString("zh-CN", {
                          month: "numeric",
                          day: "numeric",
                          hour: "numeric",
                          minute: "numeric"
                        }) : "未知日期";
                        
                        return (
                          <div
                            key={rec.id}
                            onClick={() => setSelectedRecord(rec)}
                            className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative text-left ${
                              isSelected
                                ? "bg-[#fdf1f5]/85 border-[#782828] shadow-xs"
                                : "bg-[#fffdf9]/40 border-watercolor-border/30 hover:border-[#782828]/30 hover:bg-[#fffdf9]/80"
                            }`}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <span className="font-serif font-bold text-sm text-[#782828] block">
                                  {rec.patientName}
                                </span>
                                <span className="text-[10px] text-gray-500 font-mono block mt-0.5">
                                  ID: {rec.patientId || "未登记"}
                                </span>
                                {rec.isLocalOnly && (
                                  <span className="inline-block mt-1 bg-amber-50 text-amber-700 border border-amber-200/50 px-1.5 py-0.5 rounded text-[9px] font-sans font-bold">
                                    本地暂存 (待同步)
                                  </span>
                                )}
                              </div>
                              
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                rec.matchedRotterdam?.code === "A"
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : rec.matchedRotterdam?.code === "B"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : rec.matchedRotterdam?.code === "C"
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : rec.matchedRotterdam?.code === "D"
                                  ? "bg-purple-50 text-purple-700 border-purple-200"
                                  : "bg-gray-50 text-gray-700 border-gray-200"
                              }`}>
                                表型 {rec.matchedRotterdam?.code || "未知"}
                              </span>
                            </div>

                            <div className="flex justify-between items-center mt-3 text-[10px] text-[#666666]">
                              <span className="font-mono">{dateStr}</span>
                              <div className="flex items-center gap-1.5">
                                {rec.feedback?.rating > 0 ? (
                                  <span className="flex items-center gap-0.5 text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 font-bold">
                                    <Star size={8} className="fill-current text-amber-500" />
                                    {rec.feedback.rating}★
                                  </span>
                                ) : (
                                  <span className="text-[#888888] italic">暂无反馈</span>
                                )}
                                
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteRecord(rec.id);
                                  }}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer border border-transparent hover:border-red-100"
                                  title="删除此档案"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Right side: Detailed View */}
                <div className="lg:col-span-7 bg-[#fffdf9]/95 rounded-3xl border border-watercolor-border/60 p-6 md:p-8 shadow-xs min-h-[480px]">
                  {selectedRecord ? (
                    <div className="space-y-6 text-left animate-fade-in">
                      {/* Detailed Header */}
                      <div className="border-b border-watercolor-border/20 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg md:text-xl font-serif font-bold text-[#782828]">
                              {selectedRecord.patientName}
                            </h3>
                            <span className="text-[10px] bg-watercolor-highlight border border-watercolor-border/30 text-watercolor-title px-2.5 py-0.5 rounded-full font-serif font-bold">
                              自测档案病历
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1 font-mono">
                            建档 ID: {selectedRecord.id} | 诊疗 ID: {selectedRecord.patientId || "未登记"}
                          </p>
                        </div>
                        <span className="text-[11px] text-gray-500 font-mono">
                          建档时间: {new Date(selectedRecord.createdAt).toLocaleString()}
                        </span>
                      </div>

                      {selectedRecord.isLocalOnly && (
                        <div className="bg-amber-50 border border-amber-200/70 rounded-2xl p-4 space-y-2 text-left">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex gap-2 items-start">
                              <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                              <div>
                                <p className="text-xs font-serif font-bold text-amber-900">这是一条保存在手机本地的暂存自测病历</p>
                                <p className="text-[10px] text-amber-700 leading-relaxed mt-0.5">
                                  该记录目前仅暂存在本设备的本地浏览器缓存中，电脑端或其他设备后台暂时无法查阅。
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={async () => {
                                setIsSyncing(true);
                                setSyncErrorMsg("");
                                try {
                                  const { id, isLocalOnly, ...payload } = selectedRecord;
                                  const docRef = await promiseWithTimeout(
                                    addDoc(collection(db, "submissions"), payload),
                                    3000,
                                    "手动同步超时"
                                  );
                                  console.log("Manual sync success:", docRef.id);
                                  // Remove from local queue
                                  const raw = localStorage.getItem("pcos_unsynced_submissions");
                                  if (raw) {
                                    const unsynced = JSON.parse(raw);
                                    const updated = unsynced.filter((r: any) => r.localId !== id);
                                    localStorage.setItem("pcos_unsynced_submissions", JSON.stringify(updated));
                                    setUnsyncedCount(updated.length);
                                  }
                                  // Update admin state
                                  setAdminRecords(prev => prev.map(r => r.id === id ? { id: docRef.id, ...payload } : r));
                                  setSelectedRecord({ id: docRef.id, ...payload });
                                } catch (e) {
                                  console.error(e);
                                  setSyncErrorMsg("手动同步失败：请检查网络连接、VPN设置或云端安全组规则。");
                                } finally {
                                  setIsSyncing(false);
                                }
                              }}
                              disabled={isSyncing}
                              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white rounded-xl text-xs font-serif font-bold transition-all shadow-xs cursor-pointer shrink-0 flex items-center justify-center gap-1.5"
                            >
                              <RefreshCw size={12} className={isSyncing ? "animate-spin" : ""} />
                              <span>立即手动同步</span>
                            </button>
                          </div>
                          {syncErrorMsg && (
                            <p className="text-[10px] text-red-600 font-sans font-bold pt-1">
                              ⚠️ {syncErrorMsg}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Diagnostic Summary Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-[#fdf1f5]/60 border border-[#fbdce2] rounded-2xl p-4 space-y-2">
                          <h4 className="text-xs font-serif font-bold text-watercolor-title flex items-center gap-1">
                            <Stethoscope size={13} />
                            <span>鹿特丹表型诊断</span>
                          </h4>
                          <div className="space-y-1">
                            <span className="text-sm font-serif font-bold text-watercolor-title block">
                              表型 {selectedRecord.matchedRotterdam?.code} ({selectedRecord.matchedRotterdam?.name})
                            </span>
                            <span className="text-xs text-[#555555] block leading-relaxed">
                              {selectedRecord.matchedRotterdam?.definition}
                            </span>
                          </div>
                        </div>

                        <div className="bg-[#e5eef9]/60 border border-watercolor-border/40 rounded-2xl p-4 space-y-2">
                          <h4 className="text-xs font-serif font-bold text-watercolor-title flex items-center gap-1">
                            <Activity size={13} />
                            <span>生活代谢健康画像</span>
                          </h4>
                          <div className="space-y-1">
                            <span className="text-sm font-serif font-bold text-watercolor-title block">
                              {selectedRecord.matchedProfile?.title}
                            </span>
                            <span className="text-xs text-[#555555] block leading-relaxed">
                              {selectedRecord.matchedProfile?.concernText}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Physical index card */}
                      <div className="border border-watercolor-border/30 rounded-2xl p-4 bg-white space-y-3">
                        <h4 className="text-xs font-serif font-bold text-watercolor-title flex items-center gap-1">
                          <Calculator size={13} />
                          <span>患者人体测量学物理指标</span>
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                          <div className="bg-[#fffdf9] p-2.5 rounded-xl border border-watercolor-border/20">
                            <span className="text-[10px] text-[#666666] block">身高</span>
                            <span className="text-sm font-serif font-bold text-watercolor-body font-mono block mt-0.5">
                              {selectedRecord.heightCm ? `${selectedRecord.heightCm} cm` : "未登记"}
                            </span>
                          </div>
                          <div className="bg-[#fffdf9] p-2.5 rounded-xl border border-watercolor-border/20">
                            <span className="text-[10px] text-[#666666] block">体重</span>
                            <span className="text-sm font-serif font-bold text-watercolor-body font-mono block mt-0.5">
                              {selectedRecord.weightKg ? `${selectedRecord.weightKg} kg` : "未登记"}
                            </span>
                          </div>
                          <div className="bg-[#fffdf9] p-2.5 rounded-xl border border-watercolor-border/20">
                            <span className="text-[10px] text-[#666666] block">腰围</span>
                            <span className="text-sm font-serif font-bold text-watercolor-body font-mono block mt-0.5">
                              {selectedRecord.waistCm ? `${selectedRecord.waistCm} cm` : "未登记"}
                            </span>
                          </div>
                          <div className="bg-[#fffdf9] p-2.5 rounded-xl border border-watercolor-border/20">
                            <span className="text-[10px] text-[#666666] block">计算 BMI</span>
                            <span className="text-sm font-serif font-bold text-watercolor-body block mt-0.5 flex items-center justify-center gap-1.5">
                              {selectedRecord.calculatedBmi ? (
                                <>
                                  <span className="font-mono text-watercolor-title">{selectedRecord.calculatedBmi}</span>
                                  <span className="text-[8px] bg-watercolor-highlight border border-[#ebd9c8] text-watercolor-title px-1.5 py-0.2 rounded font-serif font-bold">
                                    {selectedRecord.bmiCategory}
                                  </span>
                                </>
                              ) : "未计算"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Standard Diagnostic Checklist */}
                      <div className="border border-watercolor-border/30 rounded-2xl p-4 bg-white space-y-3">
                        <h4 className="text-xs font-serif font-bold text-watercolor-title flex items-center gap-1">
                          <CheckCircle2 size={13} className="text-[#1e5631]" />
                          <span>鹿特丹金标准排查勾选项 (指标满足度: {
                            [selectedRecord.rotterdamAnswers?.hasMenstrualIssue, selectedRecord.rotterdamAnswers?.hasAndrogenIssue, selectedRecord.rotterdamAnswers?.hasUltrasoundIssue].filter(Boolean).length
                          }/3)</span>
                        </h4>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between items-center p-2 rounded-lg bg-[#fffdf9]/50 border border-watercolor-border/10">
                            <span>指标 A：稀发排卵或无排卵 (月经稀少、周期不调)</span>
                            <span className={`font-serif font-bold px-2 py-0.5 rounded text-[10px] ${selectedRecord.rotterdamAnswers?.hasMenstrualIssue ? "bg-red-50 text-red-700 border border-red-100" : "bg-gray-50 text-gray-400 border border-gray-100"}`}>
                              {selectedRecord.rotterdamAnswers?.hasMenstrualIssue ? "符合 (已勾选)" : "不符合"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-2 rounded-lg bg-[#fffdf9]/50 border border-watercolor-border/10">
                            <span>指标 B：高雄激素表现 (爆痘、体毛浓密或血睾酮高)</span>
                            <span className={`font-serif font-bold px-2 py-0.5 rounded text-[10px] ${selectedRecord.rotterdamAnswers?.hasAndrogenIssue ? "bg-red-50 text-red-700 border border-red-100" : "bg-gray-50 text-gray-400 border border-gray-100"}`}>
                              {selectedRecord.rotterdamAnswers?.hasAndrogenIssue ? "符合 (已勾选)" : "不符合"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-2 rounded-lg bg-[#fffdf9]/50 border border-watercolor-border/10">
                            <span>指标 C：B超可见卵巢多囊样改变 (窦卵泡≥12个)</span>
                            <span className={`font-serif font-bold px-2 py-0.5 rounded text-[10px] ${selectedRecord.rotterdamAnswers?.hasUltrasoundIssue ? "bg-red-50 text-red-700 border border-red-100" : "bg-gray-50 text-gray-400 border border-gray-100"}`}>
                              {selectedRecord.rotterdamAnswers?.hasUltrasoundIssue ? "符合 (已勾选)" : "不符合"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Lifestyle Question Answers Detail */}
                      <div className="border border-watercolor-border/30 rounded-2xl p-4 bg-white space-y-3">
                        <h4 className="text-xs font-serif font-bold text-watercolor-title flex items-center gap-1">
                          <FileText size={13} />
                          <span>生活干预问答自测细节</span>
                        </h4>
                        <div className="space-y-2.5 text-xs text-[#555555]">
                          <div>
                            <span className="font-semibold text-watercolor-body block mb-0.5">Q1. 个人核心诉求与困扰</span>
                            <p className="bg-[#fffdf9] p-2.5 rounded-lg border border-watercolor-border/20 text-[#333333]">
                              {selectedRecord.answers?.q1 === 1 ? "1. 月经不规律或身上毛发重、长痘痘" : selectedRecord.answers?.q1 === 2 ? "2. 正在备孕，想生孩子" : selectedRecord.answers?.q1 === 3 ? "3. 担心血糖高、长胖或代谢问题" : "未选择"}
                            </p>
                          </div>
                          <div>
                            <span className="font-semibold text-watercolor-body block mb-0.5">Q2. 精制碳水与高糖频度 (结合BMI折算)</span>
                            <p className="bg-[#fffdf9] p-2.5 rounded-lg border border-watercolor-border/20 text-[#333333]">
                              {selectedRecord.answers?.q2 === 1 ? "1. 超重或肥胖" : selectedRecord.answers?.q2 === 2 ? "2. 体重正常（偏瘦或标准）" : "未选择"}
                            </p>
                          </div>
                          <div>
                            <span className="font-semibold text-watercolor-body block mb-0.5">Q3. 胰岛素/血糖表现反馈</span>
                            <p className="bg-[#fffdf9] p-2.5 rounded-lg border border-watercolor-border/20 text-[#333333]">
                              {selectedRecord.answers?.q3 === 1 ? "1. 有（确诊胰岛素抵抗/高血糖）" : selectedRecord.answers?.q3 === 2 ? "2. 没有（体检血糖一直正常）" : "未选择"}
                            </p>
                          </div>
                          <div>
                            <span className="font-semibold text-watercolor-body block mb-0.5">Q4. 生育计划安排</span>
                            <p className="bg-[#fffdf9] p-2.5 rounded-lg border border-watercolor-border/20 text-[#333333]">
                              {selectedRecord.answers?.q4 === 1 ? "1. 是的，我正在积极备孕（或准备做试管）" : selectedRecord.answers?.q4 === 2 ? "2. 暂时没有，主要想调理身体" : "未选择"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Patient Feedback loop */}
                      <div className="border border-watercolor-border/30 rounded-2xl p-4 bg-white space-y-3">
                        <h4 className="text-xs font-serif font-bold text-watercolor-title flex items-center gap-1">
                          <Star size={13} className="fill-current text-amber-500" />
                          <span>患者体验评价与改进反馈</span>
                        </h4>
                        {selectedRecord.feedback ? (
                          <div className="bg-[#eaf7ee]/50 border border-[#d1ead8] p-3.5 rounded-xl space-y-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs text-[#1e5631] font-bold">满意度评分:</span>
                              <div className="flex text-amber-500">
                                {Array.from({ length: selectedRecord.feedback.rating || 0 }).map((_, i) => (
                                  <Star key={i} size={12} className="fill-current text-amber-500" />
                                ))}
                                {Array.from({ length: 5 - (selectedRecord.feedback.rating || 0) }).map((_, i) => (
                                  <Star key={i} size={12} className="text-gray-300" />
                                ))}
                              </div>
                              <span className="text-[10px] text-gray-500 font-mono ml-auto">
                                反馈时间: {selectedRecord.feedback.submittedAt ? new Date(selectedRecord.feedback.submittedAt).toLocaleString() : "未知"}
                              </span>
                            </div>
                            <div>
                              <span className="text-xs text-[#1e5631] font-bold block">改善意见 / 体验内容:</span>
                              <p className="text-xs text-[#333333] italic mt-1 leading-relaxed bg-white p-2.5 rounded-lg border border-[#d1ead8]/40">
                                {selectedRecord.feedback.comment || "该患者仅提交了评分，未填写具体反馈文字"}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500 italic bg-gray-50 p-3 rounded-xl border border-dashed border-gray-200 text-center">
                            该患者尚未提交针对评估报告的体验满意度反馈意见
                          </p>
                        )}
                      </div>

                      {/* Action buttons footer for record */}
                      <div className="border-t border-watercolor-border/10 pt-5 flex justify-end">
                        <button
                          type="button"
                          onClick={() => deleteRecord(selectedRecord.id)}
                          className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 hover:border-rose-300 rounded-xl text-xs font-serif font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <Trash2 size={13} />
                          <span>删除该患者自测记录</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center py-24 text-center text-[#888888] space-y-3">
                      <div className="w-16 h-16 bg-[#fdf1f5] text-[#782828] border border-[#fbdce2] rounded-full flex items-center justify-center shadow-xs">
                        <FolderLock size={28} />
                      </div>
                      <div className="space-y-1 max-w-sm">
                        <h4 className="font-serif font-bold text-watercolor-title text-base">未选择患者档案</h4>
                        <p className="text-xs text-[#666666] leading-relaxed">
                          请在左侧列表中点击具体患者自测记录，即可在此调阅其完整的 Rotterdam 表型分型、生活代谢数据及病程反馈。
                        </p>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* ADMIN LOGIN MODAL */}
      <AnimatePresence>
        {showAdminLogin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs no-print">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#fffdf9] rounded-3xl border border-watercolor-border/60 p-6 md:p-8 max-w-sm w-full shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-watercolor-pink-trans/25 rounded-full blur-xl pointer-events-none"></div>
              
              <button
                onClick={() => setShowAdminLogin(false)}
                className="absolute top-4 right-4 p-1.5 hover:bg-[#fdf1f5] rounded-lg border border-transparent hover:border-[#fbdce2] transition-colors cursor-pointer text-[#782828]"
              >
                <XCircle size={18} />
              </button>

              <div className="text-center space-y-2 mb-6">
                <div className="w-12 h-12 bg-[#fdf1f5] border border-[#fbdce2] text-watercolor-title rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                  <Lock size={22} className="stroke-[2.5]" />
                </div>
                <h3 className="text-lg font-serif font-bold text-watercolor-title">登录管理后台</h3>
                <p className="text-[11px] text-[#666666]">输入授权 PIN 码以读取患者自测档案</p>
              </div>

              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#555555] mb-1.5 text-center">
                    管理后台 PIN 码
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value)}
                    placeholder="请输入 4 位 PIN 码"
                    className="w-full bg-white border border-watercolor-border/40 rounded-xl p-3 text-center tracking-[0.5em] text-lg font-mono focus:border-watercolor-title/60 focus:outline-none text-[#333333] placeholder-gray-400"
                    style={{ letterSpacing: '0.2em' }}
                  />
                </div>

                {adminError && (
                  <div className="bg-[#fdf1f5] border border-[#fbdce2] p-2.5 rounded-xl text-center text-xs text-[#9f1239] font-medium">
                    {adminError}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 bg-watercolor-title text-white hover:bg-[#8f3a3a] rounded-xl text-xs font-serif font-bold transition-all shadow-md cursor-pointer text-center"
                >
                  验证并登录
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CUSTOM CONFIRM DELETE MODAL */}
      <AnimatePresence>
        {recordToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs no-print">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#fffdf9] rounded-3xl border border-watercolor-border/60 p-6 md:p-8 max-w-sm w-full shadow-2xl relative overflow-hidden text-center"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-rose-100/30 rounded-full blur-xl pointer-events-none"></div>
              
              <button
                onClick={() => setRecordToDelete(null)}
                className="absolute top-4 right-4 p-1.5 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 transition-colors cursor-pointer text-[#782828]"
              >
                <XCircle size={18} />
              </button>

              <div className="space-y-3 mb-6">
                <div className="w-12 h-12 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                  <AlertTriangle size={22} className="stroke-[2.5]" />
                </div>
                <h3 className="text-lg font-serif font-bold text-watercolor-title">确认删除记录吗？</h3>
                <p className="text-[12px] text-[#666666] leading-relaxed">
                  您确定要永久删除这条患者自测档案吗？删除后此数据将从云端彻底移除，不可恢复。
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setRecordToDelete(null)}
                  className="flex-1 py-2.5 bg-white border border-watercolor-border/40 text-watercolor-body hover:bg-gray-50 rounded-xl text-xs font-serif font-bold transition-all cursor-pointer text-center"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteRecord}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-serif font-bold transition-all shadow-md cursor-pointer text-center"
                >
                  确认删除
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="text-center text-[11px] text-[#666666] mt-16 max-w-lg mx-auto leading-relaxed px-4 no-print relative z-10 font-sans">
        <p>© 2026 PCOS 循证表型分型与诊疗决策教育系统 · 科学辅助自测助手</p>
      </footer>

    </div>
  );
}
