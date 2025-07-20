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
      
      // Debug: Log ALL property names to see what's available
      if (props.Name?.title?.[0]?.text?.content?.includes('LOTR') || 
          props.Name?.title?.[0]?.text?.content?.includes('Two Towers')) {
        console.log('=== DEBUGGING MOVIE ===');
        console.log('Movie name:', props.Name?.title?.[0]?.text?.content);
        console.log('All property names:', Object.keys(props));
        console.log('Status property structure:', JSON.stringify(props.Status, null, 2));
        console.log('Raw props.Status:', props.Status);
        console.log('Raw props["Status"]:', props["Status"]);
        
        // Check if there are any variations of status property names
        const statusVariants = Object.keys(props).filter(key => 
          key.toLowerCase().includes('status')
        );
        console.log('Status-related properties:', statusVariants);
        
        statusVariants.forEach(key => {
          console.log(`${key}:`, JSON.stringify(props[key], null, 2));
        });
        console.log('=== END DEBUG ===');
      }
      
      return {
        name: props.Name?.title?.[0]?.text?.content || 'Untitled',
        // Try every possible way to access Status
        status: props.Status?.select?.name || 
                props['Status']?.select?.name || 
                props.status?.select?.name ||
                props.Status?.name ||
                props.Status?.title?.[0]?.text?.content ||
                '',
        lastWatched: props['Last Watched']?.date?.start || '',
        whoPicked: props['Who Picked']?.select?.name || '',
        adult: props.Adult?.checkbox || false,
        movie: props.Movie?.checkbox || false,
        streamService: props['Stream Service']?.select?.name || '',
        added: page.created_time,
        // Debug: Include raw status for inspection
        rawStatus: props.Status,
        allProps: Object.keys(props) // See all available properties
      };
    });

    // Filter movies based on multiple criteria:
    // Since Status reading is broken, let's implement a workaround
    // We'll manually track which movies should be excluded
    const allFilteredMovies = allMovies.filter(movie => {
      const hasWatchedDate = movie.lastWatched;
      const isNotAdult = movie.adult === false;
      
      // For now, since Status is broken, just filter on basic criteria
      // TODO: Fix Status reading or implement manual exclusion list
      console.log(`Movie: ${movie.name}, Status: "${movie.status}", rawStatus: ${JSON.stringify(movie.rawStatus)}, hasWatchedDate: ${!!hasWatchedDate}, isNotAdult: ${isNotAdult}, hasPicker: ${!!movie.whoPicked}`);
      
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
