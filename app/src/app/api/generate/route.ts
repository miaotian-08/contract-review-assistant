import { NextRequest, NextResponse } from "next/server";

const ANNOTATED_PROMPT = `你是一位资深合同律师。用户会给你一份完整的合同文本，以及需要修改的风险条款和修改建议。你需要输出修改后的合同（批注版）。

## 规则
1. 只替换有风险的条款，其余部分一字不动
2. 替换后的条款必须合法合规
3. 使用正式的合同语言，保持与原文风格一致
4. 保留原文的所有格式、编号、分段

## 输出格式
对每个被修改的条款：
1. 在条款前用【修改说明：原因】标注修改原因
2. 用{{修改}}和{{/修改}}包裹修改后的条款正文

示例格式：
（前面未修改的内容...）

【修改说明：原条款违约金过高，已调整为法定上限】
{{修改}}
修改后的条款内容...
{{/修改}}

（后面未修改的内容...）`;

const CLEAN_PROMPT = `你是一位资深合同律师。用户会给你一份完整的合同文本，以及需要修改的风险条款和修改建议。你需要输出一份纯净的修改后合同。

## 规则
1. 只替换有风险的条款，其余部分一字不动
2. 替换后的条款必须合法合规
3. 使用正式的合同语言，保持与原文风格一致
4. 保留原文的所有格式、编号、分段
5. 不要添加任何批注、说明或标记，输出一份可以直接使用的合同`;

export async function POST(request: NextRequest) {
  try {
    const { contractType, contractText, suggestions, mode } =
      await request.json();

    if (!contractText) {
      return NextResponse.json({ error: "缺少合同原文" }, { status: 400 });
    }

    if (!suggestions || !Array.isArray(suggestions) || suggestions.length === 0) {
      return NextResponse.json({ error: "请选择要修改的风险点" }, { status: 400 });
    }

    const apiKey = process.env.XIAOMI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "服务未配置API密钥" }, { status: 500 });
    }

    const isAnnotated = mode === "annotated";
    const systemPrompt = isAnnotated ? ANNOTATED_PROMPT : CLEAN_PROMPT;

    const suggestionsText = suggestions
      .map(
        (
          s: { title: string; clause: string; suggestion: string },
          i: number
        ) =>
          `### 风险点${i + 1}：${s.title}\n原条款："${s.clause}"\n修改建议：${s.suggestion}`
      )
      .join("\n\n");

    const response = await fetch(
      "https://token-plan-sgp.xiaomimimo.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "mimo-v2.5",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `以下是${contractType}原文：\n\n---\n${contractText}\n---\n\n以下是有风险的条款和修改建议：\n\n${suggestionsText}\n\n请根据修改建议，输出修改后的完整合同。只替换上述风险条款，其余部分保持不变。`,
            },
          ],
          temperature: 0.1,
        }),
      }
    );

    if (!response.ok) {
      return NextResponse.json({ error: "生成失败" }, { status: 502 });
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content ?? "生成失败";

    return NextResponse.json({ modifiedText: content });
  } catch (error) {
    console.error("Generate error:", error);
    return NextResponse.json({ error: "生成过程中出错" }, { status: 500 });
  }
}
