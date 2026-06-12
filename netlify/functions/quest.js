exports.handler = async function(event) {
  if(event.httpMethod !== "POST") return { statusCode:405, body:"Method Not Allowed" };

  try {
    const { prompt } = JSON.parse(event.body);
    const apiKey = process.env.GROQ_API_KEY || "";
    if(!apiKey) return { statusCode:500, body: JSON.stringify({ error:"GROQ_API_KEY not set" }) };

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1200,
        temperature: 0.8,
      }),
    });

    const data = await res.json();

    if(!res.ok) {
      return { statusCode: res.status, body: JSON.stringify({ error: data.error?.message || "Groq error" }) };
    }

    const text = data.choices?.[0]?.message?.content || "[]";

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    };
  } catch(e) {
    return { statusCode:500, body: JSON.stringify({ error: e.message }) };
  }
};
