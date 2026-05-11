export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.ANTHROPIC_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 800,
        messages: [
          {
            role: "system",
            content: `Você é CLAUDIO — assistente de IA pessoal de Gui, editor de vídeo profissional de 24 anos com 3 anos de experiência. Gui produz vídeos para a campanha imobiliária Arven. Ama música emocional e poderosa (referências: Teddy Swims). Fale em português brasileiro. Seja direto, inteligente e sofisticado. Quando sugerir músicas, pergunte: mood do vídeo, pacing, público-alvo, duração e plataforma. Músicas sempre em bullet points. Respostas focadas e impactantes. Seu nome é CLAUDIO.`
          },
          ...req.body.messages
        ]
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    return res.status(200).json({
      content: [{ text: data.choices[0].message.content }],
      usage: {
        input_tokens: data.usage?.prompt_tokens || 0,
        output_tokens: data.usage?.completion_tokens || 0
      }
    });

  } catch (e) {
    return res.status(500).json({ error: { message: e.message } });
  }
}
