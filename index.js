const TelegramBot = require('node-telegram-bot-api');
const { TwitterApi } = require('twitter-api-v2');
const OpenAI = require('openai');
require('dotenv').config();

// Конфигурация Telegram
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

// Конфигурация Twitter
const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});

// Конфигурация OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Разбивает текст на части для твита
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

// Постит тред в Twitter
async function postThread(tweets) {
  let lastTweetId = null;
  for (const tweet of tweets) {
    const postedTweet = await twitterClient.v2.tweet(tweet, lastTweetId ? { in_reply_to_status_id: lastTweetId } : {});
    lastTweetId = postedTweet.data.id;
  }
}

// Генерирует перевод и теги с помощью OpenAI
async function generateTranslationAndTags(text) {
  const prompt = `
You are a helpful assistant that translates text for tweets. Translate the following text into English and add 2-3 popular hashtags relevant to the topic:
Text: "${text}"
Return the result in the format: "Translated text #hashtag1 #hashtag2"
`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 200,
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error with OpenAI API:', error.message);
    throw error;
  }
}

// Обработчик новых сообщений
bot.on('channel_post', async (msg) => {
  console.log('Received a new channel post:', msg);

  // Проверяем, совпадает ли ID канала с TELEGRAM_CHAT_ID
  if (msg.chat.id.toString() !== TELEGRAM_CHAT_ID) {
    console.log('Channel post ignored: Chat ID does not match configured TELEGRAM_CHAT_ID:', msg.chat.id.toString());
    return;
  }

  const messageText = msg.text || '';
  if (!messageText) {
    console.log('Channel post ignored: No text in the channel post');
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
    await postThread(tweets);

    console.log('Tweet thread successfully posted from channel post!');
  } catch (error) {
    console.error('Error processing channel post:', error.message);
    console.error('Full error details:', error);
  }
});