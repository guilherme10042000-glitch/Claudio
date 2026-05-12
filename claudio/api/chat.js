export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const { messages, command, agentInstr, searchResult } = req.body;

  // CLIMA
  if (command?.type === "weather") {
    try {
      const city = encodeURIComponent(command.city);
      const r = await fetch(`https://wttr.in/${city}?format=j1`);
      const d = await r.json();
      const t = d.weather[1];
      const desc = t.hourly[4].weatherDesc[0].value;
      const reply = `Previsao para ${command.city} amanha: ${desc}. Max ${t.maxtempC}°C, min ${t.mintempC}°C. Chuva: ${t.hourly[4].chanceofrain}%.`;
      return res.status(200).json({ content: [{ text: reply }], usage: { input_tokens: 0, output_tokens: 0 } });
    } catch(e) {
      return res.status(200).json({ content: [{ text: 'Nao consegui obter o clima agora.' }], usage: { input_tokens: 0, output_tokens: 0 } });
    }
  }

  // BUSCA NA WEB via DuckDuckGo
  if (command?.type === "search") {
    try {
      const q = encodeURIComponent(command.query);
      const r = await fetch(`https://api.duckduckgo.com/?q=${q}&format=json&no_redirect=1&no_html=1&skip_disambig=1`);
      const d = await r.json();
      let result = '';
      if (d.AbstractText) result += d.AbstractText + '\n';
      if (d.Answer) result += d.Answer + '\n';
      if (d.RelatedTopics?.length) {
        d.RelatedTopics.slice(0,3).forEach(t => { if(t.Text) result += '- ' + t.Text.slice(0,150) + '\n'; });
      }
      const text = result.trim() || 'Nenhum resultado encontrado para: ' + command.query;
      return res.status(200).json({ content: [{ text }], usage: { input_tokens: 0, output_tokens: 0 } });
    } catch(e) {
      return res.status(200).json({ content: [{ text: 'Erro na busca.' }], usage: { input_tokens: 0, output_tokens: 0 } });
    }
  }

  // IA — com contexto de busca se houver
  const basePrompt = agentInstr || `Voce e NEXUS AI, assistente de IA pessoal sofisticado de Gui, editor de video profissional. Responda em portugues brasileiro. Seja direto, preciso e util. Use markdown para formatar respostas longas.`;
  const systemPrompt = searchResult
    ? basePrompt + `\n\nVoce tem acesso ao seguinte resultado de busca na web para responder com informacoes atualizadas:\n${searchResult}\n\nUse essas informacoes para dar uma resposta precisa e atual.`
    : basePrompt;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.ANTHROPIC_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 1200,
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
