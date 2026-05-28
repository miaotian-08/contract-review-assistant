"use client";

import { useState } from "react";
import type { ReviewResult, RiskItem } from "@/lib/types";
import { getLawUrl } from "@/lib/lawlinks";

interface ReportProps {
  result: ReviewResult;
  fileName: string;
  contractText: string;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  if (score >= 40) return "text-orange-600";
  return "text-red-600";
}

function getScoreGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

function getScoreLabel(score: number): string {
  if (score >= 90) return "合同条款较为公平";
  if (score >= 80) return "基本安全，有少量需注意";
  if (score >= 60) return "存在风险，建议修改后签署";
  if (score >= 40) return "风险较高，建议重点修改";
  return "风险极高，建议谨慎签署";
}

function ProgressBar({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
      <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24">
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
          fill="none"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
      {text}
    </div>
  );
}

function RiskCard({
  risk,
  checked,
  onToggle,
}: {
  risk: RiskItem;
  checked: boolean;
  onToggle: () => void;
}) {
  const levelBadge = {
    高: "bg-red-100 text-red-700",
    中: "bg-yellow-100 text-yellow-700",
    低: "bg-green-100 text-green-700",
  };

  const levelBorder = {
    高: "border-red-300",
    中: "border-yellow-300",
    低: "border-green-300",
  };

  const sectionBg = {
    高: "bg-red-50/50",
    中: "bg-yellow-50/50",
    低: "bg-green-50/50",
  };

  return (
    <div className={`border-2 rounded-xl overflow-hidden ${levelBorder[risk.level]}`}>
      {/* 标题行 */}
      <div className="flex items-center gap-3 p-4">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0"
        />
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${levelBadge[risk.level]}`}>
          {risk.level}风险
        </span>
        <span className="font-bold text-gray-800">{risk.title}</span>
      </div>

      {/* 分块区域 */}
      <div className={`px-4 pb-4 pl-11 space-y-3 text-sm ${sectionBg[risk.level]}`}>
        {/* 合同原文 */}
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <p className="text-xs font-semibold text-gray-400 mb-1">合同原文</p>
          <p className="text-gray-700 italic">&ldquo;{risk.clause}&rdquo;</p>
        </div>

        {/* 大白话解释 */}
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <p className="text-xs font-semibold text-gray-400 mb-1">大白话解释</p>
          <p className="text-gray-700">{risk.explanation}</p>
        </div>

        {/* 修改建议 */}
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <p className="text-xs font-semibold text-gray-400 mb-1">修改建议</p>
          <p className="text-gray-700">{risk.suggestion}</p>
        </div>

        {/* 判断依据 */}
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <p className="text-xs font-semibold text-gray-400 mb-1">判断依据</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">{risk.reason}</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 ml-auto shrink-0">
              置信度：{risk.confidence}
            </span>
          </div>
        </div>

        {/* 法律依据 */}
        {risk.citations && risk.citations.length > 0 && (
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <p className="text-xs font-semibold text-gray-400 mb-2">法律依据</p>
            <div className="space-y-2">
              {risk.citations.map((cite, ci) => {
                const lawName = (cite.law || "").replace(/[《》]/g, "");
                const articleNum = cite.article || "";
                const citeContent = cite.content || "";
                return (
                  <div key={ci} className="bg-blue-50 border border-blue-100 rounded-lg p-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-blue-800">
                        {lawName}{articleNum ? ` · ${articleNum}` : ""}
                      </span>
                      <a
                        href={getLawUrl(lawName, articleNum)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:text-blue-700 hover:underline"
                      >
                        查看
                      </a>
                    </div>
                    {citeContent && (
                      <p className="text-xs text-gray-700 leading-relaxed">{citeContent}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Report({
  result,
  fileName,
  contractText,
}: ReportProps) {
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(result.risks.map((_, i) => i))
  );

  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [progressText, setProgressText] = useState("");

  const [generating, setGenerating] = useState(false);
  const [annotatedText, setAnnotatedText] = useState("");
  const [cleanText, setCleanText] = useState("");

  const highCount = result.risks.filter((r) => r.level === "高").length;
  const midCount = result.risks.filter((r) => r.level === "中").length;
  const lowCount = result.risks.filter((r) => r.level === "低").length;

  const toggleSelect = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // 下载审查报告PDF
  const handleDownloadPDF = async () => {
    setDownloadingPdf(true);
    setProgressText("正在生成PDF...");

    try {
      const { default: jsPDF } = await import("jspdf");
      setProgressText("正在写入报告内容...");

      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Contract Review Report", 105, 20, { align: "center" });

      doc.setFontSize(11);
      doc.text(`File: ${fileName}`, 20, 35);
      doc.text(`Date: ${new Date().toLocaleDateString("zh-CN")}`, 20, 42);
      doc.text(`Type: ${result.contractType}`, 20, 49);
      doc.text(
        `Score: ${result.score}/100 (${getScoreGrade(result.score)})`,
        20,
        56
      );

      doc.setFontSize(12);
      doc.text("Summary:", 20, 70);
      doc.setFontSize(10);
      doc.text(result.summary || "N/A", 20, 78, { maxWidth: 170 });

      let y = 95;
      doc.setFontSize(12);
      doc.text(
        `Found ${result.risks.length} risk(s): High ${highCount} / Mid ${midCount} / Low ${lowCount}`,
        20,
        y
      );
      y += 12;

      result.risks.forEach((risk) => {
        if (y > 260) {
          doc.addPage();
          y = 20;
        }

        doc.setFontSize(11);
        doc.text(`[${risk.level.toUpperCase()}] ${risk.title}`, 20, y);
        y += 7;

        doc.setFontSize(9);
        doc.text(`Clause: "${risk.clause}"`, 25, y, { maxWidth: 165 });
        y += 12;

        doc.text(`Why: ${risk.explanation}`, 25, y, { maxWidth: 165 });
        y += 12;

        doc.text(`Suggestion: ${risk.suggestion}`, 25, y, { maxWidth: 165 });
        y += 15;
      });

      setProgressText("正在保存...");
      doc.save(`contract-review-${Date.now()}.pdf`);
    } finally {
      setDownloadingPdf(false);
      setProgressText("");
    }
  };

  // 生成修改后的合同（两种版本）
  const handleGenerateModified = async () => {
    const selectedRisks = result.risks.filter((_, i) => selected.has(i));
    if (selectedRisks.length === 0) return;

    setGenerating(true);
    setAnnotatedText("");
    setCleanText("");

    const suggestions = selectedRisks.map((r) => ({
      title: r.title,
      clause: r.clause,
      suggestion: r.suggestion,
    }));

    try {
      // 并行请求两个版本
      const [annotatedRes, cleanRes] = await Promise.all([
        fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contractType: result.contractType,
            contractText,
            suggestions,
            mode: "annotated",
          }),
        }),
        fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contractType: result.contractType,
            contractText,
            suggestions,
            mode: "clean",
          }),
        }),
      ]);

      if (!annotatedRes.ok || !cleanRes.ok) throw new Error("生成失败");

      const [annotatedData, cleanData] = await Promise.all([
        annotatedRes.json(),
        cleanRes.json(),
      ]);

      setAnnotatedText(annotatedData.modifiedText);
      setCleanText(cleanData.modifiedText);
    } catch {
      setAnnotatedText("生成失败，请重试");
    } finally {
      setGenerating(false);
    }
  };

  // 下载合同PDF
  const handleDownloadContract = async (
    text: string,
    suffix: string
  ) => {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF();

    doc.setFontSize(10);
    const lines = doc.splitTextToSize(text, 170);
    let y = 20;
    lines.forEach((line: string) => {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, 20, y);
      y += 5;
    });

    doc.save(`${suffix}-${Date.now()}.pdf`);
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* 评分卡 */}
      <div className="bg-white border rounded-2xl p-6 mb-6 text-center">
        <p className="text-sm text-gray-500 mb-1">
          {result.contractType}审查
        </p>
        <div
          className={`text-6xl font-bold ${getScoreColor(result.score)} mb-1`}
        >
          {result.score}
          <span className="text-2xl text-gray-400 font-normal">/100</span>
        </div>
        <p className={`text-lg font-medium ${getScoreColor(result.score)}`}>
          {getScoreGrade(result.score)}级 · {getScoreLabel(result.score)}
        </p>
      </div>

      {/* 汇总 */}
      <div className="bg-gray-50 rounded-xl p-5 mb-6">
        <p className="text-gray-700 mb-3">{result.summary}</p>
        <div className="flex gap-4 text-sm font-medium">
          {highCount > 0 && (
            <span className="text-red-600">高风险 {highCount} 处</span>
          )}
          {midCount > 0 && (
            <span className="text-yellow-600">中风险 {midCount} 处</span>
          )}
          {lowCount > 0 && (
            <span className="text-green-600">低风险 {lowCount} 处</span>
          )}
        </div>
      </div>

      {/* 风险列表 */}
      <div className="space-y-3 mb-8">
        {result.risks.map((risk, index) => (
          <RiskCard
            key={index}
            risk={risk}
            checked={selected.has(index)}
            onToggle={() => toggleSelect(index)}
          />
        ))}
      </div>

      {result.risks.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-4xl mb-3">✅</p>
          <p>未发现明显风险点</p>
        </div>
      )}

      {/* 操作区 */}
      {result.risks.length > 0 && (
        <div className="border-t pt-6 space-y-4">
          {/* 下载审查报告 */}
          {downloadingPdf ? (
            <ProgressBar text={progressText} />
          ) : (
            <button
              onClick={handleDownloadPDF}
              className="w-full border border-gray-300 text-gray-700 px-6 py-3 rounded-full hover:bg-gray-50 transition-colors font-medium"
            >
              下载审查报告 PDF
            </button>
          )}

          {/* 生成修改后合同 */}
          {generating ? (
            <ProgressBar text="正在生成修改后的合同，请稍候..." />
          ) : (
            <button
              onClick={handleGenerateModified}
              disabled={selected.size === 0}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-full hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              生成修改后合同 ({selected.size} 项)
            </button>
          )}

          {/* 生成结果 */}
          {(annotatedText || cleanText) && !generating && (
            <div className="space-y-4">
              {/* 批注版 */}
              {annotatedText && (
                <div className="bg-white border rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-gray-800">批注版</h3>
                      <p className="text-xs text-gray-500">
                        标注了修改内容和原因，方便对照查看
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        handleDownloadContract(annotatedText, "contract-annotated")
                      }
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      下载PDF
                    </button>
                  </div>
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                    {(() => {
                      // 解析批注版：识别修改说明和修改内容
                      const parts = annotatedText.split(
                        /(【修改说明：[^】]*】|\{\{修改\}\}|\{\{\/修改\}\})/g
                      );
                      let inModified = false;
                      return parts.map((part, i) => {
                        if (part.startsWith("【修改说明")) {
                          return (
                            <span
                              key={i}
                              className="block my-2 px-3 py-2 bg-amber-100 border-l-4 border-amber-500 text-amber-800 rounded-r font-semibold not-italic"
                            >
                              {part}
                            </span>
                          );
                        }
                        if (part === "{{修改}}") {
                          inModified = true;
                          return null;
                        }
                        if (part === "{{/修改}}") {
                          inModified = false;
                          return null;
                        }
                        if (inModified) {
                          return (
                            <span
                              key={i}
                              className="block bg-green-50 border-l-4 border-green-500 px-3 py-2 my-1 text-green-800 not-italic"
                            >
                              {part}
                            </span>
                          );
                        }
                        return <span key={i}>{part}</span>;
                      });
                    })()}
                  </pre>
                </div>
              )}

              {/* 纯净版 */}
              {cleanText && (
                <div className="bg-white border rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-gray-800">纯净版</h3>
                      <p className="text-xs text-gray-500">
                        直接可用的合同，无批注
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        handleDownloadContract(cleanText, "contract-clean")
                      }
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      下载PDF
                    </button>
                  </div>
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                    {cleanText}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
