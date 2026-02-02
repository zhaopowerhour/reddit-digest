import { Resend } from 'resend';
import { DigestSection } from '@/types';

let resend: Resend;
function getResend() {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatPostTime(utcTimestamp: number): string {
  const now = Date.now();
  const postTime = utcTimestamp * 1000; // Convert to milliseconds
  const diffMs = now - postTime;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) {
    const diffMins = Math.floor(diffMs / (1000 * 60));
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else {
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }
}

function formatSummary(summary: string): string {
  // Convert bullet points to HTML
  const lines = summary.split('\n').filter((line) => line.trim());
  const firstLine = lines[0] || '';
  const bullets = lines.slice(1).filter((line) => line.trim().startsWith('•'));

  let html = `<p style="margin: 8px 0 4px 0; color: #4a4a4a;">${escapeHtml(firstLine)}</p>`;

  if (bullets.length > 0) {
    html += '<ul style="margin: 4px 0 0 0; padding-left: 20px; color: #666;">';
    for (const bullet of bullets) {
      const text = bullet.replace(/^•\s*/, '');
      html += `<li style="margin: 2px 0; font-size: 14px;">${escapeHtml(text)}</li>`;
    }
    html += '</ul>';
  }

  return html;
}

function generateHtml(sections: DigestSection[]): string {
  const sectionHtml = sections
    .map(
      (section) => `
      <h2 style="color: #1a1a1b; margin-top: 32px; margin-bottom: 16px; font-size: 24px; border-bottom: 3px solid #ff4500; padding-bottom: 8px;">
        ${escapeHtml(section.name)}
      </h2>
      ${section.subreddits
        .map(
          (sub) => `
        <h3 style="color: #ff4500; margin-top: 20px; margin-bottom: 12px; font-size: 16px;">
          r/${sub.subreddit}
        </h3>
        ${sub.posts
          .map(
            (post) => `
          <div style="margin-bottom: 20px; padding: 12px 16px; background: #f8f9fa; border-radius: 8px; border-left: 3px solid #ff4500;">
            <a href="https://reddit.com${post.permalink}" style="color: #1a1a1b; text-decoration: none; font-weight: 600; font-size: 15px; line-height: 1.3;">
              ${escapeHtml(post.title)}
            </a>
            <div style="margin-top: 4px;">
              <span style="color: #ff4500; font-size: 13px;">▲ ${post.score.toLocaleString()}</span>
              <span style="color: #7c7c7c; font-size: 13px; margin-left: 12px;">💬 ${post.num_comments}</span>
              <span style="color: #7c7c7c; font-size: 13px; margin-left: 12px;">🕐 ${formatPostTime(post.created_utc)}</span>
            </div>
            ${formatSummary(post.summary)}
          </div>
        `
          )
          .join('')}
      `
        )
        .join('')}
    `
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
  <h1 style="color: #1a1a1b; margin-bottom: 8px; font-size: 28px;">Reddit Digest</h1>
  <p style="color: #7c7c7c; margin-top: 0; margin-bottom: 32px; font-size: 14px;">${formatDate()}</p>
  ${sectionHtml}
  <hr style="border: none; border-top: 1px solid #edeff1; margin: 32px 0;">
  <p style="color: #7c7c7c; font-size: 12px; text-align: center;">
    Generated with AI summaries • <a href="https://reddit.com" style="color: #ff4500;">reddit.com</a>
  </p>
</body>
</html>
  `;
}

export async function sendDigest(sections: DigestSection[]): Promise<void> {
  const email = process.env.DIGEST_EMAIL;
  if (!email) {
    throw new Error('DIGEST_EMAIL not configured');
  }

  const totalPosts = sections.reduce(
    (sum, s) => sum + s.subreddits.reduce((subSum, sub) => subSum + sub.posts.length, 0),
    0
  );
  const html = generateHtml(sections);

  const { error } = await getResend().emails.send({
    from: 'Reddit Digest <onboarding@resend.dev>',
    to: email,
    subject: `Reddit Digest - ${formatDate()} (${totalPosts} posts)`,
    html,
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }
}
