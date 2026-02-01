export interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  url: string;
  permalink: string;
  score: number;
  num_comments: number;
  subreddit: string;
  author: string;
  created_utc: number;
  is_self: boolean;
  over_18: boolean;
  link_flair_text?: string;
}

export interface RedditComment {
  id: string;
  body: string;
  author: string;
  score: number;
}

export interface SummarizedPost extends RedditPost {
  summary: string;
  topComments: RedditComment[];
}

export interface SubredditPosts {
  subreddit: string;
  posts: SummarizedPost[];
}

export interface DigestSection {
  name: string;
  subreddits: SubredditPosts[];
}
