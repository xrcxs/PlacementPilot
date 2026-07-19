// POST /api/score-answer
// Body: { question: string, answer: string }
// Keeps ANTHROPIC_API_KEY on the server — never sent to the browser.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Server misconfigured: ANTHROPIC_API_KEY is not set.' });
  }

  try {
    const { question, answer } = req.body || {};
    if (!answer || !answer.trim()) {
      return res.status(400).json({ error: 'Missing answer.' });
    }

    const safeQuestion = (question || 'How would you design a rate limiter?').replace(/"/g, '\\"');
    const safeAnswer = answer.replace(/"/g, '\\"');

    const prompt =
      'You are a strict but fair technical interviewer for Indian engineering campus placements. ' +
      `The candidate was asked: "${safeQuestion}" ` +
      `Their answer: "${safeAnswer}" ` +
      'Return ONLY valid JSON, no markdown fences, no preamble, in this exact shape: ' +
      '{"score": <0-10 number>, "feedback": "<2-3 sentences of specific, actionable feedback>"}';

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }]
      })
    });

    if (!anthropicRes.ok) {
      const detail = await anthropicRes.text();
      console.error('Anthropic API error:', anthropicRes.status, detail);
      return res.status(502).json({ error: 'Claude API request failed.' });
    }

    const data = await anthropicRes.json();
    const textOut = (data.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n');
    const clean = textOut.replace(/```json|```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch (parseErr) {
      console.error('Failed to parse Claude JSON output:', textOut);
      return res.status(502).json({ error: 'Could not parse scoring result.' });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    console.error('score-answer error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
}
