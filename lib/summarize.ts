import { GoogleGenerativeAI } from '@google/generative-ai';
import { RedditPost, RedditComment } from '@/types';

let genAI: GoogleGenerativeAI;
function getGenAI() {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  }
  return genAI;
}

export async function summarizePost(
  post: RedditPost,
  comments: RedditComment[]
): Promise<string> {
  const model = getGenAI().getGenerativeModel({ model: 'gemini-2.0-flash' });

  const content = post.is_self ? post.selftext : `Link: ${post.url}`;
  const commentText = comments
    .map((c) => `- ${c.author} (${c.score} pts): ${c.body.slice(0, 300)}`)
    .join('\n');

  const prompt = `Summarize this Reddit post concisely.

Title: ${post.title}
Content: ${content || '(no text content)'}
Top comments:
${commentText || '(no comments)'}

Format your response EXACTLY like this:
[One sentence summary of the main point]

• [Key takeaway 1]
• [Key takeaway 2]
• [Key takeaway 3 if relevant]

Keep bullet points short (under 15 words each). Max 3 bullets. No preamble.`;

  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const response = result.response;
      return response.text().trim();
    } catch (error: unknown) {
      const isRateLimit = error instanceof Error && error.message?.includes('429');
      if (isRateLimit && attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt + 2) * 1000; // 4s, 8s, 16s
        console.log(`Rate limited, waiting ${delay/1000}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      console.error(`Failed to summarize post ${post.id}:`, error);
      return 'Summary unavailable.';
    }
  }
  return 'Summary unavailable.';
}

export async function summarizePostBatch(
  posts: Array<{ post: RedditPost; comments: RedditComment[] }>
): Promise<Map<string, string>> {
  const summaries = new Map<string, string>();

  // Process sequentially to respect rate limits
  for (const { post, comments } of posts) {
    const summary = await summarizePost(post, comments);
    summaries.set(post.id, summary);

    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return summaries;
}
