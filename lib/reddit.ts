import { RedditPost, RedditComment } from '@/types';

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

interface RedditListingResponse {
  data: {
    children: Array<{
      data: RedditPost;
    }>;
  };
}

interface RedditCommentsResponse {
  data: {
    children: Array<{
      kind: string;
      data: RedditComment & { replies?: RedditCommentsResponse };
    }>;
  };
}

export async function fetchTopPosts(
  subreddit: string,
  limit: number = 10
): Promise<RedditPost[]> {
  const url = `https://www.reddit.com/r/${subreddit}/top.json?t=day&limit=${limit}`;

  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch r/${subreddit}: ${response.status}`);
  }

  const data: RedditListingResponse = await response.json();

  return data.data.children
    .map((child) => child.data)
    .filter((post) => !post.over_18);
}

export async function fetchHotPosts(
  subreddit: string,
  limit: number = 10
): Promise<RedditPost[]> {
  const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=${limit}`;

  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch r/${subreddit} hot: ${response.status}`);
  }

  const data: RedditListingResponse = await response.json();

  return data.data.children
    .map((child) => child.data)
    .filter((post) => !post.over_18);
}

export async function fetchComments(
  subreddit: string,
  postId: string,
  limit: number = 3
): Promise<RedditComment[]> {
  const url = `https://www.reddit.com/r/${subreddit}/comments/${postId}.json?limit=${limit}&sort=top`;

  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch comments for ${postId}: ${response.status}`);
  }

  const data: RedditCommentsResponse[] = await response.json();

  // Comments are in the second element of the array
  const commentsListing = data[1];
  if (!commentsListing?.data?.children) {
    return [];
  }

  return commentsListing.data.children
    .filter((child) => child.kind === 't1') // t1 = comment
    .slice(0, limit)
    .map((child) => ({
      id: child.data.id,
      body: child.data.body,
      author: child.data.author,
      score: child.data.score,
    }));
}

export async function fetchSubredditPosts(
  subreddit: string,
  topLimit: number = 10,
  hotLimit: number = 10
): Promise<RedditPost[]> {
  const [topPosts, hotPosts] = await Promise.all([
    fetchTopPosts(subreddit, topLimit),
    fetchHotPosts(subreddit, hotLimit),
  ]);

  // Filter to posts from last 24 hours
  const oneDayAgo = Date.now() / 1000 - 24 * 60 * 60;

  // Dedupe by post ID
  const seen = new Set<string>();
  const uniquePosts: RedditPost[] = [];

  for (const post of [...topPosts, ...hotPosts]) {
    if (!seen.has(post.id) && post.created_utc >= oneDayAgo) {
      seen.add(post.id);
      uniquePosts.push(post);
    }
  }

  // Sort by newest first
  return uniquePosts.sort((a, b) => b.created_utc - a.created_utc);
}
