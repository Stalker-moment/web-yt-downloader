const express = require('express');
const ytdl = require('ytdl-core');
const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.render('index', { title: '', thumbnails: [], formats: [], youtubeUrl: '' });
});

app.get('/download', async (req, res) => {
  const youtubeUrl = req.query.url;
  if (!youtubeUrl) {
    res.status(400).send('Please provide a valid YouTube URL.');
    return;
  }

  try {
    const info = await ytdl.getInfo(youtubeUrl);
    const { title, thumbnails } = info.videoDetails;
    const formats = info.formats;
    res.render('index', { title, thumbnails, formats, youtubeUrl });
  } catch (err) {
    console.error('Error fetching video info:', err.message);
    res.status(400).send('Invalid YouTube URL or error fetching video info.');
  }
});

app.get('/video', async (req, res) => {
  const { url, format } = req.query;
  if (!url || !format) {
    res.status(400).send('Please provide a valid YouTube URL and format.');
    return;
  }

  try {
    const info = await ytdl.getInfo(url);
    const videoFormat = info.formats.find(formatObj => formatObj.itag === format);
    const title = info.videoDetails.title.replace(/[^\w\s]/gi, ''); // Remove special characters from the title
    res.header('Content-Disposition', `attachment; filename="${title}.mp4"`);
    ytdl(url, { format: videoFormat }).pipe(res);
  } catch (err) {
    console.error('Error downloading video:', err.message);
    res.status(500).send('Error downloading video.');
  }
});

app.get('/audio', async (req, res) => {
  const { url, format } = req.query;
  if (!url || !format) {
    res.status(400).send('Please provide a valid YouTube URL and format.');
    return;
  }

  try {
    const info = await ytdl.getInfo(url);
    const audioFormat = info.formats.find(formatObj => formatObj.itag === format && (formatObj.container === 'webm' || formatObj.container === 'aac'));
    const title = info.videoDetails.title.replace(/[^\w\s]/gi, ''); // Remove special characters from the title
    res.header('Content-Disposition', `attachment; filename="${title}.mp3"`);
    ytdl(url, { format: audioFormat }).pipe(res);
  } catch (err) {
    console.error('Error downloading audio:', err.message);
    res.status(500).send('Error downloading audio.');
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
