/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Chế độ Học tập & Câu hỏi Dự đoán (Mục 9 đặc tả EM_INDUCTION_3D_LAB_SPEC_V2).
 * Học sinh chọn dự đoán trước, sau đó bấm "Chạy kiểm chứng trên mô hình" để đối chiếu kết quả thật.
 */

import React, { useState } from 'react';
import { CheckCircle2, Play, HelpCircle, AlertCircle } from 'lucide-react';
import { PhysicsState, SimulationParams } from '../physics/emPhysics';

export interface QuizQuestion {
  id: number;
  question: string;
  options: Array<{ id: string; text: string }>;
  correctOptionId: string;
  explanation: string;
  actionLabel: string;
  triggerAction: () => void;
}

interface PredictionQuizProps {
  state: PhysicsState;
  params: SimulationParams;
  onTriggerScenario: (
    scenario: 'approach_n' | 'recede_n' | 'hold_still' | 'switch_off_em'
  ) => void;
}

export const PredictionQuiz: React.FC<PredictionQuizProps> = ({
  state,
  params,
  onTriggerScenario,
}) => {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [verifiedQuestions, setVerifiedQuestions] = useState<Record<number, boolean>>({});

  const questions: QuizQuestion[] = [
    {
      id: 1,
      question:
        'Câu 1. Điều gì xảy ra với kim điện kế khi đưa nam châm lại gần cuộn dây?',
      options: [
        {
          id: 'A',
          text: 'A. Kim lệch khỏi vạch 0 trong lúc từ thông qua cuộn dây đang biến thiên.',
        },
        { id: 'B', text: 'B. Kim luôn đứng yên ở vạch 0.' },
        {
          id: 'C',
          text: 'C. Kim giữ nguyên góc lệch mãi mãi kể cả khi nam châm đã dừng lại.',
        },
      ],
      correctOptionId: 'A',
      explanation:
        'Theo định luật Faraday, suất điện động cảm ứng E = −N·dΦ/dt chỉ xuất hiện khi từ thông đang biến thiên (trong lúc nam châm đang di chuyển lại gần). Khi nam châm dừng lại, dΦ/dt = 0 nên kim trở về 0.',
      actionLabel: 'Thử đưa nam châm lại gần',
      triggerAction: () => onTriggerScenario('approach_n'),
    },
    {
      id: 2,
      question:
        'Câu 2. Khi kéo nam châm ra xa trong cùng cấu hình cực từ, chiều dòng điện cảm ứng thay đổi thế nào?',
      options: [
        {
          id: 'A',
          text: 'A. Giữ nguyên chiều như lúc tiến lại gần.',
        },
        {
          id: 'B',
          text: 'B. Đảo ngược chiều so với lúc đưa nam châm lại gần (kim lệch về phía ngược lại).',
        },
        {
          id: 'C',
          text: 'C. Dòng điện cảm ứng bằng 0 trong suốt lúc kéo ra xa.',
        },
      ],
      correctOptionId: 'B',
      explanation:
        'Khi kéo nam châm ra xa, từ thông giảm nên dấu của tốc độ biến thiên dΦ/dt đảo ngược so với lúc tiến lại gần. Theo định luật Lenz, dòng điện cảm ứng đổi chiều để chống lại sự giảm từ thông.',
      actionLabel: 'Thử kéo nam châm ra xa',
      triggerAction: () => onTriggerScenario('recede_n'),
    },
    {
      id: 3,
      question:
        'Câu 3. Khi nam châm đứng yên tương đối với cuộn dây (dù đặt sát cuộn dây), vì sao kim điện kế trở về 0?',
      options: [
        {
          id: 'A',
          text: 'A. Vì từ trường của nam châm biến mất khi đứng yên.',
        },
        {
          id: 'B',
          text: 'B. Vì từ thông qua cuộn dây không biến thiên theo thời gian (dΦ/dt = 0) nên suất điện động cảm ứng bằng 0.',
        },
        {
          id: 'C',
          text: 'C. Vì cuộn dây đồng ngăn cản từ thông đi qua.',
        },
      ],
      correctOptionId: 'B',
      explanation:
        'Khi nam châm đứng yên ở gần cuộn dây, từ thông Φ vẫn khác 0 nhưng không thay đổi theo thời gian (dΦ/dt = 0). Do đó E = −N·dΦ/dt = 0 và không có dòng điện cảm ứng.',
      actionLabel: 'Đặt nam châm đứng yên sát cuộn dây',
      triggerAction: () => onTriggerScenario('hold_still'),
    },
    {
      id: 4,
      question:
        'Câu 4. Khi ngắt công tắc nam châm điện, tại sao kim điện kế lệch theo chiều ngược với lúc vừa đóng công tắc?',
      options: [
        {
          id: 'A',
          text: 'A. Vì lúc đóng công tắc dòng sơ cấp tăng (dIp/dt > 0, từ thông tăng), còn lúc ngắt công tắc dòng sơ cấp suy giảm (dIp/dt < 0, từ thông giảm).',
        },
        {
          id: 'B',
          text: 'B. Vì nguồn điện tự động đảo cực khi ngắt công tắc.',
        },
        {
          id: 'C',
          text: 'C. Vì hai cuộn dây chạm điện trực tiếp với nhau.',
        },
      ],
      correctOptionId: 'A',
      explanation:
        'Khi đóng khóa K, dòng điện sơ cấp tăng làm từ thông thứ cấp tăng (dΦ/dt > 0). Khi ngắt khóa K, dòng sơ cấp suy giảm về 0 làm từ thông thứ cấp giảm (dΦ/dt < 0), khiến suất điện động E_s = −M·dIp/dt đổi dấu.',
      actionLabel: 'Kiểm chứng ngắt khóa K nam châm điện',
      triggerAction: () => onTriggerScenario('switch_off_em'),
    },
  ];

  const handleSelect = (qId: number, optId: string) => {
    setSelectedAnswers((prev) => ({ ...prev, [qId]: optId }));
  };

  const handleVerify = (q: QuizQuestion) => {
    setVerifiedQuestions((prev) => ({ ...prev, [q.id]: true }));
    q.triggerAction();
  };

  return (
    <div className="space-y-3">
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 text-xs text-slate-300 flex items-center justify-between gap-2">
        <span>
          Hãy chọn đáp án dự đoán của em trước, sau đó bấm <strong>Kiểm chứng trên mô hình</strong> để quan sát kết quả thật từ hệ phương trình vật lí.
        </span>
        <span className="font-mono text-sky-400 shrink-0">
          E = {state.emf >= 0 ? `+${state.emf.toFixed(2)}` : state.emf.toFixed(2)} · Kim: {state.needleAngleDeg.toFixed(1)}°
        </span>
      </div>

      {questions.map((q) => {
        const chosen = selectedAnswers[q.id];
        const isVerified = verifiedQuestions[q.id];
        const isCorrect = chosen === q.correctOptionId;

        return (
          <div
            key={q.id}
            className="bg-slate-900/75 border border-slate-800 rounded-xl p-3.5 space-y-2.5"
          >
            <h4 className="text-sm font-semibold text-slate-100 leading-snug">
              {q.question}
            </h4>

            <div className="space-y-1.5">
              {q.options.map((opt) => {
                const isSelected = chosen === opt.id;
                let btnStyle =
                  'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700';
                if (isSelected) {
                  btnStyle =
                    'bg-sky-950/80 border-sky-500 text-sky-100 font-medium';
                }
                if (isVerified && opt.id === q.correctOptionId) {
                  btnStyle =
                    'bg-emerald-950/70 border-emerald-500 text-emerald-100 font-medium';
                } else if (isVerified && isSelected && !isCorrect) {
                  btnStyle = 'bg-rose-950/70 border-rose-500 text-rose-100';
                }

                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelect(q.id, opt.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border text-xs sm:text-sm transition-colors min-h-[44px] flex items-center justify-between gap-2 ${btnStyle}`}
                  >
                    <span>{opt.text}</span>
                    {isVerified && opt.id === q.correctOptionId && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <button
                type="button"
                disabled={!chosen}
                onClick={() => handleVerify(q)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold min-h-[42px] transition-colors ${
                  chosen
                    ? 'bg-sky-600 hover:bg-sky-500 text-white cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Play className="w-3.5 h-3.5" />
                <span>{q.actionLabel}</span>
              </button>

              {!chosen && (
                <span className="text-xs text-slate-400 inline-flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5" />
                  Chọn 1 dự đoán để mở khóa kiểm chứng
                </span>
              )}
            </div>

            {isVerified && (
              <div
                className={`p-3 rounded-lg border text-xs leading-relaxed ${
                  isCorrect
                    ? 'bg-emerald-950/40 border-emerald-800/70 text-emerald-200'
                    : 'bg-amber-950/40 border-amber-800/70 text-amber-200'
                }`}
              >
                <div className="font-semibold mb-1 flex items-center gap-1.5">
                  {isCorrect ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                  <span>
                    {isCorrect
                      ? 'Dự đoán chính xác!'
                      : `Chưa chính xác — Đáp án đúng là ${q.correctOptionId}.`}
                  </span>
                </div>
                <p>{q.explanation}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
