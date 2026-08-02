export interface QuestionnaireOption {
  id: string; // e.g. "A", "B", "C", "D"
  text: string;
  jumpTo?: string; // Target question id e.g. "q5", "q4_1"
}

export interface QuestionnaireItem {
  id: string;
  numberLabel: string;
  title: string;
  type: "single" | "multiple";
  options: QuestionnaireOption[];
  defaultNext?: string; // Fallback next question id
  allowOtherText?: boolean; // If option contains "其他"
}

export const feedbackQuestions: Record<string, QuestionnaireItem> = {
  q4: {
    id: "q4",
    numberLabel: "4",
    title: "手册开头介绍的 PCOS 诊断标准，您读起来觉得清楚吗？",
    type: "single",
    options: [
      { id: "A", text: "很清楚，看完能说出 3 条标准", jumpTo: "q5" },
      { id: "B", text: "大致了解，能记住 2 条", jumpTo: "q5" },
      { id: "C", text: "只有模糊印象", jumpTo: "q4_1" },
      { id: "D", text: "读完还是不太明白", jumpTo: "q4_1" }
    ],
    defaultNext: "q5"
  },
  q4_1: {
    id: "q4_1",
    numberLabel: "4-1",
    title: "您觉得不清楚的主要原因是什么？",
    type: "single",
    options: [
      { id: "A", text: "讲解太复杂，绕来绕去" },
      { id: "B", text: "专业术语太多，看不懂" },
      { id: "C", text: "排版太密，读不进去" },
      { id: "D", text: "内容太多，记不住重点" },
      { id: "E", text: "其他" }
    ],
    defaultNext: "q5",
    allowOtherText: true
  },
  q5: {
    id: "q5",
    numberLabel: "5",
    title: "手册中的 4 种分型自测，您用起来感觉怎么样？",
    type: "single",
    options: [
      { id: "A", text: "很好用，成功找到自己的类型", jumpTo: "q6" },
      { id: "B", text: "基本能找到，但有点犹豫", jumpTo: "q5_1" },
      { id: "C", text: "不太好用，不确定自己属于哪一类", jumpTo: "q5_1" },
      { id: "D", text: "没看懂这个自测怎么用", jumpTo: "q5_1" }
    ],
    defaultNext: "q6"
  },
  q5_1: {
    id: "q5_1",
    numberLabel: "5-1",
    title: "您觉得不好用的主要原因是什么？",
    type: "single",
    options: [
      { id: "A", text: "问题太笼统，不知道怎么选" },
      { id: "B", text: "选项和我自己的情况对不上" },
      { id: "C", text: "分型后内容太多" },
      { id: "D", text: "其他" }
    ],
    defaultNext: "q6",
    allowOtherText: true
  },
  q6: {
    id: "q6",
    numberLabel: "6",
    title: "手册中“看懂化验单”那部分，您觉得读起来费劲吗？",
    type: "single",
    options: [
      { id: "A", text: "不费劲，看完能对应自己的化验单", jumpTo: "q7" },
      { id: "B", text: "有一点费劲，但大部分能看懂", jumpTo: "q6_1" },
      { id: "C", text: "比较费劲，很多指标还是不懂", jumpTo: "q6_1" },
      { id: "D", text: "完全看不懂", jumpTo: "q6_1" }
    ],
    defaultNext: "q7"
  },
  q6_1: {
    id: "q6_1",
    numberLabel: "6-1",
    title: "您觉得费劲的主要原因是什么？",
    type: "single",
    options: [
      { id: "A", text: "表格太密，看着累" },
      { id: "B", text: "术语太多，看不懂" },
      { id: "C", text: "解释太少，看不懂" },
      { id: "D", text: "其他" }
    ],
    defaultNext: "q7",
    allowOtherText: true
  },
  q7: {
    id: "q7",
    numberLabel: "7",
    title: "手册说“所有 PCOS 治疗的基础是生活方式干预”，您读完之后：",
    type: "single",
    options: [
      { id: "A", text: "完全理解，也知道了怎么做", jumpTo: "q8" },
      { id: "B", text: "大致理解，但还不知道具体从哪里开始", jumpTo: "q7_1" },
      { id: "C", text: "字看懂了，但还不太明白为什么", jumpTo: "q7_1" },
      { id: "D", text: "没注意这个观点", jumpTo: "q8" }
    ],
    defaultNext: "q8"
  },
  q7_1: {
    id: "q7_1",
    numberLabel: "7-1",
    title: "您觉得没完全理解的主要原因是什么？",
    type: "single",
    options: [
      { id: "A", text: "讲解太抽象，缺少具体例子" },
      { id: "B", text: "内容太多，不知道从哪里开始执行" },
      { id: "C", text: "道理能懂，但感觉很难坚持" },
      { id: "D", text: "其他" }
    ],
    defaultNext: "q8",
    allowOtherText: true
  },
  q8: {
    id: "q8",
    numberLabel: "8",
    title: "关于二甲双胍的介绍，您觉得读完后能帮您判断自己适不适合用吗？",
    type: "single",
    options: [
      { id: "A", text: "能，很清楚", jumpTo: "q9" },
      { id: "B", text: "大致能", jumpTo: "q9" },
      { id: "C", text: "读完还是不太确定", jumpTo: "q8_1" },
      { id: "D", text: "没看明白", jumpTo: "q8_1" }
    ],
    defaultNext: "q9"
  },
  q8_1: {
    id: "q8_1",
    numberLabel: "8-1",
    title: "您觉得不清楚的主要原因是什么？",
    type: "single",
    options: [
      { id: "A", text: "适用人群写得不够具体" },
      { id: "B", text: "药物作用和副作用讲得不够清楚" },
      { id: "C", text: "不知道自己属不属于“胰岛素抵抗”" },
      { id: "D", text: "其他" }
    ],
    defaultNext: "q9",
    allowOtherText: true
  },
  q9: {
    id: "q9",
    numberLabel: "9",
    title: "关于来曲唑（促排卵药物）的介绍，您觉得读完后对您有帮助吗？",
    type: "single",
    options: [
      { id: "A", text: "很有帮助，明白了它是什么、适合谁", jumpTo: "q10" },
      { id: "B", text: "有一些帮助", jumpTo: "q10" },
      { id: "C", text: "帮助不大，还是不太懂", jumpTo: "q9_1" },
      { id: "D", text: "没怎么看这部分", jumpTo: "q10" }
    ],
    defaultNext: "q10"
  },
  q9_1: {
    id: "q9_1",
    numberLabel: "9-1",
    title: "您觉得帮助不大的主要原因是什么？",
    type: "single",
    options: [
      { id: "A", text: "讲得太专业，看不懂" },
      { id: "B", text: "和我的情况关系不大" },
      { id: "C", text: "缺少具体使用场景的说明" },
      { id: "D", text: "其他" }
    ],
    defaultNext: "q10",
    allowOtherText: true
  },
  q10: {
    id: "q10",
    numberLabel: "10",
    title: "关于 GLP-1 受体激动剂（司美格鲁肽等）的介绍，您读完之后：",
    type: "single",
    options: [
      { id: "A", text: "清楚了它的适用人群，知道不是所有人都能用", jumpTo: "q11" },
      { id: "B", text: "大概知道了，但不确定自己适不适合", jumpTo: "q11" },
      { id: "C", text: "有点困惑，感觉信息不够", jumpTo: "q10_1" },
      { id: "D", text: "没怎么看这部分", jumpTo: "q11" }
    ],
    defaultNext: "q11"
  },
  q10_1: {
    id: "q10_1",
    numberLabel: "10-1",
    title: "您觉得困惑的主要原因是什么？",
    type: "single",
    options: [
      { id: "A", text: "分不清它和二甲双胍的区别" },
      { id: "B", text: "不确定自己属不属于“适用人群”" },
      { id: "C", text: "内容太少，想了解更多" },
      { id: "D", text: "其他" }
    ],
    defaultNext: "q11",
    allowOtherText: true
  },
  q11: {
    id: "q11",
    numberLabel: "11",
    title: "关于青蒿素类化合物治疗 PCOS，您读完后有什么感受？",
    type: "multiple",
    options: [
      { id: "A", text: "明白目前还在研究阶段，不是成熟疗法" },
      { id: "B", text: "知道不能自行购买试用" },
      { id: "C", text: "还是有点想自己去试试" },
      { id: "D", text: "没怎么看这部分" }
    ],
    defaultNext: "q12"
  },
  q12: {
    id: "q12",
    numberLabel: "12",
    title: "手册中“如何理性看待新型疗法”这部分，您觉得：",
    type: "single",
    options: [
      { id: "A", text: "很有用，知道怎么辨别不靠谱的宣传了", jumpTo: "q13" },
      { id: "B", text: "有点用", jumpTo: "q13" },
      { id: "C", text: "没什么用", jumpTo: "q12_1" },
      { id: "D", text: "没怎么看这部分", jumpTo: "q13" }
    ],
    defaultNext: "q13"
  },
  q12_1: {
    id: "q12_1",
    numberLabel: "12-1",
    title: "您觉得没用的主要原因是什么？",
    type: "single",
    options: [
      { id: "A", text: "内容太空，没有具体例子" },
      { id: "B", text: "和我平时遇到的情况对不上" },
      { id: "C", text: "看完还是不知道怎么判断" },
      { id: "D", text: "其他" }
    ],
    defaultNext: "q13",
    allowOtherText: true
  },
  q13: {
    id: "q13",
    numberLabel: "13",
    title: "情绪调节方法（478呼吸法、5感正念、情绪日记），您读完之后：",
    type: "multiple",
    options: [
      { id: "A", text: "试过了，觉得有用" },
      { id: "B", text: "试过了，没什么感觉" },
      { id: "C", text: "还没试，但打算试" },
      { id: "D", text: "不打算试，觉得不适合自己", jumpTo: "q13_1" },
      { id: "E", text: "没怎么看这部分" }
    ],
    defaultNext: "q14"
  },
  q13_1: {
    id: "q13_1",
    numberLabel: "13-1",
    title: "您不打算试的主要原因是什么？",
    type: "single",
    options: [
      { id: "A", text: "太麻烦，不想花时间" },
      { id: "B", text: "感觉不会有效果" },
      { id: "C", text: "自己情绪还好，不需要" },
      { id: "D", text: "其他" }
    ],
    defaultNext: "q14",
    allowOtherText: true
  },
  q14: {
    id: "q14",
    numberLabel: "14",
    title: "手册中关于“什么情况下需要寻求心理帮助”的描述，您读完能记住吗？",
    type: "single",
    options: [
      { id: "A", text: "能记住，知道什么情况该求助", jumpTo: "q15" },
      { id: "B", text: "大致有印象，但说不清楚具体信号", jumpTo: "q14_1" },
      { id: "C", text: "没太记住具体内容", jumpTo: "q14_1" }
    ],
    defaultNext: "q15"
  },
  q14_1: {
    id: "q14_1",
    numberLabel: "14-1",
    title: "您觉得记不住的主要原因是什么？",
    type: "single",
    options: [
      { id: "A", text: "信号列得太多，记不住" },
      { id: "B", text: "和我的情况不太一样，没太在意" },
      { id: "C", text: "排版不够突出，看一遍就忘了" },
      { id: "D", text: "其他" }
    ],
    defaultNext: "q15",
    allowOtherText: true
  },
  q15: {
    id: "q15",
    numberLabel: "15",
    title: "手册里“就诊准备清单”和“提问话术”，您觉得：",
    type: "multiple",
    options: [
      { id: "A", text: "很实用，下次就诊准备照着做" },
      { id: "B", text: "看起来有用，但可能不会真的去做准备", jumpTo: "q15_1" },
      { id: "C", text: "感觉用处不大", jumpTo: "q15_1" },
      { id: "D", text: "没太注意这部分" }
    ],
    defaultNext: "q16"
  },
  q15_1: {
    id: "q15_1",
    numberLabel: "15-1",
    title: "您觉得实用度不高的主要原因是什么？",
    type: "single",
    options: [
      { id: "A", text: "清单太长了，懒得准备" },
      { id: "B", text: "清单太少了，不够全面" },
      { id: "C", text: "不知道该怎么开口问医生" },
      { id: "D", text: "其他" }
    ],
    defaultNext: "q16",
    allowOtherText: true
  },
  q16: {
    id: "q16",
    numberLabel: "16",
    title: "手册的文字和插画风格，您读起来感觉怎么样？",
    type: "single",
    options: [
      { id: "A", text: "很舒服，能读得进去", jumpTo: "q17" },
      { id: "B", text: "还可以，没什么压力", jumpTo: "q17" },
      { id: "C", text: "有点花哨，但还能接受", jumpTo: "q17" },
      { id: "D", text: "不太喜欢，觉得影响阅读", jumpTo: "q16_1" }
    ],
    defaultNext: "q17"
  },
  q16_1: {
    id: "q16_1",
    numberLabel: "16-1",
    title: "您觉得不太喜欢的主要原因是什么？",
    type: "single",
    options: [
      { id: "A", text: "插画太多，影响看内容" },
      { id: "B", text: "风格太柔和，不够专业" },
      { id: "C", text: "颜色太浅，看着费劲" },
      { id: "D", text: "其他" }
    ],
    defaultNext: "q17",
    allowOtherText: true
  },
  q17: {
    id: "q17",
    numberLabel: "17",
    title: "手册里的专业名词（胰岛素抵抗、HOMA-IR等），您觉得解释得够清楚吗？",
    type: "single",
    options: [
      { id: "A", text: "很清楚，能理解", jumpTo: "q18" },
      { id: "B", text: "大部分能懂，个别还是模糊", jumpTo: "q17_1" },
      { id: "C", text: "一半以上还是看不懂", jumpTo: "q17_1" },
      { id: "D", text: "完全没解释清楚", jumpTo: "q17_1" }
    ],
    defaultNext: "q18"
  },
  q17_1: {
    id: "q17_1",
    numberLabel: "17-1",
    title: "您觉得不清楚的主要原因是什么？",
    type: "single",
    options: [
      { id: "A", text: "名词太多，看不过来" },
      { id: "B", text: "解释太简单，还是不明白原理" },
      { id: "C", text: "比喻不太恰当，反而更糊涂了" },
      { id: "D", text: "缺少对应的身体信号说明" },
      { id: "E", text: "其他" }
    ],
    defaultNext: "q18",
    allowOtherText: true
  },
  q18: {
    id: "q18",
    numberLabel: "18",
    title: "六维度疗法对比表（第 9-10 页），您觉得能帮您区分不同药物的区别吗？",
    type: "single",
    options: [
      { id: "A", text: "能，看完很清晰", jumpTo: "q19" },
      { id: "B", text: "大致能分清", jumpTo: "q19" },
      { id: "C", text: "还是有点混淆", jumpTo: "q18_1" },
      { id: "D", text: "没太看这张表", jumpTo: "q18_2" }
    ],
    defaultNext: "q19"
  },
  q18_1: {
    id: "q18_1",
    numberLabel: "18-1",
    title: "您觉得混淆的主要原因是什么？",
    type: "single",
    options: [
      { id: "A", text: "表格信息太多，看不过来" },
      { id: "B", text: "专业术语太多，理解困难" },
      { id: "C", text: "对比维度不够清晰" },
      { id: "D", text: "其他" }
    ],
    defaultNext: "q19",
    allowOtherText: true
  },
  q18_2: {
    id: "q18_2",
    numberLabel: "18-2",
    title: "您没看这张表的主要原因是什么？",
    type: "single",
    options: [
      { id: "A", text: "没注意到这张表" },
      { id: "B", text: "看到内容太多就直接跳过了" },
      { id: "C", text: "觉得药物对比太专业，与自己无关" },
      { id: "D", text: "其他" }
    ],
    defaultNext: "q19",
    allowOtherText: true
  },
  q19: {
    id: "q19",
    numberLabel: "19",
    title: "手册中的饮食和运动建议，您觉得对您日常管理有实际帮助吗？",
    type: "single",
    options: [
      { id: "A", text: "很有帮助，已经开始执行了", jumpTo: "q20" },
      { id: "B", text: "有参考价值，会采纳一部分", jumpTo: "q19_1" },
      { id: "C", text: "帮助不大", jumpTo: "q19_1" },
      { id: "D", text: "完全没用", jumpTo: "q19_1" }
    ],
    defaultNext: "q20"
  },
  q19_1: {
    id: "q19_1",
    numberLabel: "19-1",
    title: "您觉得帮助不大的主要原因是什么？",
    type: "single",
    options: [
      { id: "A", text: "建议太笼统，不知道具体怎么做" },
      { id: "B", text: "和我平时的生活习惯差别太大" },
      { id: "C", text: "缺少具体的食谱或运动计划" },
      { id: "D", text: "知道该做但坚持不下来" },
      { id: "E", text: "其他" }
    ],
    defaultNext: "q20",
    allowOtherText: true
  },
  q20: {
    id: "q20",
    numberLabel: "20",
    title: "整体来看，您会给这本手册打几分？",
    type: "single",
    options: [
      { id: "A", text: "5分——非常满意，强烈推荐", jumpTo: "q21" },
      { id: "B", text: "4分——比较满意，大部分内容有用", jumpTo: "q20_1" },
      { id: "C", text: "3分——一般，部分内容有参考价值", jumpTo: "q20_1" },
      { id: "D", text: "2分——不太满意，多数内容用不上", jumpTo: "q20_1" },
      { id: "E", text: "1分——很不满意，没有帮助", jumpTo: "q20_1" }
    ],
    defaultNext: "q21"
  },
  q20_1: {
    id: "q20_1",
    numberLabel: "20-1",
    title: "您觉得扣分/不满意的主要原因是什么？",
    type: "single",
    options: [
      { id: "A", text: "内容太难懂，看不进去" },
      { id: "B", text: "内容太浅，深度不够" },
      { id: "C", text: "排版看着累，不想读" },
      { id: "D", text: "和我的情况对不上" },
      { id: "E", text: "其他" }
    ],
    defaultNext: "q21",
    allowOtherText: true
  },
  q21: {
    id: "q21",
    numberLabel: "21",
    title: "您希望手册再补充什么内容？",
    type: "multiple",
    options: [
      { id: "A", text: "更具体的三餐食谱示例" },
      { id: "B", text: "分体重、分阶段的运动计划" },
      { id: "C", text: "备孕全流程科普" },
      { id: "D", text: "青春期/围绝经期专属内容" },
      { id: "E", text: "药物副作用更多说明" },
      { id: "F", text: "不需要补充，已足够" },
      { id: "G", text: "其他" }
    ],
    defaultNext: "q22",
    allowOtherText: true
  },
  q22: {
    id: "q22",
    numberLabel: "22",
    title: "您觉得手册哪里可以优化？",
    type: "multiple",
    options: [
      { id: "A", text: "增加真实患者故事" },
      { id: "B", text: "再简化一些专业术语" },
      { id: "C", text: "附一张可打印的执行计划表" },
      { id: "D", text: "拆分版本：备孕专用版/单纯调经版" },
      { id: "E", text: "排版和内容挺好的，不用改" },
      { id: "F", text: "其他" }
    ],
    allowOtherText: true
  }
};
