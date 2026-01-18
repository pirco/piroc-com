const { neon } = require('@neondatabase/serverless');

const RECAPTCHA_THRESHOLD = 0.5;

// Validation helpers
function containsUrl(text) {
  if (!text) return false;
  const urlPattern = /(?:https?:\/\/|www\.|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/|$))/i;
  return urlPattern.test(text);
}

function isValidEmail(email) {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(email) && email.length <= 254;
}

function isValidName(name) {
  if (!name || name.trim().length < 2) return false;
  if (name.length > 100) return false;
  // Allow letters (including unicode), spaces, hyphens, apostrophes, periods
  const nameRegex = /^[\p{L}\s\-'.]+$/u;
  return nameRegex.test(name.trim());
}

// Verify reCAPTCHA token with Google
async function verifyRecaptcha(token) {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;

  if (!secretKey) {
    console.error('RECAPTCHA_SECRET_KEY is not configured');
    return { success: false, error: 'Server configuration error' };
  }

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${secretKey}&response=${token}`
    });

    const data = await response.json();

    if (!data.success) {
      console.error('reCAPTCHA verification failed:', data['error-codes']);
      return { success: false, error: 'reCAPTCHA verification failed' };
    }

    if (data.score < RECAPTCHA_THRESHOLD) {
      console.log(`reCAPTCHA score too low: ${data.score}`);
      return { success: false, error: 'Submission blocked for security reasons' };
    }

    return { success: true, score: data.score };
  } catch (error) {
    console.error('reCAPTCHA API error:', error.message);
    return { success: false, error: 'Could not verify reCAPTCHA' };
  }
}

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

  const { name, email, message, recaptchaToken } = req.body;

  // Verify reCAPTCHA token
  if (!recaptchaToken) {
    return res.status(400).json({ error: 'reCAPTCHA verification required' });
  }

  const recaptchaResult = await verifyRecaptcha(recaptchaToken);
  if (!recaptchaResult.success) {
    return res.status(400).json({ error: recaptchaResult.error });
  }

  // Validate required fields
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  // Validate name
  if (!isValidName(name)) {
    return res.status(400).json({ error: 'Please enter a valid name (letters only, at least 2 characters)' });
  }

  // Validate email
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address' });
  }

  // Check for URLs in all fields (spam prevention)
  if (containsUrl(name) || containsUrl(email) || containsUrl(message)) {
    return res.status(400).json({ error: 'URLs are not allowed in the form' });
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
