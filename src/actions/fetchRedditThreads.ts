const createSubredditThreadUrl = (
  subreddit: string,
  after: string | null = null
) =>
  `https://www.reddit.com/r/${subreddit}/new.json${
    after ? `?after=${encodeURIComponent(after)}` : ''
  }`;

export async function fetchRedditThreads(
  controller: AbortController,
  subreddit: string,
  after: string | null = null
) {
  const fetchResponse = await fetch(
    createSubredditThreadUrl(subreddit, after),
    { signal: controller.signal }
  );
  return fetchResponse.json();
}
