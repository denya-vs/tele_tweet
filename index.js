const TelegramBot = require('node-telegram-bot-api');
const { TwitterApi } = require('twitter-api-v2');
const OpenAI = require('openai');
require('dotenv').config();
const fetch = require('node-fetch');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function downloadPhotoFromTelegram(photoArray) {
  const photo = photoArray[photoArray.length - 1];
  const file = await bot.getFile(photo.file_id);
  const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${file.file_path}`;
  return fileUrl;
}

async function uploadMediaToTwitter(photoUrl) {
  const response = await fetch(photoUrl);
  const buffer = await response.buffer();
  const mediaId = await twitterClient.v1.uploadMedia(buffer, { type: 'image/jpeg' });
  return mediaId;
}

function splitIntoTweets(text, maxLength = 280) {
  const tweets = [];
  while (text.length > maxLength) {
    let splitIndex = text.lastIndexOf(' ', maxLength);
    if (splitIndex === -1) splitIndex = maxLength;
    tweets.push(text.slice(0, splitIndex));
    text = text.slice(splitIndex).trim();
  }
  tweets.push(text);
  return tweets;
}

async function postThread(tweets, mediaId = null) {
  let lastTweetId = null;

  for (const [index, tweet] of tweets.entries()) {
    const params = {
      text: tweet,
      ...(index === 0 && mediaId
          ? { media: { media_ids: [mediaId] } }
          : {}),
      ...(lastTweetId ? { reply: { in_reply_to_tweet_id: lastTweetId } } : {})
    };

    const postedTweet = await twitterClient.v2.tweet(params);
    lastTweetId = postedTweet.data.id;
  }
}

async function generateTranslationAndTags(text) {
  const prompt =  `
You are a helpful assistant that processes text for Twitter. Take the input text and:
1. Translate the content into natural English.
2. Maintain the original formatting, including newlines (do NOT join sentences into one line).
3. Add 2-3 hashtags at the end.

Input:
${text}

Output:
`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 200,
    });

    return response.choices[0].message.content.trim().replace(/^"|"$/g, '');
  } catch (error) {
    console.error('Error with OpenAI API:', error.message);
    throw error;
  }
}

bot.on('channel_post', async (msg) => {
  console.log('Received a new channel post:', msg);

  let mediaId = null;

  if (msg.photo) {
    console.log('Downloading photo from Telegram...');
    const photoUrl = await downloadPhotoFromTelegram(msg.photo);
    mediaId = await uploadMediaToTwitter(photoUrl);
    console.log('Uploaded photo to Twitter with media ID:', mediaId);
  }

  if (msg.chat.id.toString() !== TELEGRAM_CHAT_ID) {
    console.log('Channel post ignored: Chat ID does not match configured TELEGRAM_CHAT_ID:', msg.chat.id.toString());
    return;
  }

  const messageText = msg.text || msg.caption || '';
  if (!messageText) {
    console.log('Channel post ignored: No text or caption in the channel post');
    return;
  }

  console.log('Processing channel post text:', messageText);

  try {
    console.log('Generating translation and tags for channel post...');
    const translatedWithTags = await generateTranslationAndTags(messageText);
    console.log('Generated translated text with tags for channel post:', translatedWithTags);

    console.log('Splitting channel post text into tweets...');
    const tweets = splitIntoTweets(translatedWithTags);
    console.log('Split channel post text into tweets:', tweets);

    console.log('Posting tweet thread from channel post...');
    await postThread(tweets, mediaId);

    console.log('Tweet thread successfully posted from channel post!');
  } catch (error) {
    console.error('Error processing channel post:', error.message);
    console.error('Full error details:', error);
  }
});