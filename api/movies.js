// api/movies.js
export default async function handler(req, res) {
  // Enable CORS for all origins
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const NOTION_TOKEN = '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';
    const DATABASE_ID = '1e02d2669da544308db22e33c3a45506';

    const response = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        sorts: [
          {
            property: 'Last Watched',
            direction: 'descending'
          }
        ],
        page_size: 100 // Get more movies to ensure we have complete history
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Notion API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    const allMovies = data.results.map(page => {
      const props = page.properties;
      
      return {
        name: props.Name?.title?.[0]?.text?.content || 'Untitled',
        status: props.Status?.select?.name || '',
        lastWatched: props['Last Watched']?.date?.start || '',
        whoPicked: props['Who Picked']?.select?.name || '',
        adult: props.Adult?.checkbox || false,
        movie: props.Movie?.checkbox || false,
        streamService: props['Stream Service']?.select?.name || '',
        added: page.created_time
      };
    });

    // Filter for movies that have:
    // 1. Status is NOT "To Watch" (exclude unwatched movies)
    // 2. Has a "Last Watched" date (means they were watched)
    // 3. Adult is false
    // 4. Have a picker (means it was actually picked and watched)
    const filteredMovies = allMovies.filter(movie => {
      const isNotToWatch = movie.status !== 'To Watch';
      const hasWatchedDate = movie.lastWatched;
      const isNotAdult = movie.adult === false;
      const hasPicker = movie.whoPicked;
      
      return isNotToWatch && hasWatchedDate && isNotAdult && hasPicker;
    });

    res.status(200).json({
      success: true,
      movies: filteredMovies,
      total: filteredMovies.length
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
