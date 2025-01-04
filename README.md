# Telegram-to-Twitter Bot

This project is a Node.js application that connects a Telegram channel to a Twitter account. It monitors a Telegram channel for new posts (text or photos), processes the content, and automatically posts translated and formatted tweets (with hashtags) to Twitter.

## Features

- **Telegram Integration**: Listens to posts in a specific Telegram channel.
- **Twitter Integration**: Posts tweets (plain text or with images) to a connected Twitter account.
- **Translation & Tagging**: Uses OpenAI's GPT models to process and enhance the Telegram content by:
    - Translating it into natural English.
    - Adding meaningful hashtags.
- **Tweet Splitting**: Automatically splits long posts into threads when exceeding Twitter's character limit.

## Requirements

- Node.js (version 16.x or later)
- Environment variables for configuration
- API keys for Telegram, Twitter, and OpenAI

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd <repository-name>
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the project root and configure it with the required API keys:
   ```env
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token
   TELEGRAM_CHAT_ID=your_channel_chat_id
   TWITTER_API_KEY=your_twitter_api_key
   TWITTER_API_SECRET=your_twitter_api_secret
   TWITTER_ACCESS_TOKEN=your_twitter_access_token
   TWITTER_ACCESS_SECRET=your_twitter_access_secret
   OPENAI_API_KEY=your_openai_api_key
   ```

4. Start the bot:
   ```bash
   node index.js
   ```

## Environment Variables

The following environment variables must be configured in a `.env` file:

| Variable               | Description                                                                 |
|------------------------|-----------------------------------------------------------------------------|
| `TELEGRAM_BOT_TOKEN`   | The token for your Telegram bot (from the BotFather).                      |
| `TELEGRAM_CHAT_ID`     | The ID of your Telegram channel (where the bot listens to posts).          |
| `TWITTER_API_KEY`      | Your Twitter API Key.                                                      |
| `TWITTER_API_SECRET`   | Your Twitter API Secret.                                                   |
| `TWITTER_ACCESS_TOKEN` | The access token for the Twitter account.                                  |
| `TWITTER_ACCESS_SECRET`| The access secret for the Twitter account.                                 |
| `OPENAI_API_KEY`       | The API key for OpenAI GPT models (used for translation and tagging).       |

## How It Works

1. **Telegram Interaction**:
    - The bot uses the `node-telegram-bot-api` library to listen for posts in the specified Telegram channel.
    - For posts containing images, the bot downloads the image and prepares it for Twitter.

2. **Translation and Hashtag Generation**:
    - Text content (or captions for images) is sent to OpenAI's GPT model to:
        - Translate it into polished English.
        - Add 2-3 relevant hashtags at the end of the text.

3. **Tweet Thread Posting**:
    - Text longer than 280 characters is split into multiple tweets using the `splitIntoTweets` function, ensuring clean breaks between words.
    - The bot uses the Twitter API to post the tweets as a thread.

4. **Image Upload**:
    - Images from Telegram are uploaded to Twitter and included in the first tweet of the thread (if applicable).

5. **Error Handling**:
    - Logs all errors and skips processing if:
        - The Telegram channel ID does not match the configured ID.
        - There is no content in the message.
        - Issues occur with the OpenAI or Twitter APIs.

## Key Functions

- **`downloadPhotoFromTelegram(photoArray)`**:
  Downloads the highest-quality photo from Telegram.

- **`uploadMediaToTwitter(photoUrl)`**:
  Uploads the downloaded photo to Twitter and returns the media ID.

- **`splitIntoTweets(text, maxLength = 280)`**:
  Splits a long text into multiple chunks suitable for Twitter threads.

- **`generateTranslationAndTags(text)`**:
  Interacts with the OpenAI GPT model to translate text and add hashtags.

- **`postThread(tweets, mediaId = null)`**:
  Posts a series of tweets as a thread on Twitter, optionally attaching a media ID to the first tweet.

## Running the Script Continuously on a Server

To ensure the script runs continuously on a server, follow these steps:

### Using `pm2`

1. Install `pm2` globally:
   ```bash
   npm install -g pm2
   ```

2. Start the script with `pm2`:
   ```bash
   pm2 start index.js --name telegram-to-twitter-bot
   ```

3. Save the `pm2` process list (to restart on system reboot):
   ```bash
   pm2 save
   ```

4. Configure `pm2` to start on server reboot:
   ```bash
   pm2 startup
   ```

### Using `systemd` (Linux)

1. Create a `systemd` service file:
   ```bash
   sudo nano /etc/systemd/system/telegram-to-twitter-bot.service
   ```

2. Add the following configuration:
   ```ini
   [Unit]
   Description=Telegram-to-Twitter Bot
   After=network.target

   [Service]
   ExecStart=/usr/bin/node /path/to/your/project/index.js
   WorkingDirectory=/path/to/your/project
   Restart=always
   User=your-username
   Environment=TELEGRAM_BOT_TOKEN=your_telegram_bot_token
   Environment=TELEGRAM_CHAT_ID=your_channel_chat_id
   Environment=TWITTER_API_KEY=your_twitter_api_key
   Environment=TWITTER_API_SECRET=your_twitter_api_secret
   Environment=TWITTER_ACCESS_TOKEN=your_twitter_access_token
   Environment=TWITTER_ACCESS_SECRET=your_twitter_access_secret
   Environment=OPENAI_API_KEY=your_openai_api_key

   [Install]
   WantedBy=multi-user.target
   ```

3. Start and enable the service:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl start telegram-to-twitter-bot
   sudo systemctl enable telegram-to-twitter-bot
   ```

4. Check the service status:
   ```bash
   sudo systemctl status telegram-to-twitter-bot
   ```

### Using Docker (Optional)

1. Create a `Dockerfile` in your project:
   ```dockerfile
   FROM node:16
   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   COPY . .
   CMD ["node", "index.js"]
   ```

2. Build the Docker image:
   ```bash
   docker build -t telegram-to-twitter-bot .
   ```

3. Run the bot in a Docker container:
   ```bash
   docker run -d --name telegram-to-twitter-bot --env-file .env telegram-to-twitter-bot
   ```

## Libraries Used

- **[node-telegram-bot-api](https://github.com/yagop/node-telegram-bot-api)**: To interact with Telegram.
- **[twitter-api-v2](https://github.com/PLhery/node-twitter-api-v2)**: To interact with the Twitter API.
- **[openai](https://github.com/openai/openai-node)**: To interact with OpenAI's GPT models.
- **`dotenv`**: To manage environment variables.
- **`node-fetch`**: For fetching external resources (e.g., image downloads).
