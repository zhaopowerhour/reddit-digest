export interface SubredditSection {
  name: string;
  subreddits: string[];
}

export const SECTIONS: SubredditSection[] = [
  {
    name: 'Deals',
    subreddits: ['StealsNotDeals', 'frugalmalefashion'],
  },
  {
    name: 'Tech',
    subreddits: ['artificial', 'ProductManagement', 'programming', 'ClaudeAI', 'OpenAI'],
  },
  {
    name: 'Finance',
    subreddits: ['investing', 'FinancialPlanning'],
  },
];
