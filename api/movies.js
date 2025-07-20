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
      
      // Debug: Log the raw properties for any movie to see structure
      if (props.Name?.title?.[0]?.text?.content?.includes('LOTR')) {
        console.log(`Raw properties for ${props.Name?.title?.[0]?.text?.content}:`, JSON.stringify(props, null, 2));
      }
      
      return {
        name: props.Name?.title?.[0]?.text?.content || 'Untitled',
        // Try different ways to access Status
        status: props.Status?.select?.name || 
                props['Status']?.select?.name || 
                props.status?.select?.name || '',
        lastWatched: props['Last Watched']?.date?.start || '',
        whoPicked: props['Who Picked']?.select?.name || '',
        adult: props.Adult?.checkbox || false,
        movie: props.Movie?.checkbox || false,
        streamService: props['Stream Service']?.select?.name || '',
        added: page.created_time,
        // Debug: Include raw status for inspection
        rawStatus: props.Status
      };
    });

    // Debug: Log all movies before filtering
    console.log('All movies before filtering:', allMovies.map(m => ({
      name: m.name,
      status: m.status,
      rawStatus: m.rawStatus,
      lastWatched: m.lastWatched,
      whoPicked: m.whoPicked
    })));

    // Filter movies into two categories:
    // 1. Movies with pickers (affect rotation)
    // 2. Movies without pickers (show as "Unknown", don't affect rotation)
    const allFilteredMovies = allMovies.filter(movie => {
      const hasWatchedDate = movie.lastWatched;
      const isNotAdult = movie.adult === false;
      
      console.log(`Movie: ${movie.name}, Status: "${movie.status}", hasWatchedDate: ${!!hasWatchedDate}, isNotAdult: ${isNotAdult}, hasPicker: ${!!movie.whoPicked}`);
      
      // Include if it has a watch date and is not adult (regardless of picker)
      return hasWatchedDate && isNotAdult;
    });

    // Mark movies without pickers as "Unknown" 
    const processedMovies = allFilteredMovies.map(movie => ({
      ...movie,
      whoPicked: movie.whoPicked || 'Unknown'
    }));

    console.log('All filtered movies count:', processedMovies.length);
    console.log('Movies with pickers:', processedMovies.filter(m => m.whoPicked !== 'Unknown').length);
    console.log('Movies without pickers (Unknown):', processedMovies.filter(m => m.whoPicked === 'Unknown').length);

    res.status(200).json({
      success: true,
      movies: processedMovies,
      total: processedMovies.length
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
