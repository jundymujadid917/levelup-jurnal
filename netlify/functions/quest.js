exports.handler = async function(event) {
  if(event.httpMethod !== "POST") return { statusCode:405, body:"Method Not Allowed" };

  try {
    const { prompt } = JSON.parse(event.body);
    const apiKey = process.env.GEMINI_API_KEY || "";
    if(!apiKey) return { statusCode:500, body: JSON.stringify({ error:"GEMINI_API_KEY not set" }) };

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 1200,
          },
        }),
      }
    );

    const data = await res.json();

    if(!res.ok) {
      return { statusCode: res.status, body: JSON.stringify({ error: data.error?.message || "Gemini error" }) };
    }

    // Extract text from Gemini response format
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    };
  } catch(e) {
    return { statusCode:500, body: JSON.stringify({ error: e.message }) };
  }
};
