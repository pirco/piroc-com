const { neon } = require('@neondatabase/serverless');

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, message } = req.body;

  // Validate required fields
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    await sql`
      INSERT INTO contact_submissions (name, email, message)
      VALUES (${name}, ${email}, ${message || ''})
    `;

    return res.status(200).json({
      success: true,
      message: 'Thank you for your message! We\'ll be in touch soon.'
    });

  } catch (error) {
    console.error('Database error:', error.message);
    return res.status(500).json({ error: 'Failed to save submission. Please try again.' });
  }
};
