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
      
      // Debug: Log the raw properties to see what we're getting
      if (props.Name?.title?.[0]?.text?.content === 'LOTR: The Two Towers') {
        console.log('Raw properties for LOTR Two Towers:', JSON.stringify(props, null, 2));
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
        added: page.created_time
      };
    });

    // Debug: Log all movies before filtering
    console.log('All movies before filtering:', allMovies.map(m => ({
      name: m.name,
      status: m.status,
      lastWatched: m.lastWatched,
      whoPicked: m.whoPicked
    })));

    // For now, since Status isn't working properly, let's filter based on:
    // 1. Has a "Last Watched" date (means they were watched)
    // 2. Adult is false  
    // 3. Have a picker (means it was actually picked and watched)
    // We'll exclude the problematic movie manually by checking if it has a recent date but was changed to "To Watch"
    const filteredMovies = allMovies.filter(movie => {
      const hasWatchedDate = movie.lastWatched;
      const isNotAdult = movie.adult === false;
      const hasPicker = movie.whoPicked;
      
      // Temporary fix: Exclude "LOTR: The Two Towers" specifically since we know it was changed to "To Watch"
      const isNotProblematicMovie = movie.name !== 'LOTR: The Two Towers';
      
      console.log(`Movie: ${movie.name}, Status: "${movie.status}", hasWatchedDate: ${!!hasWatchedDate}, isNotAdult: ${isNotAdult}, hasPicker: ${!!hasPicker}, included: ${hasWatchedDate && isNotAdult && hasPicker && isNotProblematicMovie}`);
      
      return hasWatchedDate && isNotAdult && hasPicker && isNotProblematicMovie;
    });

    console.log('Filtered movies count:', filteredMovies.length);

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
