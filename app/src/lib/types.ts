export interface Citation {
  law: string; // 法律名称
  article: string; // 条款编号
  content: string; // 法条原文
  url: string; // 验证链接
}

export interface RiskItem {
  level: "高" | "中" | "低";
  confidence: "高" | "中" | "低";
  title: string;
  clause: string; // 合同原文引用
  explanation: string; // 大白话解释
  suggestion: string; // 修改建议
  reason: string; // 判断依据
  citations: Citation[]; // 法条引用
}

export interface ReviewResult {
  contractType: string;
  score: number; // 0-100，越高越安全
  summary: string;
  risks: RiskItem[];
}
