// POST /api/analyze-resume
// Body: { fileBase64?: string, isPDF: boolean, text?: string }
// Keeps ANTHROPIC_API_KEY on the server — never sent to the browser.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Server misconfigured: ANTHROPIC_API_KEY is not set.' });
  }

  try {
    const { fileBase64, isPDF, text } = req.body || {};

    if (isPDF && !fileBase64) {
      return res.status(400).json({ error: 'Missing fileBase64 for PDF upload.' });
    }
    if (!isPDF && !text) {
      return res.status(400).json({ error: 'Missing resume text.' });
    }

    const prompt =
      'You are an ATS (Applicant Tracking System) resume screener for Indian engineering job applications. ' +
      'Analyze the resume and return ONLY valid JSON, no markdown fences, no preamble, in this exact shape: ' +
      '{"ats_score": <0-100 integer>, "status": "<short verdict>", "top_issues": ["issue1","issue2","issue3"], "fixes": ["fix1","fix2","fix3"]}';

    const content = isPDF
      ? [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: fileBase64 } },
          { type: 'text', text: prompt }
        ]
      : [{ type: 'text', text: `${prompt}\n\nResume text:\n${text}` }];

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{ role: 'user', content }]
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
      return res.status(502).json({ error: 'Could not parse analysis result.' });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    console.error('analyze-resume error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
}
