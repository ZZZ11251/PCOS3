export interface PCOSProfileItem {
  name: string;
  metaphor: string;
}

export interface PCOSHarmfulItem {
  name: string;
  reason: string;
}

export interface PCOSProfile {
  id: string;
  title: string;
  concernText: string;
  weightText: string;
  glycemicText: string;
  pregnancyText: string;
  firstLine: PCOSProfileItem[];
  secondLine: PCOSProfileItem[];
  harmful: PCOSHarmfulItem[];
}

export interface QuestionOption {
  value: number;
  label: string;
  desc: string;
}

export interface Question {
  id: "q1" | "q2" | "q3" | "q4";
  text: string;
  judgementStandard: string;
  options: QuestionOption[];
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface UserAnswers {
  q1: number | null;
  q2: number | null;
  q3: number | null;
  q4: number | null;
}

// Rotterdam Diagnosis & Phenotype Structures
export interface RotterdamPhenotype {
  code: "A" | "B" | "C" | "D" | "Subclinical";
  name: string;
  englishName: string;
  clinicalCriteria: string;
  definition: string;
  characteristics: string[];
  healthPortrait: {
    hormoneFeature: string; // 激素特征
    metabolicRisk: string;  // 代谢风险
    follicleQuality: string; // 卵子/卵泡特点
    mindEnergy: string;      // 身心/精力特点
  };
  lifestyleIntervention: {
    dietPlan: string[];     // 膳食建议
    exercisePlan: string[]; // 运动建议
    restAndSupp: string[];  // 作息与补剂建议
  };
}

export interface RotterdamAnswers {
  hasMenstrualIssue: boolean | null; // 稀发排卵/无排卵（月经紊乱）
  hasAndrogenIssue: boolean | null;  // 高雄表现/生化高雄（痤疮、多毛、脱发、抽血高雄）
  hasUltrasoundIssue: boolean | null; // B超卵巢多囊样改变（窦卵泡≥12个或体积增大）
}
