import { NextRequest, NextResponse } from "next/server";
import { REVIEW_SYSTEM_PROMPT, buildReviewPrompt } from "@/lib/prompts";

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "请提供合同文本" },
        { status: 400 }
      );
    }

    if (text.length > 50000) {
      return NextResponse.json(
        { error: "合同文本过长，请控制在5万字以内" },
        { status: 400 }
      );
    }

    const apiKey = process.env.XIAOMI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "服务未配置API密钥" },
        { status: 500 }
      );
    }

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
            { role: "system", content: REVIEW_SYSTEM_PROMPT },
            { role: "user", content: buildReviewPrompt(text) },
          ],
          temperature: 0.1,
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("MiMo API error:", err);
      return NextResponse.json(
        { error: "AI审查服务暂时不可用" },
        { status: 502 }
      );
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: "AI未返回结果" },
        { status: 502 }
      );
    }

    // 模型可能返回markdown代码块包裹的JSON，需要提取
    let jsonStr = content;
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1];
    }
    // 去掉可能的前后空白
    jsonStr = jsonStr.trim();

    const result = JSON.parse(jsonStr);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Review error:", error);
    return NextResponse.json(
      { error: "审查过程中出错" },
      { status: 500 }
    );
  }
}
