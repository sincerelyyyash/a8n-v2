from telegram import Bot


async def send_telegram_message(bot_token, chat_id, message_text):
    bot = Bot(token=bot_token)
    await bot.send_message(chat_id=chat_id, text=message_text)
