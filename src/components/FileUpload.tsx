"use client";

import { useCallback, useState } from "react";

interface FileUploadProps {
  onTextExtracted: (text: string, fileName: string) => void;
  onStatusChange: (status: string) => void;
}

export default function FileUpload({
  onTextExtracted,
  onStatusChange,
}: FileUploadProps) {
  const [errorMsg, setErrorMsg] = useState("");

  const extractText = useCallback(
    async (file: File) => {
      setErrorMsg("");
      onStatusChange("正在识别文件...");

      try {
        let text = "";

        if (file.type === "application/pdf") {
          const { PDFParse } = await import("pdf-parse");
          const arrayBuffer = await file.arrayBuffer();
          const parser = new PDFParse({ data: arrayBuffer });
          const result = await parser.getText();
          await parser.destroy();
          text = result.text;
        } else if (
          file.type ===
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
          file.name.endsWith(".docx")
        ) {
          const mammoth = await import("mammoth");
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          text = result.value;
        } else {
          throw new Error("不支持的文件格式：" + file.type);
        }

        if (!text.trim()) {
          throw new Error("文件内容为空");
        }

        onStatusChange("识别完成，开始审查...");
        onTextExtracted(text, file.name);
      } catch (err) {
        console.error("解析失败:", err);
        const msg = err instanceof Error ? err.message : "解析失败";
        setErrorMsg(msg);
      }
    },
    [onTextExtracted, onStatusChange]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      extractText(file);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept=".pdf,.docx"
        onChange={handleChange}
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer"
      />
      <p className="mt-3 text-sm text-gray-400">
        支持 PDF 和 Word (.docx) 格式
      </p>

      {errorMsg && (
        <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm">
          错误：{errorMsg}
        </div>
      )}
    </div>
  );
}
