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
      const reply = `Previsao para ${command.city} amanha: ${desc}. Max ${t.maxtempC}C, min ${t.mintempC}C. Chuva: ${t.hourly[4].chanceofrain}%.`;
      return res.status(200).json({ content: [{ text: reply }], usage: { input_tokens: 0, output_tokens: 0 } });
    } catch(e) {
      return res.status(200).json({ content: [{ text: 'Nao consegui obter o clima agora.' }], usage: { input_tokens: 0, output_tokens: 0 } });
    }
  }

  // BUSCA WEB
  if (command?.type === "search") {
    try {
      const q = encodeURIComponent(command.query);
      const r = await fetch(`https://api.duckduckgo.com/?q=${q}&format=json&no_redirect=1&no_html=1&skip_disambig=1`);
      const d = await r.json();
      let result = '';
      if (d.AbstractText) result += d.AbstractText + '\n';
      if (d.Answer) result += d.Answer + '\n';
      if (d.RelatedTopics?.length) {
        d.RelatedTopics.slice(0,4).forEach(t => { if(t.Text) result += '- ' + t.Text.slice(0,200) + '\n'; });
      }
      return res.status(200).json({ content: [{ text: result.trim() || 'Sem resultados.' }], usage: { input_tokens: 0, output_tokens: 0 } });
    } catch(e) {
      return res.status(200).json({ content: [{ text: 'Erro na busca.' }], usage: { input_tokens: 0, output_tokens: 0 } });
    }
  }

  // ANTHROPIC CLAUDE
  const BASE_SYSTEM = `Voce e NEXUS AI — um assistente de inteligencia artificial especializado no universo audiovisual, criado para ser o segundo cerebro de Gui, editor de video profissional com 3 anos de experiencia.

ESPECIALIDADES PRINCIPAIS:
- Edicao de video: Premiere Pro, Final Cut Pro, DaVinci Resolve, After Effects
- Producao audiovisual: cinematografia, color grading, motion graphics, VFX
- Musica para video: curadoria de trilhas, mood, sincronizacao, licenciamento
- Roteiros: narrativas visuais, storytelling cinematografico, scripts
- Marketing audiovisual: conteudo para redes sociais, campanhas, branding
- Tecnologia: codecs, formatos, resolucoes, workflows de pos-producao
- Tendencias: mercado audiovisual, plataformas, algoritmos, viral content

PERSONALIDADE:
- Direto, tecnico e sofisticado como um profissional sênior do audiovisual
- Usa terminologia tecnica correta da industria
- Da respostas praticas e acionaveis
- Quando sugerir musicas: sempre pergunta mood, pacing, publico, duracao e plataforma — sugestoes em bullet points
- Fala em portugues brasileiro fluente
- Usa markdown para organizar respostas tecnicas`;

  const systemPrompt = agentInstr
    ? agentInstr + (searchResult ? `\n\nDADOS DE BUSCA WEB ATUAL:\n${searchResult}` : '')
    : BASE_SYSTEM + (searchResult ? `\n\nDADOS DE BUSCA WEB ATUAL:\n${searchResult}` : '');

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
        max_tokens: 1500,
        system: systemPrompt,
        messages: messages || []
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    return res.status(200).json({
      content: [{ text: data.content[0].text }],
      usage: {
        input_tokens: data.usage?.input_tokens || 0,
        output_tokens: data.usage?.output_tokens || 0
      }
    });
  } catch (e) {
    return res.status(500).json({ error: { message: e.message } });
  }
}
