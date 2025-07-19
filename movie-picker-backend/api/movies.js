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

    const response = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        filter: {
          and: [
            {
              property: 'Status',
              select: {
                equals: 'Watched'
              }
            },
            {
              property: 'Adult',
              checkbox: {
                equals: false
              }
            }
          ]
        },
        sorts: [
          {
            property: 'Last Watched',
            direction: 'descending'
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Notion API error: ${response.status}`);
    }

    const data = await response.json();
    
    const formattedMovies = data.results.map(page => ({
      name: page.properties.Name?.title?.[0]?.text?.content || 'Untitled',
      status: page.properties.Status?.select?.name || '',
      lastWatched: page.properties['Last Watched']?.date?.start || '',
      whoPicked: page.properties['Who Picked']?.select?.name || '',
      adult: page.properties.Adult?.checkbox || false,
      movie: page.properties.Movie?.checkbox || false,
      streamService: page.properties['Stream Service']?.select?.name || '',
      added: page.created_time
    }));

    res.status(200).json({
      success: true,
      movies: formattedMovies
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
