export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const { messages, command, agentInstr } = req.body;

  // ── CLIMA ──
  if (command?.type === "weather") {
    try {
      const city = encodeURIComponent(command.city);
      const r = await fetch(`https://wttr.in/${city}?format=j1`);
      const d = await r.json();
      const tomorrow = d.weather[1];
      const desc = tomorrow.hourly[4].weatherDesc[0].value;
      const max = tomorrow.maxtempC;
      const min = tomorrow.mintempC;
      const rain = tomorrow.hourly[4].chanceofrain;
      const reply = `Previsão para ${command.city} amanhã: ${desc}. Máxima ${max}°C, mínima ${min}°C. Chuva: ${rain}%.`;
      return res.status(200).json({ content: [{ text: reply }], usage: { input_tokens: 0, output_tokens: 0 } });
    } catch(e) {
      return res.status(200).json({ content: [{ text: `Não consegui obter o clima agora. Tente novamente.` }], usage: { input_tokens: 0, output_tokens: 0 } });
    }
  }

  // ── IA com instrução do agente ──
  const systemPrompt = agentInstr || `Você é NEXUS — assistente de IA pessoal de Gui, editor de vídeo profissional de 24 anos. Projeto atual: Arven (campanha imobiliária premium). Fale em português brasileiro. Seja direto e sofisticado.`;

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
          { role: "system", content: systemPrompt },
          ...(messages || [])
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
