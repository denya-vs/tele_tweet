const TelegramBot = require('node-telegram-bot-api');
const {TwitterApi} = require('twitter-api-v2');
const {Configuration, OpenAIApi} = require('openai');
require('dotenv').config();

// Конфигурация Telegram
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, {polling: true});

// Конфигурация Twitter
const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});

// Конфигурация OpenAI
const openai = new OpenAIApi(
    new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    })
);

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
    const postedTweet = await twitterClient.v2.tweet(tweet, lastTweetId ? {in_reply_to_status_id: lastTweetId} : {});
    lastTweetId = postedTweet.data.id;
  }
}

// Генерирует перевод и теги с помощью OpenAI
async function generateTranslationAndTags(text) {
  const prompt = `
Ты помогаешь писать твиты. Переведи следующий текст на английский язык, добавь к нему 2-3 популярных тега, релевантных теме поста:
Текст: "${text}"
Ответ верни в формате: "Переведенный текст #тег1 #тег2"
`;

  const response = await openai.createCompletion({
    model: 'text-davinci-003',
    prompt,
    max_tokens: 150,
    temperature: 0.7,
  });

  return response.data.choices[0].text.trim();
}

// Обработчик новых сообщений
bot.on('message', async (msg) => {
  if (msg.chat.id.toString() !== TELEGRAM_CHAT_ID) return;

  const messageText = msg.text || '';
  if (!messageText) return;

  try {
// Генерация перевода и тегов
    const translatedWithTags = await generateTranslationAndTags(messageText);
    const tweets = splitIntoTweets(translatedWithTags);

// Публикация в Twitter
    await postThread(tweets);

    console.log('Tweet thread successfully posted!');
  } catch (error) {
    console.error('Error processing message:', error.message);
  }
});