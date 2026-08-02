import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, ChevronRight, ChevronLeft, Send, Sparkles, Star } from 'lucide-react';
import { feedbackQuestions, QuestionnaireItem, QuestionnaireOption } from '../questionnaireData';

interface QuestionnaireFormProps {
  onSubmit: (answers: Record<string, any>, commentSummary: string, rating?: number) => Promise<void>;
  isSubmitting: boolean;
  isSubmitted: boolean;
}

export const QuestionnaireForm: React.FC<QuestionnaireFormProps> = ({
  onSubmit,
  isSubmitting,
  isSubmitted
}) => {
  const [currentId, setCurrentId] = useState<string>("q4");
  const [history, setHistory] = useState<string[]>(["q4"]);
  const [answers, setAnswers] = useState<Record<string, { selected: string[]; otherText?: string }>>({});
  const [rating, setRating] = useState<number>(5);
  const autoJumpTimerRef = useRef<NodeJS.Timeout | null>(null);

  const currentQuestion: QuestionnaireItem | undefined = feedbackQuestions[currentId];
  const currentAnswer = answers[currentId] || { selected: [] };

  if (isSubmitted) {
    return (
      <div className="bg-[#eaf7ee] border border-[#d1ead8] p-6 rounded-3xl text-center space-y-3 shadow-xs">
        <div className="w-12 h-12 bg-white text-[#1e5631] border border-[#d1ead8] rounded-full flex items-center justify-center mx-auto shadow-xs">
          <Check size={24} className="stroke-[3]" />
        </div>
        <h4 className="text-base font-serif font-bold text-[#1e5631]">感谢您的宝贵反馈！</h4>
        <p className="text-xs text-[#1e5631]/80 leading-relaxed max-w-md mx-auto">
          您针对《PCOS治疗知情辅助手册》内容、排版及指南条目的逐项评估意见已成功保存至后台病历。我们将持续依据循证医学依据迭代本手册。
        </p>
      </div>
    );
  }

  if (!currentQuestion) {
    return null;
  }

  const getNextQuestionIdForOption = (optId: string): string | null => {
    if (currentQuestion.type === "single") {
      const selectedOpt = currentQuestion.options.find(o => o.id === optId);
      if (selectedOpt?.jumpTo) {
        return selectedOpt.jumpTo;
      }
      return currentQuestion.defaultNext || null;
    }
    return currentQuestion.defaultNext || null;
  };

  const handleSelectOption = (option: QuestionnaireOption) => {
    if (autoJumpTimerRef.current) {
      clearTimeout(autoJumpTimerRef.current);
    }

    if (currentQuestion.type === "single") {
      const newAnswers = {
        ...answers,
        [currentId]: { selected: [option.id], otherText: answers[currentId]?.otherText || "" }
      };
      setAnswers(newAnswers);

      // Auto update star rating if Q20
      if (currentId === "q20") {
        if (option.id === "A") setRating(5);
        else if (option.id === "B") setRating(4);
        else if (option.id === "C") setRating(3);
        else if (option.id === "D") setRating(2);
        else if (option.id === "E") setRating(1);
      }

      const targetNext = option.jumpTo || currentQuestion.defaultNext || null;
      if (targetNext) {
        // Auto-jump after 200ms
        autoJumpTimerRef.current = setTimeout(() => {
          setHistory(prev => [...prev, targetNext]);
          setCurrentId(targetNext);
        }, 220);
      }
    } else {
      const prevSelected = currentAnswer.selected || [];
      const isSelected = prevSelected.includes(option.id);
      const newSelected = isSelected
        ? prevSelected.filter(id => id !== option.id)
        : [...prevSelected, option.id];
      setAnswers(prev => ({
        ...prev,
        [currentId]: { selected: newSelected, otherText: prev[currentId]?.otherText || "" }
      }));
    }
  };

  const handleOtherTextChange = (text: string) => {
    setAnswers(prev => ({
      ...prev,
      [currentId]: { ...prev[currentId], selected: prev[currentId]?.selected || [], otherText: text }
    }));
  };

  const getNextQuestionId = (): string | null => {
    const selectedIds = currentAnswer.selected || [];
    if (selectedIds.length === 0) return null;

    if (currentQuestion.type === "single") {
      const selectedOpt = currentQuestion.options.find(o => o.id === selectedIds[0]);
      if (selectedOpt?.jumpTo) {
        return selectedOpt.jumpTo;
      }
      return currentQuestion.defaultNext || null;
    } else {
      for (const id of selectedIds) {
        const opt = currentQuestion.options.find(o => o.id === id);
        if (opt?.jumpTo) {
          return opt.jumpTo;
        }
      }
      return currentQuestion.defaultNext || null;
    }
  };

  const nextId = getNextQuestionId();
  const isEnd = !nextId;

  const handleSubmit = async () => {
    const formattedSummary = Object.entries(answers)
      .map(([qId, ans]) => {
        const q = feedbackQuestions[qId];
        if (!q) return "";
        const typedAns = ans as { selected: string[]; otherText?: string };
        const optTexts = typedAns.selected.map(sId => {
          const opt = q.options.find(o => o.id === sId);
          return opt ? `${opt.id}. ${opt.text}` : sId;
        }).join("; ");
        const other = typedAns.otherText ? ` (备注: ${typedAns.otherText})` : "";
        return `【Q${q.numberLabel}】${optTexts}${other}`;
      })
      .filter(Boolean)
      .join("\n");

    await onSubmit(answers, formattedSummary, rating);
  };

  const handleNext = async () => {
    if (currentAnswer.selected.length === 0) return;

    if (isEnd) {
      await handleSubmit();
    } else if (nextId) {
      setHistory(prev => [...prev, nextId]);
      setCurrentId(nextId);
    }
  };

  const handlePrev = () => {
    if (autoJumpTimerRef.current) {
      clearTimeout(autoJumpTimerRef.current);
    }
    if (history.length <= 1) return;
    const newHistory = [...history];
    newHistory.pop();
    const prevId = newHistory[newHistory.length - 1];
    setHistory(newHistory);
    setCurrentId(prevId);
  };

  const isCurrentOtherSelected = currentQuestion.options.some(
    o => currentAnswer.selected.includes(o.id) && (o.text.includes("其他") || currentQuestion.allowOtherText)
  );

  return (
    <div className="bg-[#fffdf9]/95 rounded-3xl border border-watercolor-border/60 p-5 md:p-7 shadow-xs relative overflow-hidden space-y-5 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-watercolor-border/30 pb-3.5 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#fdf1f5] border border-[#fbdce2] text-watercolor-title rounded-xl shrink-0">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="text-sm md:text-base font-serif font-bold text-watercolor-title">
              《PCOS治疗知情辅助手册》阅读与测评反馈问卷
            </h3>
            <p className="text-[10px] text-[#666] font-mono">PCOS INFORMED GUIDE FEEDBACK</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <span className="text-[10px] font-serif font-bold text-[#782828] bg-rose-50 border border-rose-200/60 px-2 py-0.5 rounded-md">
            {currentQuestion.type === "single" ? "单选题" : "多选题"}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
        <div 
          className="bg-watercolor-title h-full transition-all duration-300"
          style={{ width: `${Math.min(100, (history.length / 18) * 100)}%` }}
        ></div>
      </div>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentId}
          initial={{ opacity: 0, x: 15 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -15 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
        >
          <h4 className="text-sm md:text-base font-serif font-bold text-watercolor-title leading-snug">
            {currentQuestion.title}
          </h4>

          <div className="space-y-2.5">
            {currentQuestion.options.map((opt) => {
              const isSelected = currentAnswer.selected.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectOption(opt)}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? "bg-[#fdf1f5] border-watercolor-title text-watercolor-title font-bold shadow-2xs"
                      : "bg-white border-watercolor-border/40 text-[#444] hover:bg-[#fffdf9] hover:border-watercolor-title/40"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-mono font-bold ${
                      isSelected
                        ? "bg-watercolor-title text-white border-watercolor-title"
                        : "bg-gray-50 border-gray-300 text-gray-600"
                    }`}>
                      {opt.id}
                    </span>
                    <span className="text-xs md:text-sm font-sans">{opt.text}</span>
                  </div>
                  {isSelected && <Check size={16} className="text-watercolor-title shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>

          {/* Optional Text Input for "其他" */}
          {isCurrentOtherSelected && (
            <div className="pt-2">
              <label className="block text-xs font-medium text-[#666] mb-1">
                请输入补充说明（选填）：
              </label>
              <input
                type="text"
                value={currentAnswer.otherText || ""}
                onChange={(e) => handleOtherTextChange(e.target.value)}
                placeholder="在此输入您的具体修改或补充意见..."
                className="w-full bg-white border border-watercolor-border/40 rounded-xl p-2.5 text-xs focus:border-watercolor-title/60 outline-none text-[#333]"
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Special Overall Rating on Q20 */}
      {currentId === "q20" && (
        <div className="bg-[#faf6f0] border border-[#ebd9c8] p-3.5 rounded-2xl space-y-2 text-center">
          <span className="text-xs font-serif font-bold text-watercolor-title block">对《PCOS治疗知情辅助手册》整体实用度打分：</span>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="p-1 cursor-pointer transition-transform hover:scale-110"
              >
                <Star
                  size={24}
                  className={star <= rating ? "fill-amber-400 text-amber-500" : "text-gray-300"}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-3 border-t border-watercolor-border/30">
        <button
          type="button"
          onClick={handlePrev}
          disabled={history.length <= 1}
          className="px-4 py-2 border border-watercolor-border/50 bg-white text-[#555] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 rounded-xl text-xs font-serif font-bold flex items-center gap-1 transition-all cursor-pointer"
        >
          <ChevronLeft size={14} />
          <span>上一题</span>
        </button>

        {/* 
          Requirements:
          - Single choice: No 'Next Question' button; options auto-jump.
          - Multiple choice: Keep 'Next Question' button.
          - On final question (isEnd): Always show 'Submit Questionnaire' button in bottom right.
        */}
        {(currentQuestion.type === "multiple" || isEnd) && (
          <button
            type="button"
            onClick={isEnd ? handleSubmit : handleNext}
            disabled={currentAnswer.selected.length === 0 || isSubmitting}
            className="px-5 py-2.5 bg-watercolor-title hover:bg-[#8f3a3a] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-serif font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ml-auto"
          >
            {isSubmitting ? (
              <span>正在提交...</span>
            ) : isEnd ? (
              <>
                <span>提交问卷</span>
                <Send size={13} />
              </>
            ) : (
              <>
                <span>下一题</span>
                <ChevronRight size={14} />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
