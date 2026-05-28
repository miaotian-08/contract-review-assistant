"use client";

import { useState, useCallback } from "react";
import FileUpload from "@/components/FileUpload";
import Report from "@/components/Report";
import type { ReviewResult } from "@/lib/types";

type Step = "upload" | "processing" | "result";

export default function Home() {
  const [step, setStep] = useState<Step>("upload");
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [contractText, setContractText] = useState("");

  const handleTextExtracted = useCallback(
    async (text: string, name: string) => {
      setFileName(name);
      setContractText(text);
      setStep("processing");
      setStatus("AI正在审查合同...");
      setError("");

      try {
        const res = await fetch("/api/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "审查失败");
        }

        const data: ReviewResult = await res.json();
        setResult(data);
        setStep("result");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "审查失败，请重试";
        setError(msg);
        setStep("upload");
      }
    },
    []
  );

  const handleReset = () => {
    setStep("upload");
    setResult(null);
    setFileName("");
    setError("");
    setStatus("");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <h1 className="text-xl font-bold text-gray-800">合同审查助手</h1>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        {step === "upload" && (
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-800 mb-3">
              合同看不懂？
            </h2>
            <p className="text-lg text-gray-500 mb-10">
              上传一份，1分钟告诉你哪里有坑。
            </p>

            <FileUpload
              onTextExtracted={handleTextExtracted}
              onStatusChange={setStatus}
            />

            <p className="mt-4 text-sm text-gray-400">
              拍照也行 · PDF/Word都行 · 不用注册
            </p>

            {error && (
              <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">
                {error}
              </div>
            )}
          </div>
        )}

        {step === "processing" && (
          <div className="text-center py-20">
            <div className="inline-block animate-spin text-4xl mb-6">⚙️</div>
            <p className="text-lg text-gray-600 mb-2">{status}</p>
            <p className="text-sm text-gray-400">通常需要10-30秒</p>
          </div>
        )}

        {step === "result" && result && (
          <div>
            <Report result={result} fileName={fileName} contractText={contractText} />
            <div className="text-center mt-10">
              <button
                onClick={handleReset}
                className="bg-blue-600 text-white px-6 py-3 rounded-full hover:bg-blue-700 transition-colors"
              >
                审查另一份合同
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-white mt-12">
        <div className="max-w-3xl mx-auto px-6 py-4 text-center text-xs text-gray-400">
          本工具仅供参考，不构成法律意见。重要合同请咨询专业律师。
        </div>
      </footer>
    </div>
  );
}
