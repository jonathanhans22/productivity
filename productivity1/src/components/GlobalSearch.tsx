import { useState, useEffect } from 'react';
import { PiMagnifyingGlass, PiX } from 'react-icons/pi';

type SearchResult = {
  id: string;
  title: string;
  type: 'task' | 'note';
  folderId?: string;
};

type GlobalSearchProps = {
  tasks: any[];
  folders: any[];
  onResultClick: (result: SearchResult) => void;
};

export function GlobalSearch({ tasks, folders, onResultClick }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (query.length > 1) {
      const taskResults = tasks
        .filter(t => t.title.toLowerCase().includes(query.toLowerCase()))
        .map(t => ({ id: t.id, title: t.title, type: 'task' as const }));

      const noteResults: SearchResult[] = folders.flatMap(folder =>
        folder.notes
          .filter((n: any) => n.title.toLowerCase().includes(query.toLowerCase()))
          .map((n: any) => ({
            id: n.id,
            title: n.title,
            type: 'note' as const,
            folderId: folder.id,
          }))
      );

      setResults([...taskResults, ...noteResults]);
    } else {
      setResults([]);
    }
  }, [query, tasks, folders]);

  const handleResultClick = (result: SearchResult) => {
    onResultClick(result);
    setQuery('');
    setIsFocused(false);
  };

  const showResults = isFocused && query.length > 1;

  return (
    <div className="global-search-container">
      <div className="search-input-wrapper">
        <PiMagnifyingGlass className="search-icon" />
        <input
          type="text"
          placeholder="Search tasks and notes..."
          className="search-input"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
        />
        {query && (
          <button className="clear-search-btn" onClick={() => setQuery('')}>
            <PiX />
          </button>
        )}
      </div>
      {showResults && (
        <div className="search-results-popover">
          {results.length > 0 ? (
            <ul className="search-results-list">
              {results.map(result => (
                <li
                  key={`${result.type}-${result.id}`}
                  className="search-result-item"
                  data-type={result.type}
                  onClick={() => handleResultClick(result)}
                >
                  <span className="result-type-badge">{result.type}</span>
                  <span className="result-title">{result.title}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="no-results">No results found.</div>
          )}
        </div>
      )}
    </div>
  );
}