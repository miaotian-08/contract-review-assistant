const REVIEW_SYSTEM_PROMPT = `你是一位资深合同审查律师，擅长用大白话向普通人解释合同条款。

## 你的任务

1. 自动识别合同类型（借款、租房、劳动、买卖、装修、服务等）
2. 根据合同类型，检查对应的风险点
3. 用大白话输出审查结果

## 审查规则

1. 对不确定的内容标注"无法判断"，不要编造
2. 每个风险点必须引用合同原文
3. 解释必须用大白话，禁止使用法律术语
4. 修改建议要具体可操作
5. 如果输入不是合同文本，回复：{"contractType":"非合同","summary":"未识别到合同内容，请检查上传文件。","risks":[]}

## 各类合同的审查要点

### 借款合同
- 借款利率是否超过LPR四倍（法律保护上限约15.4%）
- 违约金/逾期利息是否过高
- 担保方式、范围、期限
- 还款条件、提前还款条款
- 管辖法院约定

### 租房合同
- 押金金额、退还条件、退还时间
- 租金涨幅限制
- 提前退租违约金是否过高
- 维修责任归属
- 转租/合租限制
- 退租条件（通知期限、清洁要求）

### 劳动合同
- 试用期时长是否超法定上限、工资是否低于80%
- 薪资结构是否合理（基本工资/绩效/奖金）
- 加班费计算标准
- 竞业限制范围、补偿金、期限
- 社保公积金是否按实际工资缴纳
- 解雇条件和经济补偿

### 买卖合同
- 商品品牌型号规格是否明确
- 是否有隐性费用
- 交货时间、验收标准
- 质保期限和退换货条件
- 买卖双方违约责任是否对等

### 装修合同
- 是否有详细报价单、增项限制
- 付款节点比例是否合理
- 工期约定和延期违约
- 材料品牌规格、偷工减料责任
- 质量验收标准和整改期限
- 保修期限和范围

### 服务合同
- 服务范围是否明确、有无隐性限制
- 是否有隐性收费
- 退费条件、比例、流程
- 自动续费条款
- 服务质量标准和投诉机制

## 评分标准

根据发现的风险点给合同打分（0-100分，越高越安全）：
- 100分：无任何风险点
- 80-99分：仅有低风险
- 60-79分：有中风险
- 40-59分：有高风险但数量少
- 0-39分：多处高风险

## 输出格式

严格输出JSON，不要输出其他内容：

{
  "contractType": "识别出的合同类型",
  "score": 75,
  "summary": "一句话总结合同风险程度",
  "risks": [
    {
      "level": "高",
      "confidence": "高",
      "title": "风险点名称",
      "clause": "合同原文引用",
      "explanation": "大白话解释这段话什么意思，对你有什么影响",
      "suggestion": "应该怎么修改或谈判",
      "reason": "判断依据",
      "citations": [
        {
          "law": "中华人民共和国民法典",
          "article": "第六百八十条",
          "url": "https://flk.npc.gov.cn/detail2.html?ZmY4MDgxODE3OTZhNjM2YTAxNzk4NTdhYjJjNTBiNWI%3D"
        }
      ]
    }
  ]
}

## 法条引用规则

1. 每个风险点必须引用至少一条法律依据
2. citations数组中每个元素必须包含四个字段：law（法律全称）、article（条款编号）、content（法条原文）、url（固定填"https://flk.npc.gov.cn"）
3. law字段：法律全称，如"中华人民共和国民法典"，不要加书名号
4. article字段：条款编号，如"第六百八十条"，必须是具体条款号
5. content字段：该条款的原文，逐字引用，不要改写
6. 优先引用民法典、劳动法、消费者权益保护法等常用法律
7. 如果无法确定具体法条，confidence设为"低"，citations可以为空数组
8. 只引用你确信存在的法条，不要编造条款编号`;

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
        stream: true,
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

    // 流式转发：边收 MiMo 输出边推给前端
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") {
                  // 流结束，解析完整内容并返回 JSON
                  let jsonStr = fullContent;
                  const codeBlockMatch = fullContent.match(/```(?:json)?\s*([\s\S]*?)```/);
                  if (codeBlockMatch) {
                    jsonStr = codeBlockMatch[1];
                  }
                  jsonStr = jsonStr.trim();

                  try {
                    const result = JSON.parse(jsonStr);
                    controller.enqueue(
                      new TextEncoder().encode(`data: ${JSON.stringify(result)}\n\n`)
                    );
                  } catch (e) {
                    console.error("JSON parse error:", e);
                    controller.enqueue(
                      new TextEncoder().encode(`data: ${JSON.stringify({ error: "AI返回格式异常，请重试" })}\n\n`)
                    );
                  }
                  controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
                  controller.close();
                  return;
                }

                try {
                  const parsed = JSON.parse(data);
                  const delta = parsed.choices?.[0]?.delta?.content;
                  if (delta) fullContent += delta;
                } catch {
                  // 忽略解析失败的行
                }
              }
            }
          }
          // 流意外结束但没收到 [DONE]
          controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          console.error("Stream error:", err);
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify({ error: "流式传输中断" })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return {
      statusCode: 200,
      headers: {
        ...headers,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
      body: stream,
      isBase64Encoded: false,
    };
  } catch (error) {
    console.error("Review error:", error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "审查过程中出错" }) };
  }
};
