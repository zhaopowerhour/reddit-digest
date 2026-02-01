import { SECTIONS } from '../config/subreddits';
import { fetchSubredditPosts, fetchComments } from '../lib/reddit';
import { summarizePost } from '../lib/summarize';
import { sendDigest } from '../lib/email';
import { SummarizedPost, DigestSection, SubredditPosts } from '../types';

async function main() {
  console.log('Starting Reddit digest generation...');
  const digestSections: DigestSection[] = [];

  for (const section of SECTIONS) {
    console.log(`Processing section: ${section.name}`);
    const subredditResults: SubredditPosts[] = [];

    for (const subreddit of section.subreddits) {
      console.log(`  Fetching r/${subreddit}...`);

      try {
        // Fetch posts (top + hot, deduped, last 24h only)
        const posts = await fetchSubredditPosts(subreddit, 10, 10);
        const topPosts = posts.slice(0, 3); // Take top 3 per subreddit

        const summarizedPosts: SummarizedPost[] = [];

        for (const post of topPosts) {
          // Fetch top comments
          const comments = await fetchComments(subreddit, post.id, 3);

          // Generate AI summary
          const summary = await summarizePost(post, comments);

          summarizedPosts.push({
            ...post,
            summary,
            topComments: comments,
          });

          // Small delay between posts
          await new Promise((resolve) => setTimeout(resolve, 200));
        }

        if (summarizedPosts.length > 0) {
          // Sort by newest first
          summarizedPosts.sort((a, b) => b.created_utc - a.created_utc);
          subredditResults.push({
            subreddit,
            posts: summarizedPosts,
          });
        }

        console.log(`  Processed ${summarizedPosts.length} posts from r/${subreddit}`);
      } catch (error) {
        console.error(`  Error processing r/${subreddit}:`, error);
        // Continue with other subreddits
      }
    }

    if (subredditResults.length > 0) {
      digestSections.push({
        name: section.name,
        subreddits: subredditResults,
      });
    }
  }

  if (digestSections.length === 0) {
    console.error('No posts found');
    process.exit(1);
  }

  // Send email digest
  console.log('Sending digest email...');
  await sendDigest(digestSections);

  const totalPosts = digestSections.reduce(
    (sum, s) => sum + s.subreddits.reduce((subSum, sub) => subSum + sub.posts.length, 0),
    0
  );
  console.log(`✓ Digest sent with ${totalPosts} posts across ${digestSections.length} sections`);
}

main().catch((error) => {
  console.error('Digest generation failed:', error);
  process.exit(1);
});
