const express = require('express');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

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
    res.render('404_production');
    return;
  }

  try {
    const info = await ytdl.getInfo(youtubeUrl, {
      requestOptions: {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      },
    });
    const { title, thumbnails } = info.videoDetails;
    let formats = info.formats;

    // Filter out audio-only formats and formats with both video and audio
    //formats = formats.filter(format => format.hasVideo && format.hasAudio);

    res.render('index', { title, thumbnails, formats, youtubeUrl });
  } catch (err) {
    console.error('Error fetching video info:', err.message);
    res.render('404_production');
  }
});

app.get('/video', async (req, res) => {
  const { url, format } = req.query;
  if (!url || !format) {
    res.status(400).send('Please provide a valid YouTube URL and format.');
    return;
  }

  try {
    const info = await ytdl.getInfo(url, {
      requestOptions: {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      },
    });
    const videoFormat = info.formats.find(formatObj => formatObj.itag == format);
    if (!videoFormat || !videoFormat.hasVideo) {
      res.status(404).send('Requested video format not found.');
      return;
    }
    const title = info.videoDetails.title.replace(/[^\w\s]/gi, ''); // Remove special characters from the title
    res.header('Content-Disposition', `attachment; filename="${title}.mp4"`);
    ytdl(url, { format: videoFormat }).pipe(res);
  } catch (err) {
    console.error('Error downloading video:', err.message);
    res.render('404_production');
  }
});

app.get('/audio', async (req, res) => {
  const { url, format } = req.query;
  if (!url || !format) {
    res.status(400).send('Please provide a valid YouTube URL and audio format.');
    return;
  }

  try {
    const info = await ytdl.getInfo(url, {
      requestOptions: {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      },
    });

    const audioFormat = info.formats.find(formatObj => formatObj.itag == format && formatObj.hasAudio && !formatObj.hasVideo);
    if (!audioFormat) {
      res.status(404).send('Requested audio format not found.');
      return;
    }

    const title = info.videoDetails.title.replace(/[^\w\s]/gi, ''); // Remove special characters from the title
    res.header('Content-Disposition', `attachment; filename="${title}.mp3"`);

    const audioStream = ytdl(url, { format: audioFormat });
    const outputPath = path.join(__dirname, `${uuidv4()}.mp3`);

    // Use fluent-ffmpeg to handle audio processing
    ffmpeg(audioStream)
      .audioCodec('libmp3lame')
      .audioBitrate(audioFormat.audioBitrate)
      .on('error', (err) => {
        console.error('Error processing audio:', err);
        res.status(500).send('Error processing audio.');
      })
      .on('end', () => {
        // Send the processed audio file to the client
        res.download(outputPath, `${title}.mp3`, (err) => {
          if (err) {
            console.error('Error sending file:', err);
          }
          // Clean up: delete the temporary file
          fs.unlink(outputPath, (err) => {
            if (err) {
              console.error('Error deleting file:', err);
            }
          });
        });
      })
      .save(outputPath); // Save processed audio to a file

  } catch (err) {
    console.error('Error fetching video info:', err.message);
    res.render('404_production');
  }
});

app.use((req, res, next) => {
  if (req.method === 'GET') {
    res.status(404).render('404_production');
  } else {
    res.status(404).json({
      code: 404,
      message: "Not Found"
    });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
