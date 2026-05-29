const REVIEW_SYSTEM_PROMPT = `你是合同审查律师，用大白话解释合同风险。

任务：识别合同类型，检查风险点，输出JSON。

审查规则：
- 引用合同原文
- 大白话解释，不用法律术语
- 修改建议具体可操作
- 不确定的标注"无法判断"

各类合同审查要点：
- 借款：利率是否超LPR四倍（约15.4%）、违约金、担保、还款条件
- 租房：押金退还、租金涨幅、退租违约金、维修责任、转租限制
- 劳动：试用期、薪资结构、加班费、竞业限制、社保、解雇补偿
- 买卖：规格明确性、隐性费用、交货验收、质保退换、违约对等性
- 装修：报价单、增项限制、付款节点、材料规格、验收标准、保修
- 服务：范围明确性、隐性收费、退费条件、自动续费、服务质量标准

评分（0-100，越高越安全）：100无风险，80-99低风险，60-79中风险，40-59高风险少，0-39多处高风险

非合同回复：{"contractType":"非合同","summary":"未识别到合同内容","risks":[]}

输出严格JSON：
{
  "contractType": "类型",
  "score": 75,
  "summary": "一句话总结",
  "risks": [{
    "level": "高/中/低",
    "confidence": "高/中/低",
    "title": "风险名称",
    "clause": "合同原文",
    "explanation": "大白话解释",
    "suggestion": "修改建议",
    "reason": "判断依据",
    "citations": [{"law": "法律全称", "article": "条款号", "url": "https://flk.npc.gov.cn"}]
  }]
}

法条引用：每个风险至少一条法律依据，优先引用民法典、劳动法等常用法律，无法确定则confidence设"低"且citations为空数组，不要编造条款编号`;

function buildReviewPrompt(contractText) {
  return `请审查以下合同，自动识别合同类型并检查风险点：

---
${contractText}
---

请按照系统指令输出JSON格式的审查报告。`;
}

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const { text } = JSON.parse(event.body);

    if (!text || typeof text !== "string") {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "请提供合同文本" }) };
    }

    if (text.length > 50000) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "合同文本过长，请控制在5万字以内" }) };
    }

    const apiKey = process.env.XIAOMI_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: "服务未配置API密钥" }) };
    }

    const response = await fetch("https://token-plan-sgp.xiaomimimo.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "mimo-v2.5",
        messages: [
          { role: "system", content: REVIEW_SYSTEM_PROMPT },
          { role: "user", content: buildReviewPrompt(text) },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("MiMo API error:", err);
      return { statusCode: 502, headers, body: JSON.stringify({ error: "AI审查服务暂时不可用" }) };
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      return { statusCode: 502, headers, body: JSON.stringify({ error: "AI未返回结果" }) };
    }

    let jsonStr = content;
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1];
    }
    jsonStr = jsonStr.trim();

    const result = JSON.parse(jsonStr);

    return { statusCode: 200, headers, body: JSON.stringify(result) };
  } catch (error) {
    console.error("Review error:", error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "审查过程中出错" }) };
  }
};
