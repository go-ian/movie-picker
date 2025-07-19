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

    // First, let's try a simple query without filters to see what we get
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
    
    // Log the first result to see the structure
    if (data.results && data.results.length > 0) {
      console.log('First result properties:', Object.keys(data.results[0].properties));
    }
    
    const formattedMovies = data.results
      .map(page => {
        const props = page.properties;
        
        // Extract data safely, handling different property name variations
        const name = props.Name?.title?.[0]?.text?.content || 
                    props.Title?.title?.[0]?.text?.content || 
                    'Untitled';
                    
        const status = props.Status?.select?.name || 
                      props.status?.select?.name || '';
                      
        const lastWatched = props['Last Watched']?.date?.start || 
                           props.LastWatched?.date?.start || 
                           props['last watched']?.date?.start || '';
                           
        const whoPicked = props['Who Picked']?.select?.name || 
                         props.WhoPicked?.select?.name || 
                         props['who picked']?.select?.name || '';
                         
        const adult = props.Adult?.checkbox || 
                     props.adult?.checkbox || false;
                     
        const movie = props.Movie?.checkbox || 
                     props.movie?.checkbox || true;
                     
        const streamService = props['Stream Service']?.select?.name || 
                             props.StreamService?.select?.name || 
                             props['stream service']?.select?.name || '';

        return {
          name,
          status,
          lastWatched,
          whoPicked,
          adult,
          movie,
          streamService,
          added: page.created_time
        };
      })
      .filter(movie => 
        movie.status === 'Watched' && 
        !movie.adult
      );

    res.status(200).json({
      success: true,
      movies: formattedMovies,
      total: formattedMovies.length
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
