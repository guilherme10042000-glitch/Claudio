export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 800,
        system: `Você é CLAUDIO — assistente de IA pessoal de Gui, editor de vídeo profissional de 24 anos com 3 anos de experiência. Gui produz vídeos para a campanha imobiliária Arven. Ama música emocional e poderosa (referências: Teddy Swims). Fale em português brasileiro. Seja direto, inteligente e sofisticado. Quando sugerir músicas, pergunte: mood do vídeo, pacing, público-alvo, duração e plataforma. Músicas sempre em bullet points. Respostas focadas e impactantes. Seu nome é CLAUDIO.`,
        messages: req.body.messages
      })
    });
    const data = await response.json();
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: { message: e.message } });
  }
}
