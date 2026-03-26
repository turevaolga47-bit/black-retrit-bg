// ─── Бот записи на Чёрный Ретрит ───────────────────────────────────────────
// Запуск: node bot.js

const TOKEN   = "8372624919:AAFIxko_tmlcoXJfp13MkNgWgGrea6RPFcs";
const ADMIN   = 7851352670;   // Chat ID Ольги — сюда приходят заявки
const API     = `https://api.telegram.org/bot${TOKEN}`;

// Состояния диалога
const STEP = { IDLE: 0, NAME: 1, PHONE: 2, QUESTION: 3 };

// Хранилище сессий: { chatId: { step, name, phone } }
const sessions = {};

// ── Telegram API helpers ─────────────────────────────────────────────────────

async function request(method, body = {}) {
  const res = await fetch(`${API}/${method}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
  return res.json();
}

async function send(chatId, text, extra = {}) {
  return request("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", ...extra });
}

// ── Обработка сообщений ──────────────────────────────────────────────────────

async function handleMessage(msg) {
  const chatId   = msg.chat.id;
  const text     = (msg.text || "").trim();
  const firstName = msg.from?.first_name || "";

  if (!sessions[chatId]) sessions[chatId] = { step: STEP.IDLE };
  const s = sessions[chatId];

  // /start — начало анкеты
  if (text === "/start") {
    s.step = STEP.NAME;
    await send(chatId,
      `✨ Привет, ${firstName}!\n\n` +
      `Добро пожаловать в пространство <b>Чёрного Ретрита</b> 🌊\n` +
      `10 дней на берегу Чёрного моря в Болгарии для глубокого восстановления и женского счастья.\n\n` +
      `Давай оформим твою заявку. Это займёт 1 минуту.\n\n` +
      `<b>Как тебя зовут?</b> (имя и фамилия)`
    );
    return;
  }

  // Шаг 1 — имя
  if (s.step === STEP.NAME) {
    s.name = text;
    s.step = STEP.PHONE;
    await send(chatId,
      `Прекрасно, <b>${text}</b> 🌸\n\n` +
      `<b>Укажи свой номер телефона</b> (или WhatsApp):`
    );
    return;
  }

  // Шаг 2 — телефон
  if (s.step === STEP.PHONE) {
    s.phone = text;
    s.step  = STEP.QUESTION;
    await send(chatId,
      `Записала 📝\n\n` +
      `<b>Есть вопросы о ретрите?</b>\n` +
      `Напиши — или отправь <code>нет</code>, если всё ясно:`
    );
    return;
  }

  // Шаг 3 — вопрос
  if (s.step === STEP.QUESTION) {
    const question = text.toLowerCase() === "нет" ? "—" : text;
    s.step = STEP.IDLE;

    const date = new Date().toLocaleString("ru-RU", { timeZone: "Europe/Prague" });

    // Уведомление Ольге
    await send(ADMIN,
      `🌊 <b>Новая заявка на Чёрный Ретрит</b>\n\n` +
      `👤 Имя: <b>${s.name}</b>\n` +
      `📞 Телефон: <b>${s.phone}</b>\n` +
      `❓ Вопрос: ${question}\n` +
      `🕐 Дата: ${date}\n` +
      `💬 Telegram: @${msg.from?.username || "нет"} (${chatId})`
    );

    // Подтверждение пользователю
    await send(chatId,
      `🎉 <b>Заявка принята!</b>\n\n` +
      `Ольга свяжется с тобой в ближайшее время и расскажет все детали ретрита.\n\n` +
      `Если хочешь написать напрямую:\n` +
      `📲 Telegram: @OlgaTurreva\n` +
      `📞 WhatsApp: +420 737 350 155\n` +
      `🌐 turevaolga.space\n\n` +
      `До встречи на море! 🌊✨`
    );

    delete sessions[chatId];
    return;
  }

  // Если не в анкете — напоминаем
  await send(chatId,
    `Нажми /start чтобы оставить заявку на ретрит 🌊`
  );
}

// ── Long polling ─────────────────────────────────────────────────────────────

let offset = 0;

async function poll() {
  try {
    const data = await request("getUpdates", {
      offset,
      timeout: 30,
      allowed_updates: ["message"],
    });

    if (data.ok && data.result?.length) {
      for (const upd of data.result) {
        offset = upd.update_id + 1;
        if (upd.message) {
          handleMessage(upd.message).catch(console.error);
        }
      }
    }
  } catch (e) {
    console.error("Poll error:", e.message);
    await new Promise(r => setTimeout(r, 3000));
  }

  poll();
}

// ── Старт ────────────────────────────────────────────────────────────────────

console.log("🌊 Бот Чёрного Ретрита запущен...");
console.log(`   Заявки будут приходить на chat_id: ${ADMIN}`);
poll();
