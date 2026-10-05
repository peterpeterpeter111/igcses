// Public note-search results only. Full teaching documents stay on the server.
export type SearchResult = {
  title: string;
  chapter: string;
  href: string;
  snippet: string;
  status: string;
  score: number;
};
