// api/movies.js
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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

    // Get all data without filters to debug
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
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Notion API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Debug: Show all raw data first
    const allMovies = data.results.map(page => {
      const props = page.properties;
      
      return {
        name: props.Name?.title?.[0]?.text?.content || 'Untitled',
        status: props.Status?.select?.name || 'No Status',
        lastWatched: props['Last Watched']?.date?.start || 'No Date',
        whoPicked: props['Who Picked']?.select?.name || 'No Picker',
        adult: props.Adult?.checkbox,
        movie: props.Movie?.checkbox,
        streamService: props['Stream Service']?.select?.name || 'No Service',
        added: page.created_time,
        // Debug info
        rawStatus: props.Status,
        rawAdult: props.Adult,
        allProperties: Object.keys(props)
      };
    });

    // Filter for watched, non-adult movies
    const filteredMovies = allMovies.filter(movie => 
      movie.status === 'Watched' && movie.adult === false
    );

    res.status(200).json({
      success: true,
      movies: filteredMovies,
      total: filteredMovies.length,
      debug: {
        totalFromNotion: allMovies.length,
        firstMovieExample: allMovies[0] || null,
        allStatuses: [...new Set(allMovies.map(m => m.status))],
        allAdultValues: [...new Set(allMovies.map(m => m.adult))]
      }
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
